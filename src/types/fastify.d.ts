import type { AddressCache } from '../cache/address-cache'
import type { AddressServiceOrchestrator } from '../services/orchestrator'

declare module 'fastify' {
  interface FastifyInstance {
    addressCache: AddressCache
    addressOrchestrator: AddressServiceOrchestrator
  }
}
