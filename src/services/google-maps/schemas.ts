import { z } from 'zod'

export const addressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
})

export const geometrySchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  location_type: z.string(),
})

export const geocodeResultSchema = z.object({
  address_components: z.array(addressComponentSchema),
  formatted_address: z.string(),
  geometry: geometrySchema,
  place_id: z.string(),
  types: z.array(z.string()),
  partial_match: z.boolean().optional(),
})

export const geocodeResponseSchema = z.object({
  results: z.array(geocodeResultSchema),
  status: z.enum([
    'OK',
    'ZERO_RESULTS',
    'OVER_DAILY_LIMIT',
    'OVER_QUERY_LIMIT',
    'REQUEST_DENIED',
    'INVALID_REQUEST',
    'UNKNOWN_ERROR',
  ]),
  error_message: z.string().optional(),
})

export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>
export type GeocodeResult = z.infer<typeof geocodeResultSchema>
export type AddressComponent = z.infer<typeof addressComponentSchema>
