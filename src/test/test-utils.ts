import { vi, type Mock } from 'vitest'
import type { FastifyBaseLogger } from 'fastify'

/**
 * Creates a mock Fastify logger for testing
 */
export function createMockLogger(): FastifyBaseLogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(function(this: FastifyBaseLogger) {
      return this
    }),
  } as unknown as FastifyBaseLogger
}

/**
 * Mocks a successful fetch response with the given data
 */
export function mockFetchResponse(mockFetch: Mock, data: unknown): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(data),
  })
}

/**
 * Mocks a fetch error response
 */
export function mockFetchError(mockFetch: Mock, error: Error): void {
  mockFetch.mockRejectedValue(error)
}

/**
 * Creates an abort error for timeout testing
 */
export function createAbortError(message = 'Aborted'): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}
