import type { AddressCache } from '../cache/address-cache'
import type { AddressService } from '../services/base/address-service'
import type { AddressServiceOrchestrator } from '../services/orchestrator'

declare module 'fastify' {
  interface FastifyInstance {
    addressCache: AddressCache
    addressService: AddressService
    addressOrchestrator: AddressServiceOrchestrator
  }
}
