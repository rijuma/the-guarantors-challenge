import { vi } from 'vitest'

process.env.API_TOKEN = 'test-token'
process.env.GOOGLE_MAPS_API_KEY = 'test-google-key'
process.env.ADDRESS_SERVICE_TIMEOUT = '5000'
process.env.CACHE_MAX_SIZE = '100'
process.env.CACHE_TTL_MS = '60000'
process.env.NODE_ENV = 'test'
process.env.DEBUG = 'false'

vi.stubGlobal('fetch', vi.fn())
