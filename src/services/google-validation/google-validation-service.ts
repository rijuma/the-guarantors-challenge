import { AddressService, type ValidationResult } from '../base/address-service'
import {
  addressValidationResponseSchema,
  type ValidationResult as GoogleValidationResult,
} from './schemas'
import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'

export class GoogleValidationService extends AddressService {
  private readonly baseUrl =
    'https://addressvalidation.googleapis.com/v1:validateAddress'

  protected buildRequestUrl(): string {
    return `${this.baseUrl}?key=${this.apiKey}`
  }

  async validate(freeFormAddress: string): Promise<ValidationResult> {
    const url = this.buildRequestUrl()
    const requestBody = {
      address: {
        regionCode: 'US',
        addressLines: [freeFormAddress],
      },
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

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
    const parsed = addressValidationResponseSchema.safeParse(rawResponse)

    if (!parsed.success || !parsed.data.result) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const result = parsed.data.result
    const address = this.extractAddressComponents(result)

    if (!address) {
      return { address: null, status: 'unverifiable', rawResponse }
    }

    const validationStatus = this.determineStatus(result)

    return { address, status: validationStatus, rawResponse }
  }

  private determineStatus(result: GoogleValidationResult): AddressValidationStatus {
    const verdict = result.verdict

    if (!verdict) {
      return 'unverifiable'
    }

    // Address is valid if it's complete, has no unconfirmed components,
    // and nothing was inferred or replaced
    if (
      verdict.addressComplete &&
      !verdict.hasUnconfirmedComponents &&
      !verdict.hasInferredComponents &&
      !verdict.hasReplacedComponents
    ) {
      return 'valid'
    }

    // If we have confirmation but some components were corrected or inferred
    if (verdict.addressComplete || verdict.validationGranularity) {
      return 'corrected'
    }

    return 'unverifiable'
  }

  private extractAddressComponents(
    result: GoogleValidationResult,
  ): StandardizedAddress | null {
    // Prefer USPS data when available (most accurate for US addresses)
    if (result.uspsData?.standardizedAddress) {
      const usps = result.uspsData.standardizedAddress
      const geocode = result.geocode

      // Extract street and number from USPS data
      const addressLine = usps.firstAddressLine || ''
      const parts = this.parseAddressLine(addressLine)

      if (!usps.city || !usps.state || !usps.zipCode) {
        return null
      }

      return {
        street: parts.street,
        number: parts.number,
        city: usps.city,
        state: usps.state,
        zip: usps.zipCodeExtension
          ? `${usps.zipCode}-${usps.zipCodeExtension}`
          : usps.zipCode,
        coordinates:
          geocode?.location?.latitude && geocode?.location?.longitude
            ? [geocode.location.latitude, geocode.location.longitude]
            : undefined,
      }
    }

    // Fallback to postal address from result
    const postalAddress = result.address?.postalAddress
    const geocode = result.geocode

    if (!postalAddress) {
      return null
    }

    const addressLine = postalAddress.addressLines?.[0] || ''
    const parts = this.parseAddressLine(addressLine)

    if (
      !postalAddress.locality ||
      !postalAddress.administrativeArea ||
      !postalAddress.postalCode
    ) {
      return null
    }

    return {
      street: parts.street,
      number: parts.number,
      city: postalAddress.locality,
      state: postalAddress.administrativeArea,
      zip: postalAddress.postalCode,
      coordinates:
        geocode?.location?.latitude && geocode?.location?.longitude
          ? [geocode.location.latitude, geocode.location.longitude]
          : undefined,
    }
  }

  private parseAddressLine(addressLine: string): { number: string | null; street: string } {
    // Simple regex to extract street number from address line
    // Handles patterns like "123 Main St", "123A Main St", etc.
    const match = addressLine.match(/^(\d+[A-Za-z]?)\s+(.+)$/)

    if (match) {
      return {
        number: match[1],
        street: match[2],
      }
    }

    // If no number found, return the whole line as street
    return {
      number: null,
      street: addressLine,
    }
  }
}
