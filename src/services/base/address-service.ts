import type { StandardizedAddress, AddressValidationStatus } from '@/schemas/address'

export interface AddressServiceConfig {
  timeout: number
  apiKey: string
}

export interface ValidationResult {
  address: StandardizedAddress | null
  status: AddressValidationStatus
  rawResponse?: unknown
}

export abstract class AddressService {
  protected readonly timeout: number
  protected readonly apiKey: string

  constructor(config: AddressServiceConfig) {
    this.timeout = config.timeout
    this.apiKey = config.apiKey
  }

  abstract validate(freeFormAddress: string): Promise<ValidationResult>

  protected async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  protected abstract parseResponse(rawResponse: unknown): ValidationResult

  protected abstract buildRequestUrl(address: string): string
}
