import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import { AddressCache } from './cache/address-cache.js'
import { createAddressService, createAddressServiceOrchestrator } from './services/index.js'
import { registerRateLimit } from './plugins/rate-limit.js'
import { validateAddressRoute } from './routes/validate-address.js'

export interface BuildAppOptions extends FastifyServerOptions {
  skipRateLimit?: boolean
  skipSwagger?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify(options)

  await app.register(cors, {
    origin: env.API_DOMAIN,
  })

  if (!options.skipSwagger) {
    await app.register(swagger, {
      openapi: {
        openapi: '3.1.0',
        info: {
          title: 'Address Validation API',
          description: 'API for validating and standardizing US property addresses',
          version: '1.0.0',
        },
        servers: [
          {
            url: env.API_DOMAIN,
            description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            apiToken: {
              type: 'apiKey',
              name: 'X-Token',
              in: 'header',
              description: 'API token for authentication',
            },
          },
        },
        security: [{ apiToken: [] }],
      },
    })

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    })
  }

  const addressCache = new AddressCache({
    maxSize: env.CACHE_MAX_SIZE,
    ttlMs: env.CACHE_TTL_MS,
  })
  app.decorate('addressCache', addressCache)

  const addressService = createAddressService()
  app.decorate('addressService', addressService)

  const addressOrchestrator = createAddressServiceOrchestrator()
  app.decorate('addressOrchestrator', addressOrchestrator)

  if (!options.skipRateLimit) {
    await registerRateLimit(app)
  }

  await app.register(validateAddressRoute)

  return app
}
