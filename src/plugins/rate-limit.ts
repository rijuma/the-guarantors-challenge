import type { FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds`,
      retryAfter: context.ttl,
    }),
  })
}

export const perSecondRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: '1 second',
  },
}
