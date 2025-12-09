import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { AzureMapsService } from './azure-maps-service'
import {
  mockAzureMapsResponse,
  mockAzureMapsZeroResultsResponse,
  mockAzureMapsFuzzyMatchResponse,
  mockAzureMapsLowScoreResponse,
  mockAzureMapsWithoutNumberResponse,
} from './fixtures'
import { mockFetchResponse, mockFetchError, createAbortError } from '@/test'

describe('AzureMapsService', () => {
  let service: AzureMapsService
  let mockFetch: Mock

  beforeEach(() => {
    service = new AzureMapsService({
      timeout: 5000,
      apiKey: 'test-subscription-key',
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('validate', () => {
    it('returns valid status for exact address point match', async () => {
      mockFetchResponse(mockFetch, mockAzureMapsResponse())

      const result = await service.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toEqual({
        street: 'Amphitheatre Parkway',
        number: '1600',
        city: 'Mountain View',
        state: 'CA',
        zip: '94043',
        coordinates: [37.4224764, -122.0842499],
      })
    })

    it('returns corrected status for fuzzy match', async () => {
      mockFetchResponse(mockFetch, mockAzureMapsFuzzyMatchResponse())

      const result = await service.validate('1600 Ampitheater, Mountain View')

      expect(result.status).toBe('corrected')
      expect(result.address).not.toBeNull()
    })

    it('returns corrected status for low score match', async () => {
      mockFetchResponse(mockFetch, mockAzureMapsLowScoreResponse())

      const result = await service.validate('Amphitheatre Parkway, Mountain View')

      expect(result.status).toBe('corrected')
      expect(result.address).not.toBeNull()
    })

    it('returns unverifiable status for zero results', async () => {
      mockFetchResponse(mockFetch, mockAzureMapsZeroResultsResponse())

      const result = await service.validate('invalid address xyz')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable for invalid response structure', async () => {
      mockFetchResponse(mockFetch, { invalid: 'response' })

      const result = await service.validate('some address')

      expect(result.status).toBe('unverifiable')
      expect(result.address).toBeNull()
    })

    it('returns unverifiable when required components are missing', async () => {
      const incompleteResponse = {
        summary: {
          query: '1600',
          queryType: 'NON_NEAR',
          queryTime: 10,
          numResults: 1,
        },
        results: [
          {
            type: 'Point Address',
            score: 8.0,
            matchType: 'AddressPoint',
            address: {
              streetNumber: '1600',
              freeformAddress: '1600',
              country: 'United States',
              countryCode: 'US',
            },
            position: { lat: 0, lon: 0 },
          },
        ],
      }

      mockFetchResponse(mockFetch, incompleteResponse)

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
      mockFetchResponse(mockFetch, mockAzureMapsResponse())

      await service.validate('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://atlas.microsoft.com/search/address/json'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('subscription-key=test-subscription-key'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('countrySet=US'),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api-version=1.0'),
        expect.any(Object),
      )
    })
  })

  describe('address extraction', () => {
    it('handles missing street number', async () => {
      mockFetchResponse(mockFetch, mockAzureMapsWithoutNumberResponse())

      const result = await service.validate('Amphitheatre Parkway, Mountain View')

      expect(result.status).toBe('valid')
      expect(result.address?.number).toBeNull()
    })

    it('handles missing street name', async () => {
      const responseWithoutStreet = {
        summary: {
          query: 'Mountain View, CA',
          queryType: 'NON_NEAR',
          queryTime: 45,
          numResults: 1,
          fuzzyLevel: 1,
        },
        results: [
          {
            type: 'Point Address',
            score: 8.5,
            matchType: 'AddressPoint',
            address: {
              streetNumber: '1600',
              municipality: 'Mountain View',
              countrySubdivision: 'California',
              countrySubdivisionCode: 'CA',
              postalCode: '94043',
              freeformAddress: 'Mountain View, CA 94043',
              country: 'United States',
              countryCode: 'US',
            },
            position: {
              lat: 37.4224764,
              lon: -122.0842499,
            },
          },
        ],
      }

      mockFetchResponse(mockFetch, responseWithoutStreet)

      const result = await service.validate('Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address?.street).toBe('')
    })
  })

  describe('accuracy determination', () => {
    it('returns valid for high score AddressPoint with no fuzzy matching', async () => {
      const response = mockAzureMapsResponse()
      response.results[0].score = 9.0
      response.results[0].matchType = 'AddressPoint'
      response.summary.fuzzyLevel = 1

      mockFetchResponse(mockFetch, response)

      const result = await service.validate('test address')
      expect(result.status).toBe('valid')
    })

    it('returns corrected for HouseNumberRange match type', async () => {
      const response = mockAzureMapsResponse()
      response.results[0].matchType = 'HouseNumberRange'
      response.results[0].score = 7.5

      mockFetchResponse(mockFetch, response)

      const result = await service.validate('test address')
      expect(result.status).toBe('corrected')
    })

    it('returns corrected for fuzzy level > 1', async () => {
      const response = mockAzureMapsResponse()
      response.summary.fuzzyLevel = 2
      response.results[0].score = 8.0

      mockFetchResponse(mockFetch, response)

      const result = await service.validate('test address')
      expect(result.status).toBe('corrected')
    })

    it('returns corrected for moderate score', async () => {
      const response = mockAzureMapsResponse()
      response.results[0].score = 6.0
      response.results[0].matchType = 'AddressPoint'

      mockFetchResponse(mockFetch, response)

      const result = await service.validate('test address')
      expect(result.status).toBe('corrected')
    })
  })
})
