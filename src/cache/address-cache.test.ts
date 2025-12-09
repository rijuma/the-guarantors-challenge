import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AddressCache } from './address-cache.js'
import type { ValidateAddressResponse } from '../schemas/address.js'

describe('AddressCache', () => {
  let cache: AddressCache

  beforeEach(() => {
    cache = new AddressCache({
      maxSize: 100,
      ttlMs: 60000,
    })
  })

  const mockResponse: ValidateAddressResponse = {
    address: {
      street: 'Main St',
      number: '123',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    status: 'valid',
  }

  describe('get and set', () => {
    it('stores and retrieves a response', () => {
      cache.set('123 Main St', mockResponse)
      const result = cache.get('123 Main St')
      expect(result).toEqual(mockResponse)
    })

    it('returns undefined for non-existent key', () => {
      const result = cache.get('unknown address')
      expect(result).toBeUndefined()
    })

    it('does not cache unverifiable responses', () => {
      const unverifiable: ValidateAddressResponse = {
        address: null,
        status: 'unverifiable',
      }
      cache.set('invalid', unverifiable)
      expect(cache.get('invalid')).toBeUndefined()
    })
  })

  describe('key normalization', () => {
    it('normalizes keys to lowercase', () => {
      cache.set('123 MAIN ST', mockResponse)
      expect(cache.get('123 main st')).toEqual(mockResponse)
    })

    it('trims whitespace', () => {
      cache.set('  123 Main St  ', mockResponse)
      expect(cache.get('123 Main St')).toEqual(mockResponse)
    })

    it('collapses multiple spaces', () => {
      cache.set('123   Main   St', mockResponse)
      expect(cache.get('123 Main St')).toEqual(mockResponse)
    })
  })

  describe('getOrFetch', () => {
    it('returns cached value without calling fetcher', async () => {
      cache.set('123 Main St', mockResponse)
      const fetcher = vi.fn()

      const result = await cache.getOrFetch('123 Main St', fetcher)

      expect(result).toEqual(mockResponse)
      expect(fetcher).not.toHaveBeenCalled()
    })

    it('calls fetcher and caches result on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue(mockResponse)

      const result = await cache.getOrFetch('123 Main St', fetcher)

      expect(result).toEqual(mockResponse)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(cache.get('123 Main St')).toEqual(mockResponse)
    })

    it('does not cache unverifiable results', async () => {
      const unverifiable: ValidateAddressResponse = {
        address: null,
        status: 'unverifiable',
      }
      const fetcher = vi.fn().mockResolvedValue(unverifiable)

      const result = await cache.getOrFetch('invalid', fetcher)

      expect(result).toEqual(unverifiable)
      expect(cache.get('invalid')).toBeUndefined()
    })

    it('coalesces concurrent requests for the same address', async () => {
      let resolvePromise: (value: ValidateAddressResponse) => void
      const slowFetcher = vi.fn().mockReturnValue(
        new Promise<ValidateAddressResponse>((resolve) => {
          resolvePromise = resolve
        }),
      )

      const promise1 = cache.getOrFetch('123 Main St', slowFetcher)
      const promise2 = cache.getOrFetch('123 Main St', slowFetcher)
      const promise3 = cache.getOrFetch('123 MAIN ST', slowFetcher)

      expect(slowFetcher).toHaveBeenCalledOnce()
      expect(cache.pendingCount).toBe(1)

      resolvePromise!(mockResponse)

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3])

      expect(result1).toEqual(mockResponse)
      expect(result2).toEqual(mockResponse)
      expect(result3).toEqual(mockResponse)
      expect(cache.pendingCount).toBe(0)
    })

    it('cleans up pending request on error', async () => {
      const error = new Error('fetch failed')
      const fetcher = vi.fn().mockRejectedValue(error)

      await expect(cache.getOrFetch('123 Main St', fetcher)).rejects.toThrow('fetch failed')
      expect(cache.pendingCount).toBe(0)
    })
  })

  describe('clear', () => {
    it('clears all cached items', () => {
      cache.set('addr1', mockResponse)
      cache.set('addr2', mockResponse)

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.get('addr1')).toBeUndefined()
    })
  })
})
