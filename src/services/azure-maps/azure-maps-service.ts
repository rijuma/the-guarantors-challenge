import { AddressService, type ValidationResult } from '../base/address-service'
import { azureMapsResponseSchema, type AzureMapsResult } from './schemas'
import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'

export class AzureMapsService extends AddressService {
  private static readonly MIN_SCORE_FOR_VALID = 8.0
  private static readonly MIN_SCORE_THRESHOLD = 5.0
  private readonly baseUrl = 'https://atlas.microsoft.com/search/address/json'

  protected buildRequestUrl(address: string): string {
    const params = new URLSearchParams({
      'api-version': '1.0',
      'subscription-key': this.apiKey,
      query: address,
      countrySet: 'US',
      limit: '1',
    })
    return `${this.baseUrl}?${params.toString()}`
  }

  async validate(freeFormAddress: string): Promise<ValidationResult> {
    const url = this.buildRequestUrl(freeFormAddress)

    try {
      const response = await this.fetchWithTimeout(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

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
    const parsed = azureMapsResponseSchema.safeParse(rawResponse)

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

    const validationStatus: AddressValidationStatus = this.determineStatus(
      bestResult,
      parsed.data.summary.fuzzyLevel,
    )

    return { address, status: validationStatus, rawResponse }
  }

  private determineStatus(
    result: AzureMapsResult,
    fuzzyLevel?: number,
  ): AddressValidationStatus {
    const isExactMatch = result.matchType === 'AddressPoint'
    const hasHighScore = result.score >= AzureMapsService.MIN_SCORE_FOR_VALID
    const noFuzzyMatching = !fuzzyLevel || fuzzyLevel === 1

    if (isExactMatch && hasHighScore && noFuzzyMatching) {
      return 'valid'
    }

    return 'corrected'
  }

  private extractAddressComponents(result: AzureMapsResult): StandardizedAddress | null {
    const { address, position } = result

    if (!address.municipality || !address.countrySubdivisionCode || !address.postalCode) {
      return null
    }

    const street = address.streetName || ''
    const number = address.streetNumber || null

    return {
      street,
      number,
      city: address.municipality,
      state: address.countrySubdivisionCode,
      zip: address.postalCode,
      coordinates: [position.lat, position.lon],
    }
  }
}
