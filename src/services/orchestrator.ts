import type { AddressService, ValidationResult } from './base/address-service'
import { GoogleMapsService } from './google-maps/google-maps-service'
import { GeocodioService } from './geocodio/geocodio-service'
import { env, type GeoServiceName } from '../config/env'
import type { StandardizedAddress, AddressValidationStatus } from '../schemas/address'

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

interface ServiceConfig {
  timeout: number
  apiKey: string
}

export class AddressServiceOrchestrator {
  private services: Map<GeoServiceName, AddressService> = new Map()
  private requestCache: Map<string, Promise<OrchestratedResult>> = new Map()

  constructor(
    serviceNames: GeoServiceName[],
    serviceConfigs: Record<GeoServiceName, ServiceConfig>,
  ) {
    for (const serviceName of serviceNames) {
      const config = serviceConfigs[serviceName]
      if (!config) {
        throw new Error(`Configuration missing for service: ${serviceName}`)
      }

      const service = this.createService(serviceName, config)
      this.services.set(serviceName, service)
    }
  }

  private createService(name: GeoServiceName, config: ServiceConfig): AddressService {
    switch (name) {
      case 'google-maps':
        return new GoogleMapsService(config)
      case 'geocodio':
        return new GeocodioService(config)
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
    if (env.DEBUG) {
      console.log('\n[DEBUG] Starting address validation for:', address)
      console.log('[DEBUG] Configured services:', Array.from(this.services.keys()))
    }

    // Call all services in parallel
    const servicePromises = Array.from(this.services.entries()).map(
      async ([serviceName, service]): Promise<ServiceResult> => {
        try {
          if (env.DEBUG) {
            console.log(`[DEBUG] Calling ${serviceName} service...`)
          }

          const result = await service.validate(address)

          if (env.DEBUG) {
            console.log(`[DEBUG] ${serviceName} response:`, JSON.stringify({
              status: result.status,
              address: result.address,
              hasRawResponse: !!result.rawResponse,
            }, null, 2))
            if (result.rawResponse) {
              console.log(`[DEBUG] ${serviceName} raw response:`, JSON.stringify(result.rawResponse, null, 2))
            }
          }

          return { service: serviceName, result }
        } catch (error) {
          if (env.DEBUG) {
            console.log(`[DEBUG] ${serviceName} failed with error:`, error)
          }
          // If a service fails, return unverifiable for that service
          return {
            service: serviceName,
            result: { address: null, status: 'unverifiable' },
          }
        }
      },
    )

    const serviceResults = await Promise.all(servicePromises)

    // Filter out services that couldn't verify the address
    const validResults = serviceResults.filter(
      (sr) => sr.result.address !== null && sr.result.status !== 'unverifiable',
    )

    if (env.DEBUG) {
      console.log(`[DEBUG] Valid results count: ${validResults.length} out of ${serviceResults.length}`)
    }

    if (validResults.length === 0) {
      if (env.DEBUG) {
        console.log('[DEBUG] No service could verify the address')
      }
      // No service could verify the address
      return {
        address: null,
        status: 'unverifiable',
      }
    }

    // Score and sort results by accuracy
    const scoredResults = validResults.map((sr) => ({
      ...sr,
      score: this.calculateAccuracyScore(sr),
    }))

    if (env.DEBUG) {
      console.log('[DEBUG] Scored results:')
      scoredResults.forEach((sr) => {
        console.log(`  - ${sr.service}: score=${sr.score}, status=${sr.result.status}`)
      })
    }

    scoredResults.sort((a, b) => b.score - a.score)

    // Best result (highest score)
    const bestResult = scoredResults[0]

    if (env.DEBUG) {
      console.log(`[DEBUG] Best result selected: ${bestResult.service} (score: ${bestResult.score})`)
    }

    // Build list of unique addresses
    const uniqueAddresses = this.deduplicateAddresses(scoredResults)

    if (env.DEBUG) {
      console.log(`[DEBUG] Unique addresses after deduplication: ${uniqueAddresses.length}`)
    }

    // Only include alt if there are multiple unique addresses
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

    if (env.DEBUG) {
      console.log('[DEBUG] Final orchestrated result:', JSON.stringify(finalResult, null, 2))
      console.log('[DEBUG] Validation complete\n')
    }

    return finalResult
  }

  private calculateAccuracyScore(serviceResult: ServiceResult): number {
    let score = 0

    // Base score from status (valid > corrected > unverifiable)
    switch (serviceResult.result.status) {
      case 'valid':
        score += 100
        break
      case 'corrected':
        score += 50
        break
      case 'unverifiable':
        score += 0
        break
    }

    // Bonus points for having complete address information
    const address = serviceResult.result.address
    if (address) {
      if (address.number) score += 20
      if (address.street) score += 15
      if (address.city) score += 10
      if (address.state) score += 10
      if (address.zip) score += 10
      if (address.coordinates) score += 5
    }

    // Service-specific bonuses (based on known accuracy from discovery doc)
    switch (serviceResult.service) {
      case 'google-maps':
        score += 10 // Google Maps is known for high accuracy
        break
      case 'geocodio':
        score += 5
        break
    }

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
    // Normalize for comparison (lowercase, trim, remove extra spaces)
    const normalize = (str: string | null | undefined): string =>
      (str || '').toLowerCase().trim().replace(/\s+/g, ' ')

    return [
      normalize(address.number),
      normalize(address.street),
      normalize(address.city),
      normalize(address.state),
      normalize(address.zip),
    ].join('|')
  }
}
