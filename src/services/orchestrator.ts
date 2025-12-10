import type { FastifyBaseLogger } from 'fastify'
import type { AddressService, ValidationResult } from './base/address-service'
import { GoogleMapsService } from './google-maps/google-maps-service'
import { GoogleValidationService } from './google-validation/google-validation-service'
import { GeocodioService } from './geocodio/geocodio-service'
import { AzureMapsService } from './azure/azure-maps-service'
import { env, type GeoServiceName } from '@/config/env'
import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'
import { getCacheKey } from '@/utils'

interface ServiceResult {
  service: GeoServiceName
  result: ValidationResult
}

interface AddressWithService extends StandardizedAddress {
  service: GeoServiceName
}

export interface OrchestratedResult {
  address: StandardizedAddress | null
  status: AddressValidationStatus
  alt?: AddressWithService[]
}

export interface OrchestratorOptions {
  serviceNames: GeoServiceName[]
  logger: FastifyBaseLogger
}

export class AddressServiceOrchestrator {
  private static readonly SCORE_WEIGHTS = {
    STATUS: {
      valid: 100,
      corrected: 50,
      unverifiable: 0,
    },
    COMPONENTS: {
      number: 20,
      street: 15,
      city: 10,
      state: 10,
      zip: 10,
      coordinates: 5,
    },
    SERVICES: {
      'google-validation': 12, // Google Address Validation API with USPS integration
      'google-maps': 10, // Google Maps is known for high accuracy
      azure: 7, // Azure Maps with TomTom data, between Google and Geocodio
      geocodio: 5,
    },
  } as const

  private services: Map<GeoServiceName, AddressService> = new Map()
  private requestCache: Map<string, Promise<OrchestratedResult>> = new Map()
  private logger: FastifyBaseLogger

  constructor(options: OrchestratorOptions) {
    this.logger = options.logger

    for (const serviceName of options.serviceNames) {
      const service = this.createService(serviceName)
      this.services.set(serviceName, service)
    }
  }

  private createService(name: GeoServiceName): AddressService {
    const timeout = env.ADDRESS_SERVICE_TIMEOUT

    switch (name) {
      case 'google-maps':
        if (!env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY is required for google-maps service')
        }
        return new GoogleMapsService({
          timeout,
          apiKey: env.GOOGLE_MAPS_API_KEY,
        })
      case 'google-validation':
        if (!env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY is required for google-validation service')
        }
        return new GoogleValidationService({
          timeout,
          apiKey: env.GOOGLE_MAPS_API_KEY,
        })
      case 'geocodio':
        if (!env.GEOCODIO_API_KEY) {
          throw new Error('GEOCODIO_API_KEY is required for geocodio service')
        }
        return new GeocodioService({
          timeout,
          apiKey: env.GEOCODIO_API_KEY,
        })
      case 'azure':
        if (!env.AZURE_MAPS_API_KEY) {
          throw new Error('AZURE_MAPS_API_KEY is required for azure service')
        }
        return new AzureMapsService({
          timeout,
          apiKey: env.AZURE_MAPS_API_KEY,
        })
      default:
        throw new Error(`Unknown service: ${name}`)
    }
  }

  async validate(address: string): Promise<OrchestratedResult> {
    // Coalesce duplicate requests - if the same address is being validated, reuse the promise
    const cached = this.requestCache.get(address)
    if (cached) {
      return cached
    }

    const promise = this.performValidation(address)
    this.requestCache.set(address, promise)

    try {
      return await promise
    } finally {
      // Clean up cache after request completes to prevent memory leak
      this.requestCache.delete(address)
    }
  }

  private async performValidation(address: string): Promise<OrchestratedResult> {
    this.logger.debug(
      { address, services: Array.from(this.services.keys()) },
      'Starting address validation',
    )

    const servicePromises = Array.from(this.services.entries()).map(
      async ([serviceName, service]): Promise<ServiceResult> => {
        try {
          this.logger.debug({ service: serviceName }, 'Calling service')

          const result = await service.validate(address)

          this.logger.debug(
            {
              service: serviceName,
              status: result.status,
              address: result.address,
              hasRawResponse: !!result.rawResponse,
            },
            'Service response',
          )

          if (result.rawResponse) {
            this.logger.debug(
              { service: serviceName, rawResponse: result.rawResponse },
              'Service raw response',
            )
          }

          return { service: serviceName, result }
        } catch (error) {
          this.logger.debug({ service: serviceName, error }, 'Service failed')
          return {
            service: serviceName,
            result: { address: null, status: 'unverifiable' },
          }
        }
      },
    )

    const serviceResults = await Promise.all(servicePromises)

    const validResults = serviceResults.filter(
      (sr) => sr.result.address !== null && sr.result.status !== 'unverifiable',
    )

    this.logger.debug(
      {
        validCount: validResults.length,
        totalCount: serviceResults.length,
      },
      'Filtered valid results',
    )

    if (validResults.length === 0) {
      this.logger.debug('No service could verify the address')
      return {
        address: null,
        status: 'unverifiable',
      }
    }

    const scoredResults = validResults.map((sr) => ({
      ...sr,
      score: this.calculateAccuracyScore(sr),
    }))

    this.logger.debug(
      {
        scores: scoredResults.map((sr) => ({
          service: sr.service,
          score: sr.score,
          status: sr.result.status,
        })),
      },
      'Scored results',
    )

    scoredResults.sort((a, b) => b.score - a.score)

    const bestResult = scoredResults[0]

    this.logger.debug(
      {
        service: bestResult.service,
        score: bestResult.score,
      },
      'Best result selected',
    )

    const uniqueAddresses = this.deduplicateAddresses(scoredResults)

    this.logger.debug(
      {
        uniqueCount: uniqueAddresses.length,
      },
      'Addresses after deduplication',
    )

    const alt =
      uniqueAddresses.length > 1
        ? uniqueAddresses.map((ua) => ({
            ...ua.result.address!,
            service: ua.service,
          }))
        : undefined

    const finalResult = {
      address: bestResult.result.address,
      status: bestResult.result.status,
      alt,
    }

    this.logger.debug({ result: finalResult }, 'Validation complete')

    return finalResult
  }

  private calculateAccuracyScore(serviceResult: ServiceResult): number {
    let score = 0

    score += AddressServiceOrchestrator.SCORE_WEIGHTS.STATUS[serviceResult.result.status]

    const address = serviceResult.result.address
    if (address) {
      if (address.number) score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.number
      if (address.street) score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.street
      if (address.city) score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.city
      if (address.state) score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.state
      if (address.zip) score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.zip
      if (address.coordinates)
        score += AddressServiceOrchestrator.SCORE_WEIGHTS.COMPONENTS.coordinates
    }

    score += AddressServiceOrchestrator.SCORE_WEIGHTS.SERVICES[serviceResult.service]

    return score
  }

  private deduplicateAddresses(
    scoredResults: Array<ServiceResult & { score: number }>,
  ): Array<ServiceResult & { score: number }> {
    const uniqueResults: Array<ServiceResult & { score: number }> = []
    const seenAddresses = new Set<string>()

    for (const result of scoredResults) {
      const address = result.result.address
      if (!address) continue

      // Create a normalized key for deduplication
      const key = this.normalizeAddressKey(address)

      if (!seenAddresses.has(key)) {
        seenAddresses.add(key)
        uniqueResults.push(result)
      }
    }

    return uniqueResults
  }

  private normalizeAddressKey(address: StandardizedAddress): string {
    return [
      getCacheKey(address.number),
      getCacheKey(address.street),
      getCacheKey(address.city),
      getCacheKey(address.state),
      getCacheKey(address.zip),
    ].join('|')
  }
}
