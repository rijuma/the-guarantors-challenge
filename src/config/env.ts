import 'dotenv/config'
import { z } from 'zod'

const SUPPORTED_GEO_SERVICES = ['google-maps', 'geocodio'] as const

export type GeoServiceName = (typeof SUPPORTED_GEO_SERVICES)[number]

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_DOMAIN: z.string().default('http://localhost:3000'),

  API_TOKEN: z.string().min(1),

  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEOCODIO_API_KEY: z.string().optional(),

  GEO_SERVICES: z
    .string()
    .default('google-maps')
    .transform((val) => val.split(',').map((s) => s.trim()))
    .pipe(z.array(z.enum(SUPPORTED_GEO_SERVICES)))
    .refine(
      (services) => services.length > 0,
      'GEO_SERVICES must contain at least one valid service',
    ),

  ADDRESS_SERVICE_TIMEOUT: z.string().default('5000').transform(Number),

  CACHE_MAX_SIZE: z.string().default('1000').transform(Number),
  CACHE_TTL_MS: z.string().default('3600000').transform(Number),

  DEBUG: z
    .string()
    .default('false')
    .transform((val) => val.toLowerCase() === 'true'),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    console.error(result.error.format())
    process.exit(1)
  }

  const env = result.data

  // Validate that API keys are provided for the selected services
  for (const service of env.GEO_SERVICES) {
    if (service === 'google-maps' && !env.GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is required when google-maps is in GEO_SERVICES')
      process.exit(1)
    }
    if (service === 'geocodio' && !env.GEOCODIO_API_KEY) {
      console.error('GEOCODIO_API_KEY is required when geocodio is in GEO_SERVICES')
      process.exit(1)
    }
  }

  return env
}

export const env = loadEnv()
