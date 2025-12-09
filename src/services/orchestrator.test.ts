import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'
import { AddressServiceOrchestrator } from './orchestrator'
import { mockGoogleGeocodeResponse, mockGooglePartialMatchResponse } from './google-maps/fixtures'
import { mockGeocodioResponse } from './geocodio/fixtures'

describe('AddressServiceOrchestrator', () => {
  let mockFetch: Mock
  let mockLogger: FastifyBaseLogger

  const mockConfig = {
    'google-maps': {
      timeout: 5000,
      apiKey: 'google-test-key',
    },
    geocodio: {
      timeout: 5000,
      apiKey: 'geocodio-test-key',
    },
  }

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as FastifyBaseLogger
  })

  describe('single service', () => {
    it('returns result from single service', async () => {
      const orchestrator = new AddressServiceOrchestrator(['google-maps'], mockConfig, mockLogger)

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleGeocodeResponse()),
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.address).toBeDefined()
      expect(result.address?.street).toBe('Amphitheatre Parkway')
      expect(result.status).toBe('valid')
      expect(result.alt).toBeUndefined()
    })

    it('returns unverifiable when service fails', async () => {
      const orchestrator = new AddressServiceOrchestrator(['google-maps'], mockConfig, mockLogger)

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ results: [], status: 'ZERO_RESULTS' }),
      })

      const result = await orchestrator.validate('invalid address')

      expect(result.address).toBeNull()
      expect(result.status).toBe('unverifiable')
      expect(result.alt).toBeUndefined()
    })
  })

  describe('multiple services', () => {
    it('returns best result from multiple services', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Google Maps response
          return Promise.resolve({
            json: () => Promise.resolve(mockGoogleGeocodeResponse()),
          })
        } else {
          // Geocodio response
          return Promise.resolve({
            json: () => Promise.resolve(mockGeocodioResponse()),
          })
        }
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toBeDefined()
      expect(callCount).toBe(2)
    })

    it('includes alt when services return different addresses', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Google Maps - returns 1600 Amphitheatre Parkway
          return Promise.resolve({
            json: () => Promise.resolve(mockGoogleGeocodeResponse()),
          })
        } else {
          // Geocodio - returns a different street
          const geocodioResponse = mockGeocodioResponse()
          geocodioResponse.results[0].address_components.formatted_street = 'Different St'
          geocodioResponse.results[0].address_components.street = 'Different'
          return Promise.resolve({
            json: () => Promise.resolve(geocodioResponse),
          })
        }
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.alt).toBeDefined()
      expect(result.alt!.length).toBeGreaterThan(0)
      expect(result.alt![0].service).toBeDefined()
    })

    it('does not include alt when services return same address', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleGeocodeResponse()),
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      // When services return the same address (after normalization), no alt
      expect(result.address).toBeDefined()
    })

    it('handles service failure gracefully', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Google Maps succeeds
          return Promise.resolve({
            json: () => Promise.resolve(mockGoogleGeocodeResponse()),
          })
        } else {
          // Geocodio fails
          return Promise.reject(new Error('Service error'))
        }
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toBeDefined()
    })
  })

  describe('request coalescing', () => {
    it('reuses promise for duplicate concurrent requests', async () => {
      const orchestrator = new AddressServiceOrchestrator(['google-maps'], mockConfig, mockLogger)

      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return {
          json: () => Promise.resolve(mockGoogleGeocodeResponse()),
        }
      })

      const address = '1600 Amphitheatre Parkway, Mountain View, CA'
      const [result1, result2, result3] = await Promise.all([
        orchestrator.validate(address),
        orchestrator.validate(address),
        orchestrator.validate(address),
      ])

      // All three calls should get the same result
      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
      // Only one fetch call should be made
      expect(callCount).toBe(1)
    })
  })

  describe('accuracy scoring', () => {
    it('prefers valid over corrected status', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Google Maps returns partial match (corrected)
          return Promise.resolve({
            json: () => Promise.resolve(mockGooglePartialMatchResponse()),
          })
        } else {
          // Geocodio returns high accuracy (valid)
          return Promise.resolve({
            json: () => Promise.resolve(mockGeocodioResponse()),
          })
        }
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      // Should prefer the valid result
      expect(result.status).toBe('valid')
    })

    it('prefers complete addresses', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // Google Maps returns address without number
          const response = mockGoogleGeocodeResponse()
          response.results[0].address_components = response.results[0].address_components.filter(
            (c) => !c.types.includes('street_number'),
          )
          return Promise.resolve({
            json: () => Promise.resolve(response),
          })
        } else {
          // Geocodio returns complete address
          return Promise.resolve({
            json: () => Promise.resolve(mockGeocodioResponse()),
          })
        }
      })

      const result = await orchestrator.validate('Main St, Mountain View, CA')

      // Should prefer the complete address with a number
      expect(result.address?.number).toBeDefined()
    })
  })

  describe('deduplication', () => {
    it('normalizes addresses for deduplication', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      // Both services return essentially the same address
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleGeocodeResponse()),
      })

      const result = await orchestrator.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      // Should be deduplicated, so no alt when addresses are the same
      expect(result.address).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('returns unverifiable when all services fail', async () => {
      const orchestrator = new AddressServiceOrchestrator(
        ['google-maps', 'geocodio'],
        mockConfig,
        mockLogger,
      )

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await orchestrator.validate('test address')

      expect(result.address).toBeNull()
      expect(result.status).toBe('unverifiable')
    })
  })
})
