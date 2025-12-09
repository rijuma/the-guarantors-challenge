import { env, type GeoServiceName } from '../config/env.js'
import type { AddressService } from './base/address-service.js'
import { GoogleMapsService } from './google-maps/google-maps-service.js'
import { GeocodioService } from './geocodio/geocodio-service.js'
import { AddressServiceOrchestrator } from './orchestrator.js'

export { AddressService } from './base/address-service.js'
export { GoogleMapsService } from './google-maps/google-maps-service.js'
export { GeocodioService } from './geocodio/geocodio-service.js'
export { AddressServiceOrchestrator } from './orchestrator.js'
export type { OrchestratedResult } from './orchestrator.js'

export function createAddressService(): AddressService {
  return new GoogleMapsService({
    timeout: env.ADDRESS_SERVICE_TIMEOUT,
    apiKey: env.GOOGLE_MAPS_API_KEY!,
  })
}

export function createAddressServiceOrchestrator(): AddressServiceOrchestrator {
  const serviceConfigs: Record<GeoServiceName, { timeout: number; apiKey: string }> = {
    'google-maps': {
      timeout: env.ADDRESS_SERVICE_TIMEOUT,
      apiKey: env.GOOGLE_MAPS_API_KEY || '',
    },
    geocodio: {
      timeout: env.ADDRESS_SERVICE_TIMEOUT,
      apiKey: env.GEOCODIO_API_KEY || '',
    },
  }

  return new AddressServiceOrchestrator(env.GEO_SERVICES, serviceConfigs)
}
