import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { GeocodioService } from './geocodio-service'
import {
  mockGeocodioResponse,
  mockGeocodioZeroResultsResponse,
  mockGeocodioLowAccuracyResponse,
  mockGeocodioWithoutNumberResponse,
} from './fixtures'
import { mockFetchResponse, mockFetchError, createAbortError } from '@/test'

describe('GeocodioService', () => {
  let service: GeocodioService
  let mockFetch: Mock

  beforeEach(() => {
    service = new GeocodioService({
      timeout: 5000,
      apiKey: 'test-api-key',
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('validate', () => {
    it('returns valid status for high accuracy rooftop match', async () => {
      mockFetchResponse(mockFetch, mockGeocodioResponse())

      const result = await service.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toEqual({
        street: 'Amphitheatre Pkwy',
        number: '1600',
        city: 'Mountain View',
        state: 'CA',
        zip: '94043',
        coordinates: [37.422408, -122.08416],
      })
    })

    it('returns corrected status for low accuracy match', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGeocodioLowAccuracyResponse()),
      })

      const result = await service.validate('1600 Amphitheatre, Mountain View')

      expect(result.status).toBe('corrected')
      expect(result.address).not.toBeNull()
    })

    it('returns unverifiable status for zero results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGeocodioZeroResultsResponse()),
      })

      const result = await service.validate('invalid address xyz')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable for invalid response structure', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      const result = await service.validate('some address')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable when required components are missing', async () => {
      const incompleteResponse = {
        input: {
          address_string: '1600',
          formatted_address: '1600',
        },
        results: [
          {
            address_components: {
              number: '1600',
            },
            formatted_address: '1600',
            location: { lat: 0, lng: 0 },
            accuracy: 0.1,
            accuracy_type: 'unknown',
            source: 'test',
          },
        ],
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(incompleteResponse),
      })

      const result = await service.validate('1600')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('throws on timeout', async () => {
      mockFetchError(mockFetch, createAbortError())

      await expect(service.validate('test')).rejects.toThrow('Address service timeout')
    })

    it('rethrows other errors', async () => {
      mockFetchError(mockFetch, new Error('Network error'))

      await expect(service.validate('test')).rejects.toThrow('Network error')
    })

    it('builds correct request URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGeocodioResponse()),
      })

      await service.validate('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.geocod.io/v1.7/geocode'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api_key=test-api-key'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('country=US'),
        expect.any(Object),
      )
    })
  })

  describe('address extraction', () => {
    it('handles missing street number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGeocodioWithoutNumberResponse()),
      })

      const result = await service.validate('Main St, Mountain View')

      expect(result.status).toBe('valid')
      expect(result.address?.number).toBeNull()
    })

    it('uses formatted_street when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGeocodioResponse()),
      })

      const result = await service.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.address?.street).toBe('Amphitheatre Pkwy')
    })
  })

  describe('accuracy determination', () => {
    it('returns valid for high accuracy rooftop', async () => {
      const response = mockGeocodioResponse()
      response.results[0].accuracy = 1.0
      response.results[0].accuracy_type = 'rooftop'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('test address')
      expect(result.status).toBe('valid')
    })

    it('returns valid for high accuracy range_interpolation', async () => {
      const response = mockGeocodioResponse()
      response.results[0].accuracy = 0.9
      response.results[0].accuracy_type = 'range_interpolation'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('test address')
      expect(result.status).toBe('valid')
    })

    it('returns corrected for low accuracy', async () => {
      const response = mockGeocodioResponse()
      response.results[0].accuracy = 0.5
      response.results[0].accuracy_type = 'rooftop'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('test address')
      expect(result.status).toBe('corrected')
    })

    it('returns corrected for street_center accuracy type', async () => {
      const response = mockGeocodioResponse()
      response.results[0].accuracy = 1.0
      response.results[0].accuracy_type = 'street_center'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('test address')
      expect(result.status).toBe('corrected')
    })
  })
})
