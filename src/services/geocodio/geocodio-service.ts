import { AddressService, type ValidationResult } from '../base/address-service'
import { geocodioResponseSchema, type GeocodioResult } from './schemas'
import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'

export class GeocodioService extends AddressService {
  private static readonly MIN_ACCURACY_FOR_VALID = 0.8
  private readonly baseUrl = 'https://api.geocod.io/v1.9/geocode'

  protected buildRequestUrl(address: string): string {
    const params = new URLSearchParams({
      q: address,
      api_key: this.apiKey,
      country: 'US',
    })
    return `${this.baseUrl}?${params.toString()}`
  }

  async validate(freeFormAddress: string): Promise<ValidationResult> {
    const url = this.buildRequestUrl(freeFormAddress)

    try {
      const response = await this.fetchWithTimeout(url)

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const rawData = await response.json()
      return this.parseResponse(rawData)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Address service timeout')
      }
      throw error
    }
  }

  protected parseResponse(rawResponse: unknown): ValidationResult {
    const parsed = geocodioResponseSchema.safeParse(rawResponse)

    if (!parsed.success) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const { results } = parsed.data

    if (results.length === 0) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const bestResult = results[0]
    const address = this.extractAddressComponents(bestResult)

    if (!address) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const validationStatus: AddressValidationStatus = this.determineStatus(bestResult)

    return { address, status: validationStatus, rawResponse }
  }

  private determineStatus(result: GeocodioResult): AddressValidationStatus {
    // Geocodio accuracy is a score from 0 to 1
    // accuracy_type can be: rooftop, range_interpolation, nearest_rooftop_match, street_center, place, state, etc.
    // High accuracy (>= 0.8) with rooftop or range_interpolation is considered valid
    // Lower accuracy or less specific types suggest correction/inference was needed

    const highAccuracyTypes = ['rooftop', 'range_interpolation', 'point']
    const isHighAccuracy = result.accuracy >= GeocodioService.MIN_ACCURACY_FOR_VALID
    const isPreciseType = highAccuracyTypes.includes(result.accuracy_type)

    if (isHighAccuracy && isPreciseType) {
      return 'valid'
    }

    return 'corrected'
  }

  private extractAddressComponents(result: GeocodioResult): StandardizedAddress | null {
    const components = result.address_components

    if (!components.city || !components.state || !components.zip) {
      return null
    }

    const street = components.formatted_street || components.street || ''
    const number = components.number || null

    const { lat, lng } = result.location

    return {
      street,
      number,
      city: components.city,
      state: components.state,
      zip: components.zip,
      coordinates: [lat, lng],
    }
  }
}
