import { z } from 'zod'

export const validateAddressRequestSchema = z.object({
  address: z.string().min(1).max(500),
})

export type ValidateAddressRequest = z.infer<typeof validateAddressRequestSchema>

export const addressValidationStatusSchema = z.enum(['valid', 'corrected', 'unverifiable'])

export type AddressValidationStatus = z.infer<typeof addressValidationStatusSchema>

export const coordinatesSchema = z.tuple([z.number(), z.number()])

export type Coordinates = z.infer<typeof coordinatesSchema>

export const standardizedAddressSchema = z.object({
  street: z.string(),
  number: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  coordinates: coordinatesSchema.optional(),
})

export type StandardizedAddress = z.infer<typeof standardizedAddressSchema>

export const validateAddressResponseSchema = z.object({
  address: standardizedAddressSchema.nullable(),
  status: addressValidationStatusSchema,
})

export type ValidateAddressResponse = z.infer<typeof validateAddressResponseSchema>
