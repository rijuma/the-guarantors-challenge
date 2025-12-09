import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { env } from '../config/env.js'

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers['x-token']

    if (!token || token !== env.API_TOKEN) {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or missing X-Token header',
      })
    }
  })
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
})
