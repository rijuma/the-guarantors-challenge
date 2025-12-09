import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { env } from './config/env.js'
import authPlugin from './plugins/auth.js'
import { AddressCache } from './cache/address-cache.js'
import { createAddressService } from './services/index.js'
import { registerRateLimit } from './plugins/rate-limit.js'
import { validateAddressRoute } from './routes/validate-address.js'

export interface BuildAppOptions extends FastifyServerOptions {
  skipAuth?: boolean
  skipRateLimit?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options)

  const addressCache = new AddressCache({
    maxSize: env.CACHE_MAX_SIZE,
    ttlMs: env.CACHE_TTL_MS,
  })
  app.decorate('addressCache', addressCache)

  const addressService = createAddressService()
  app.decorate('addressService', addressService)

  if (!options.skipRateLimit) {
    await registerRateLimit(app)
  }

  if (!options.skipAuth) {
    await app.register(authPlugin)
  }

  await app.register(validateAddressRoute)

  return app
}
