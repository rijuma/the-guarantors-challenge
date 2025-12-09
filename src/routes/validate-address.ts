import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { validateAddressRequestSchema, type ValidateAddressResponse } from '@/schemas/address'
import { perSecondRateLimit } from '@/plugins/rate-limit'
import { verifyAuth } from '@/plugins/auth'

interface ValidateAddressBody {
  address: string
}

const routeSchema = {
  description: 'Validate and standardize a US property address',
  tags: ['Address Validation'],
  summary: 'Validate address',
  body: {
    type: 'object',
    required: ['address'],
    properties: {
      address: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Free-form address text to validate',
      },
    },
    examples: [
      { address: '1600 Amphitheatre Parkway, Mountain View, CA' },
    ],
  },
  response: {
    200: {
      description: 'Successfully validated address',
      type: 'object',
      properties: {
        address: {
          type: 'object',
          nullable: true,
          properties: {
            street: { type: 'string' },
            number: { type: 'string', nullable: true },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            coordinates: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: 'Coordinates as [latitude, longitude]',
            },
          },
        },
        status: {
          type: 'string',
          enum: ['valid', 'corrected', 'unverifiable'],
          description: 'Validation status: valid (exact match), corrected (fixed typos/missing info), unverifiable (could not validate)',
        },
        alt: {
          type: 'array',
          description: 'Alternative addresses from different services (only present if multiple unique addresses found)',
          items: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              number: { type: 'string', nullable: true },
              city: { type: 'string' },
              state: { type: 'string' },
              zip: { type: 'string' },
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                minItems: 2,
                maxItems: 2,
                description: 'Coordinates as [latitude, longitude]',
              },
              service: {
                type: 'string',
                description: 'The geocoding service that returned this address',
              },
            },
          },
        },
      },
      examples: [
        {
          address: {
            street: 'Amphitheatre Pkwy',
            number: '1600',
            city: 'Mountain View',
            state: 'CA',
            zip: '94043',
            coordinates: [37.4224764, -122.0842499],
          },
          status: 'valid',
        },
      ],
    },
    400: {
      description: 'Invalid request body',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    401: {
      description: 'Unauthorized - missing or invalid API token',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    429: {
      description: 'Too many requests - rate limit exceeded',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    502: {
      description: 'External service error',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
    503: {
      description: 'Address service timeout',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
}

export async function validateAddressRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: ValidateAddressBody }>(
    '/validate-address',
    {
      schema: routeSchema,
      config: perSecondRateLimit,
      preHandler: verifyAuth,
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
          const result = await fastify.addressOrchestrator.validate(address)

          return {
            address: result.address,
            status: result.status,
            alt: result.alt,
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
