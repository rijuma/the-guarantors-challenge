import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env'
import { AddressCache } from './cache/address-cache'
import { createAddressServiceOrchestrator } from './services'
import { registerRateLimit } from './plugins/rate-limit'
import { validateAddressRoute } from './routes/validate-address'

export interface BuildAppOptions extends FastifyServerOptions {
  skipRateLimit?: boolean
  skipSwagger?: boolean
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    ...options,
  })

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
    logger: app.log,
  })
  app.decorate('addressCache', addressCache)

  const addressOrchestrator = createAddressServiceOrchestrator(app.log)
  app.decorate('addressOrchestrator', addressOrchestrator)

  if (!options.skipRateLimit) {
    await registerRateLimit(app)
  }

  await app.register(validateAddressRoute)

  return app
}
