import { env } from '../config/env.js'
import type { AddressService } from './base/address-service.js'
import { GoogleMapsService } from './google-maps/google-maps-service.js'

export { AddressService } from './base/address-service.js'
export { GoogleMapsService } from './google-maps/google-maps-service.js'

export function createAddressService(): AddressService {
  return new GoogleMapsService({
    timeout: env.ADDRESS_SERVICE_TIMEOUT,
    apiKey: env.GOOGLE_MAPS_API_KEY,
  })
}
