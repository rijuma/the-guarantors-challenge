import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  API_TOKEN: z.string().min(1),

  GOOGLE_MAPS_API_KEY: z.string().min(1),

  ADDRESS_SERVICE_TIMEOUT: z.string().default('5000').transform(Number),

  CACHE_MAX_SIZE: z.string().default('1000').transform(Number),
  CACHE_TTL_MS: z.string().default('3600000').transform(Number),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    console.error(result.error.format())
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
