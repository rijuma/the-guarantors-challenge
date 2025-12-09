import type { FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'node:crypto'
import { env } from '@/config/env'

// Kind of an edge case, but this prevents a timing attack where an attacker can guess the token by measuring the response time.
function isValidToken(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) {
    return false
  }
  try {
    const providedBuffer = Buffer.from(provided, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

export async function verifyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const rawToken = request.headers['x-token']
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken

  if (!token || !isValidToken(token, env.API_TOKEN)) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing X-Token header',
    })
  }
}
