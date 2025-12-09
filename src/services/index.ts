import { env, type GeoServiceName } from '../config/env'
import type { AddressService } from './base/address-service'
import { GoogleMapsService } from './google-maps/google-maps-service'
import { GeocodioService } from './geocodio/geocodio-service'
import { AddressServiceOrchestrator } from './orchestrator'

export { AddressService } from './base/address-service'
export { GoogleMapsService } from './google-maps/google-maps-service'
export { GeocodioService } from './geocodio/geocodio-service'
export { AddressServiceOrchestrator } from './orchestrator'
export type { OrchestratedResult } from './orchestrator'

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
