import { z } from 'zod'

export const geocodioAddressComponentsSchema = z.object({
  number: z.string().optional(),
  predirectional: z.string().optional(),
  street: z.string().optional(),
  suffix: z.string().optional(),
  formatted_street: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
})

export type GeocodioAddressComponents = z.infer<typeof geocodioAddressComponentsSchema>

export const geocodioLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const geocodioResultSchema = z.object({
  address_components: geocodioAddressComponentsSchema,
  formatted_address: z.string(),
  location: geocodioLocationSchema,
  accuracy: z.number(),
  accuracy_type: z.string(),
  source: z.string(),
})

export type GeocodioResult = z.infer<typeof geocodioResultSchema>

export const geocodioResponseSchema = z.object({
  input: z.object({
    address_string: z.string(),
    formatted_address: z.string(),
  }),
  results: z.array(geocodioResultSchema),
})

export type GeocodioResponse = z.infer<typeof geocodioResponseSchema>
