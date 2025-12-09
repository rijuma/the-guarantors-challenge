import { z } from 'zod'

export const azureMapsPositionSchema = z.object({
  lat: z.number(),
  lon: z.number(),
})

export type AzureMapsPosition = z.infer<typeof azureMapsPositionSchema>

export const azureMapsAddressSchema = z.object({
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  municipality: z.string().optional(),
  countrySubdivision: z.string().optional(),
  countrySubdivisionCode: z.string().optional(),
  postalCode: z.string().optional(),
  freeformAddress: z.string(),
  country: z.string(),
  countryCode: z.string(),
})

export type AzureMapsAddress = z.infer<typeof azureMapsAddressSchema>

export const azureMapsResultSchema = z.object({
  type: z.string(),
  score: z.number(),
  matchType: z.enum(['AddressPoint', 'HouseNumberRange', 'Street']).optional(),
  address: azureMapsAddressSchema,
  position: azureMapsPositionSchema,
})

export type AzureMapsResult = z.infer<typeof azureMapsResultSchema>

export const azureMapsSummarySchema = z.object({
  query: z.string(),
  queryType: z.string(),
  queryTime: z.number(),
  numResults: z.number(),
  fuzzyLevel: z.number().optional(),
})

export const azureMapsResponseSchema = z.object({
  summary: azureMapsSummarySchema,
  results: z.array(azureMapsResultSchema),
})

export type AzureMapsResponse = z.infer<typeof azureMapsResponseSchema>
