import { z } from 'zod'

export const addressValidationVerdictSchema = z.object({
  inputGranularity: z.string().optional(),
  validationGranularity: z.string().optional(),
  geocodeGranularity: z.string().optional(),
  addressComplete: z.boolean().optional(),
  hasUnconfirmedComponents: z.boolean().optional(),
  hasInferredComponents: z.boolean().optional(),
  hasReplacedComponents: z.boolean().optional(),
})

export const postalAddressSchema = z.object({
  regionCode: z.string().optional(),
  languageCode: z.string().optional(),
  postalCode: z.string().optional(),
  sortingCode: z.string().optional(),
  administrativeArea: z.string().optional(),
  locality: z.string().optional(),
  sublocality: z.string().optional(),
  addressLines: z.array(z.string()).optional(),
  recipients: z.array(z.string()).optional(),
  organization: z.string().optional(),
  revision: z.number().optional(),
})

export const addressComponentSchema = z.object({
  componentName: z
    .object({
      text: z.string(),
      languageCode: z.string().optional(),
    })
    .optional(),
  componentType: z.string().optional(),
  confirmationLevel: z
    .enum(['CONFIRMATION_LEVEL_UNSPECIFIED', 'CONFIRMED', 'UNCONFIRMED_BUT_PLAUSIBLE', 'UNCONFIRMED_AND_SUSPICIOUS'])
    .optional(),
  inferred: z.boolean().optional(),
  spellCorrected: z.boolean().optional(),
  replaced: z.boolean().optional(),
  unexpected: z.boolean().optional(),
})

export const addressSchema = z.object({
  formattedAddress: z.string().optional(),
  postalAddress: postalAddressSchema.optional(),
  addressComponents: z.array(addressComponentSchema).optional(),
  missingComponentTypes: z.array(z.string()).optional(),
  unconfirmedComponentTypes: z.array(z.string()).optional(),
  unresolvedTokens: z.array(z.string()).optional(),
})

export const geocodeSchema = z.object({
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  plusCode: z
    .object({
      globalCode: z.string().optional(),
      compoundCode: z.string().optional(),
    })
    .optional(),
  bounds: z
    .object({
      low: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      high: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    })
    .optional(),
  featureSizeMeters: z.number().optional(),
  placeId: z.string().optional(),
  placeTypes: z.array(z.string()).optional(),
})

export const metadataSchema = z.object({
  business: z.boolean().optional(),
  poBox: z.boolean().optional(),
  residential: z.boolean().optional(),
})

export const uspsAddressSchema = z.object({
  firstAddressLine: z.string().optional(),
  firm: z.string().optional(),
  secondAddressLine: z.string().optional(),
  urbanization: z.string().optional(),
  cityStateZipAddressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  zipCodeExtension: z.string().optional(),
})

export const uspsDataSchema = z.object({
  standardizedAddress: uspsAddressSchema.optional(),
  deliveryPointCode: z.string().optional(),
  deliveryPointCheckDigit: z.string().optional(),
  dpvConfirmation: z.string().optional(),
  dpvFootnote: z.string().optional(),
  dpvCmra: z.string().optional(),
  dpvVacant: z.string().optional(),
  dpvNoStat: z.string().optional(),
  carrierRoute: z.string().optional(),
  carrierRouteIndicator: z.string().optional(),
  ewsNoMatch: z.boolean().optional(),
  postOfficeCity: z.string().optional(),
  postOfficeState: z.string().optional(),
  abbreviatedCity: z.string().optional(),
  fipsCountyCode: z.string().optional(),
  county: z.string().optional(),
  elotNumber: z.string().optional(),
  elotFlag: z.string().optional(),
  lacsLinkReturnCode: z.string().optional(),
  lacsLinkIndicator: z.string().optional(),
  poBoxOnlyPostalCode: z.boolean().optional(),
  suitelinkFootnote: z.string().optional(),
  pmbDesignator: z.string().optional(),
  pmbNumber: z.string().optional(),
  addressRecordType: z.string().optional(),
  defaultAddress: z.boolean().optional(),
  errorMessage: z.string().optional(),
  cassProcessed: z.boolean().optional(),
})

export const validationResultSchema = z.object({
  verdict: addressValidationVerdictSchema.optional(),
  address: addressSchema.optional(),
  geocode: geocodeSchema.optional(),
  metadata: metadataSchema.optional(),
  uspsData: uspsDataSchema.optional(),
})

export const addressValidationResponseSchema = z.object({
  result: validationResultSchema.optional(),
  responseId: z.string().optional(),
})

export type AddressValidationResponse = z.infer<typeof addressValidationResponseSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>
export type AddressValidationVerdict = z.infer<typeof addressValidationVerdictSchema>
export type PostalAddress = z.infer<typeof postalAddressSchema>
export type AddressComponent = z.infer<typeof addressComponentSchema>
export type Geocode = z.infer<typeof geocodeSchema>
export type UspsData = z.infer<typeof uspsDataSchema>
