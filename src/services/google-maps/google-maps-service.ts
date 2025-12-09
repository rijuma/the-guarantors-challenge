import { AddressService, type ValidationResult } from '../base/address-service'
import {
  geocodeResponseSchema,
  type GeocodeResult,
  type AddressComponent,
} from './schemas'
import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'

export class GoogleMapsService extends AddressService {
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json'

  protected buildRequestUrl(address: string): string {
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
      components: 'country:US',
    })
    return `${this.baseUrl}?${params.toString()}`
  }

  async validate(freeFormAddress: string): Promise<ValidationResult> {
    const url = this.buildRequestUrl(freeFormAddress)

    try {
      const response = await this.fetchWithTimeout(url)
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
    const parsed = geocodeResponseSchema.safeParse(rawResponse)

    if (!parsed.success) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const { results, status } = parsed.data


    if (status !== 'OK' || results.length === 0) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const bestResult = results[0]
    const address = this.extractAddressComponents(bestResult)

    if (!address) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const validationStatus: AddressValidationStatus = bestResult.partial_match
      ? 'corrected'
      : 'valid'

    return { address, status: validationStatus, rawResponse }
  }

  private extractAddressComponents(result: GeocodeResult): StandardizedAddress | null {
    const components = result.address_components

    const findComponent = (type: string): AddressComponent | undefined =>
      components.find((c) => c.types.includes(type))

    const streetNumber = findComponent('street_number')
    const route = findComponent('route')
    const locality = findComponent('locality')
    const state = findComponent('administrative_area_level_1')
    const postalCode = findComponent('postal_code')

    if (!locality || !state || !postalCode) {
      return null
    }

    const street = route ? route.long_name : ''
    const number = streetNumber ? streetNumber.long_name : null

    const { lat, lng } = result.geometry.location

    return {
      street,
      number,
      city: locality.long_name,
      state: state.short_name,
      zip: postalCode.long_name,
      coordinates: [lat, lng],
    }
  }
}
