import { LRUCache } from 'lru-cache'
import type { ValidateAddressResponse } from '../schemas/address'

export interface AddressCacheOptions {
  maxSize: number
  ttlMs: number
}

type PendingRequest = Promise<ValidateAddressResponse>

export class AddressCache {
  private readonly cache: LRUCache<string, ValidateAddressResponse>
  private readonly pendingRequests: Map<string, PendingRequest>

  constructor(options: AddressCacheOptions) {
    this.cache = new LRUCache<string, ValidateAddressResponse>({
      max: options.maxSize,
      ttl: options.ttlMs,
    })
    this.pendingRequests = new Map()
  }

  private normalizeKey(address: string): string {
    return address.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  get(address: string): ValidateAddressResponse | undefined {
    const key = this.normalizeKey(address)
    return this.cache.get(key)
  }

  set(address: string, response: ValidateAddressResponse): void {
    const key = this.normalizeKey(address)
    if (response.status !== 'unverifiable') {
      this.cache.set(key, response)
    }
  }

  async getOrFetch(
    address: string,
    fetcher: () => Promise<ValidateAddressResponse>,
  ): Promise<ValidateAddressResponse> {
    const key = this.normalizeKey(address)

    const cached = this.cache.get(key)
    if (cached) {
      return cached
    }

    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }

    const requestPromise = fetcher()
      .then((result) => {
        if (result.status !== 'unverifiable') {
          this.cache.set(key, result)
        }
        return result
      })
      .finally(() => {
        this.pendingRequests.delete(key)
      })

    this.pendingRequests.set(key, requestPromise)
    return requestPromise
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  get size(): number {
    return this.cache.size
  }

  get pendingCount(): number {
    return this.pendingRequests.size
  }
}
