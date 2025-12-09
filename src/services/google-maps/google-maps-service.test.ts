import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { GoogleMapsService } from './google-maps-service.js'
import {
  mockGoogleGeocodeResponse,
  mockGoogleZeroResultsResponse,
  mockGooglePartialMatchResponse,
} from './fixtures.js'

describe('GoogleMapsService', () => {
  let service: GoogleMapsService
  let mockFetch: Mock

  beforeEach(() => {
    service = new GoogleMapsService({
      timeout: 5000,
      apiKey: 'test-api-key',
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('validate', () => {
    it('returns valid status for exact match', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleGeocodeResponse()),
      })

      const result = await service.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toEqual({
        street: 'Amphitheatre Parkway',
        number: '1600',
        city: 'Mountain View',
        state: 'CA',
        zip: '94043',
      })
    })

    it('returns corrected status for partial match', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGooglePartialMatchResponse()),
      })

      const result = await service.validate('1600 Amphitheater, Mountain View')

      expect(result.status).toBe('corrected')
      expect(result.address).not.toBeNull()
    })

    it('returns unverifiable status for zero results', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleZeroResultsResponse()),
      })

      const result = await service.validate('invalid address xyz')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable for invalid response structure', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      const result = await service.validate('some address')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable when required components are missing', async () => {
      const incompleteResponse = {
        results: [
          {
            address_components: [
              { long_name: '1600', short_name: '1600', types: ['street_number'] },
            ],
            formatted_address: '1600',
            geometry: {
              location: { lat: 0, lng: 0 },
              location_type: 'ROOFTOP',
            },
            place_id: 'test',
            types: ['street_address'],
          },
        ],
        status: 'OK',
      }

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(incompleteResponse),
      })

      const result = await service.validate('1600')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('throws on timeout', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      await expect(service.validate('test')).rejects.toThrow('Address service timeout')
    })

    it('rethrows other errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(service.validate('test')).rejects.toThrow('Network error')
    })

    it('builds correct request URL', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockGoogleGeocodeResponse()),
      })

      await service.validate('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://maps.googleapis.com/maps/api/geocode/json'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('components=country%3AUS'),
        expect.any(Object),
      )
    })
  })

  describe('address extraction', () => {
    it('handles missing street number', async () => {
      const responseWithoutNumber = mockGoogleGeocodeResponse()
      responseWithoutNumber.results[0].address_components =
        responseWithoutNumber.results[0].address_components.filter(
          (c) => !c.types.includes('street_number'),
        )

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(responseWithoutNumber),
      })

      const result = await service.validate('Main St, Springfield')

      expect(result.status).toBe('valid')
      expect(result.address?.number).toBeNull()
    })

    it('handles missing route', async () => {
      const responseWithoutRoute = mockGoogleGeocodeResponse()
      responseWithoutRoute.results[0].address_components =
        responseWithoutRoute.results[0].address_components.filter(
          (c) => !c.types.includes('route'),
        )

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(responseWithoutRoute),
      })

      const result = await service.validate('Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address?.street).toBe('')
    })
  })
})
