import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { GoogleValidationService } from './google-validation-service'
import {
  mockGoogleValidationResponse,
  mockGoogleValidationUnverifiableResponse,
  mockGoogleValidationCorrectedResponse,
} from './fixtures'
import { mockFetchError, createAbortError } from '@/test'

describe('GoogleValidationService', () => {
  let service: GoogleValidationService
  let mockFetch: Mock

  beforeEach(() => {
    service = new GoogleValidationService({
      timeout: 5000,
      apiKey: 'test-api-key',
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('validate', () => {
    it('returns valid status for complete address', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGoogleValidationResponse()),
      })

      const result = await service.validate('1600 Amphitheatre Parkway, Mountain View, CA')

      expect(result.status).toBe('valid')
      expect(result.address).toEqual({
        street: 'AMPHITHEATRE PKWY',
        number: '1600',
        city: 'MOUNTAIN VIEW',
        state: 'CA',
        zip: '94043-1351',
        coordinates: [37.4224764, -122.0842499],
      })
    })

    it('returns corrected status for address with inferred components', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGoogleValidationCorrectedResponse()),
      })

      const result = await service.validate('1600 Amphitheater, Mountain View')

      expect(result.status).toBe('corrected')
      expect(result.address).not.toBeNull()
      expect(result.address?.city).toBe('MOUNTAIN VIEW')
    })

    it('returns unverifiable status for incomplete address', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGoogleValidationUnverifiableResponse()),
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
        result: {
          verdict: {
            addressComplete: true,
          },
          address: {
            postalAddress: {
              regionCode: 'US',
              addressLines: ['123 Main St'],
            },
          },
          geocode: {
            location: {
              latitude: 0,
              longitude: 0,
            },
          },
        },
        responseId: 'test-id',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(incompleteResponse),
      })

      const result = await service.validate('123 Main St')

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

    it('builds correct request URL and sends POST request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockGoogleValidationResponse()),
      })

      await service.validate('123 Main St')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://addressvalidation.googleapis.com/v1:validateAddress',
        ),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('123 Main St'),
        }),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('key=test-api-key'),
        expect.any(Object),
      )
    })
  })

  describe('address extraction', () => {
    it('uses USPS data when available', async () => {
      const response = mockGoogleValidationResponse()

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('1600 Amphitheatre Parkway')

      expect(result.address?.street).toBe('AMPHITHEATRE PKWY')
      expect(result.address?.number).toBe('1600')
      expect(result.address?.zip).toBe('94043-1351')
    })

    it('falls back to postal address when USPS data is not available', async () => {
      const baseResponse = mockGoogleValidationResponse()
      const { uspsData, ...result } = baseResponse.result
      const response = {
        ...baseResponse,
        result: {
          ...result,
        },
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result_1 = await service.validate('1600 Amphitheatre Parkway')

      expect(result_1.address?.street).toBe('Amphitheatre Pkwy')
      expect(result_1.address?.number).toBe('1600')
      expect(result_1.address?.city).toBe('Mountain View')
    })

    it('handles addresses without street numbers', async () => {
      const response = mockGoogleValidationResponse()
      response.result.uspsData!.standardizedAddress!.firstAddressLine = 'MAIN ST'

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
      })

      const result = await service.validate('Main St, Mountain View, CA')

      expect(result.address?.number).toBeNull()
      expect(result.address?.street).toBe('MAIN ST')
    })
  })
})
