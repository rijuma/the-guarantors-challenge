import type { FastifyBaseLogger } from 'fastify'
import { env } from '@/config/env'
import { AddressServiceOrchestrator } from './orchestrator'

export { AddressService } from './base/address-service'
export { GoogleMapsService } from './google-maps/google-maps-service'
export { GeocodioService } from './geocodio/geocodio-service'
export { AddressServiceOrchestrator } from './orchestrator'
export type { OrchestratedResult } from './orchestrator'

export function createAddressServiceOrchestrator(logger: FastifyBaseLogger): AddressServiceOrchestrator {
  return new AddressServiceOrchestrator({
    serviceNames: env.GEO_SERVICES,
    logger,
  })
}
