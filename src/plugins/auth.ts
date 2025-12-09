import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '@/config/env'

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.headers['x-token']

  if (!token || token !== env.API_TOKEN) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing X-Token header',
    })
  }
}
