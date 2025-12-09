import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { validateAddressRequestSchema, type ValidateAddressResponse } from '../schemas/address.js'
import { perSecondRateLimit } from '../plugins/rate-limit.js'

interface ValidateAddressBody {
  address: string
}

export async function validateAddressRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: ValidateAddressBody }>(
    '/validate-address',
    {
      config: perSecondRateLimit,
    },
    async (request: FastifyRequest<{ Body: ValidateAddressBody }>, reply: FastifyReply) => {
      const parseResult = validateAddressRequestSchema.safeParse(request.body)

      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid request body',
        })
      }

      const { address } = parseResult.data

      try {
        const response = await fastify.addressCache.getOrFetch(address, async () => {
          const result = await fastify.addressService.validate(address)
          
          return {
            address: result.address,
            status: result.status,
            originalInput: address,
          }
        })

        return reply.send(response)
      } catch (error) {
        if (error instanceof Error && error.message === 'Address service timeout') {
          return reply.status(503).send({
            statusCode: 503,
            error: 'Service Unavailable',
            message: 'Address service timeout',
          })
        }

        fastify.log.error(error, 'Address validation failed')
        return reply.status(502).send({
          statusCode: 502,
          error: 'Bad Gateway',
          message: 'External service error',
        })
      }
    },
  )
}
