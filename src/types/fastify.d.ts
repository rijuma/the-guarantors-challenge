import type { AddressCache } from '../cache/address-cache.js'
import type { AddressService } from '../services/base/address-service.js'
import type { AddressServiceOrchestrator } from '../services/orchestrator.js'

declare module 'fastify' {
  interface FastifyInstance {
    addressCache: AddressCache
    addressService: AddressService
    addressOrchestrator: AddressServiceOrchestrator
  }
}
