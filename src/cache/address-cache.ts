import { LRUCache } from 'lru-cache'
import type { FastifyBaseLogger } from 'fastify'
import type { ValidateAddressResponse } from '@/schemas/address'
import { getCacheKey } from '@/utils'

export interface AddressCacheOptions {
  maxSize: number
  ttlMs: number
  logger: FastifyBaseLogger
}

type PendingRequest = Promise<ValidateAddressResponse>

export class AddressCache {
  private readonly cache: LRUCache<string, ValidateAddressResponse>
  private readonly pendingRequests: Map<string, PendingRequest>
  private readonly logger: FastifyBaseLogger

  constructor(options: AddressCacheOptions) {
    this.cache = new LRUCache<string, ValidateAddressResponse>({
      max: options.maxSize,
      ttl: options.ttlMs,
    })
    this.pendingRequests = new Map()
    this.logger = options.logger
  }

  get(address: string): ValidateAddressResponse | undefined {
    const key = getCacheKey(address)
    const result = this.cache.get(key)
    if (result) {
      this.logger.debug({ address, key }, 'Cache hit')
    }
    return result
  }

  set(address: string, response: ValidateAddressResponse): void {
    const key = getCacheKey(address)
    if (response.status !== 'unverifiable') {
      this.cache.set(key, response)
    }
  }

  async getOrFetch(
    address: string,
    fetcher: () => Promise<ValidateAddressResponse>,
  ): Promise<ValidateAddressResponse> {
    const key = getCacheKey(address)

    const cached = this.cache.get(key)
    if (cached) {
      this.logger.debug({ address, key }, 'Cache hit')
      return cached
    }

    const pending = this.pendingRequests.get(key)
    if (pending) {
      this.logger.debug({ address, key }, 'Request coalescing - returning pending promise')
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
