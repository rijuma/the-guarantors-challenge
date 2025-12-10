export function mockGoogleValidationResponse(overrides: Record<string, unknown> = {}) {
  return {
    result: {
      verdict: {
        inputGranularity: 'PREMISE',
        validationGranularity: 'PREMISE',
        geocodeGranularity: 'PREMISE',
        addressComplete: true,
        hasUnconfirmedComponents: false,
        hasInferredComponents: false,
        hasReplacedComponents: false,
      },
      address: {
        formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
        postalAddress: {
          regionCode: 'US',
          languageCode: 'en',
          postalCode: '94043',
          administrativeArea: 'CA',
          locality: 'Mountain View',
          addressLines: ['1600 Amphitheatre Pkwy'],
        },
        addressComponents: [
          {
            componentName: {
              text: '1600',
              languageCode: 'en',
            },
            componentType: 'street_number',
            confirmationLevel: 'CONFIRMED',
          },
          {
            componentName: {
              text: 'Amphitheatre Parkway',
              languageCode: 'en',
            },
            componentType: 'route',
            confirmationLevel: 'CONFIRMED',
          },
          {
            componentName: {
              text: 'Mountain View',
              languageCode: 'en',
            },
            componentType: 'locality',
            confirmationLevel: 'CONFIRMED',
          },
          {
            componentName: {
              text: 'CA',
              languageCode: 'en',
            },
            componentType: 'administrative_area_level_1',
            confirmationLevel: 'CONFIRMED',
          },
          {
            componentName: {
              text: '94043',
              languageCode: 'en',
            },
            componentType: 'postal_code',
            confirmationLevel: 'CONFIRMED',
          },
        ],
      },
      geocode: {
        location: {
          latitude: 37.4224764,
          longitude: -122.0842499,
        },
        plusCode: {
          globalCode: '849VCWC8+R9',
        },
        bounds: {
          low: {
            latitude: 37.4223274,
            longitude: -122.0843989,
          },
          high: {
            latitude: 37.4226254,
            longitude: -122.0841009,
          },
        },
        featureSizeMeters: 20.5,
        placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
        placeTypes: ['street_address'],
      },
      metadata: {
        business: true,
        residential: false,
      },
      uspsData: {
        standardizedAddress: {
          firstAddressLine: '1600 AMPHITHEATRE PKWY',
          cityStateZipAddressLine: 'MOUNTAIN VIEW CA 94043-1351',
          city: 'MOUNTAIN VIEW',
          state: 'CA',
          zipCode: '94043',
          zipCodeExtension: '1351',
        },
        deliveryPointCode: '00',
        deliveryPointCheckDigit: '7',
        dpvConfirmation: 'Y',
        carrierRoute: 'C909',
        cassProcessed: true,
      },
    },
    responseId: 'abc123-def456-ghi789',
    ...overrides,
  }
}

export function mockGoogleValidationUnverifiableResponse() {
  return {
    result: {
      verdict: {
        inputGranularity: 'OTHER',
        validationGranularity: 'OTHER',
        addressComplete: false,
        hasUnconfirmedComponents: true,
      },
      address: {
        formattedAddress: '',
        postalAddress: {
          regionCode: 'US',
        },
      },
    },
    responseId: 'xyz789-abc123',
  }
}

export function mockGoogleValidationCorrectedResponse() {
  return {
    result: {
      verdict: {
        inputGranularity: 'PREMISE',
        validationGranularity: 'PREMISE',
        geocodeGranularity: 'PREMISE',
        addressComplete: true,
        hasUnconfirmedComponents: false,
        hasInferredComponents: true,
        hasReplacedComponents: true,
      },
      address: {
        formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
        postalAddress: {
          regionCode: 'US',
          languageCode: 'en',
          postalCode: '94043',
          administrativeArea: 'CA',
          locality: 'Mountain View',
          addressLines: ['1600 Amphitheatre Pkwy'],
        },
      },
      geocode: {
        location: {
          latitude: 37.4224764,
          longitude: -122.0842499,
        },
        placeId: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
      },
      uspsData: {
        standardizedAddress: {
          firstAddressLine: '1600 AMPHITHEATRE PKWY',
          cityStateZipAddressLine: 'MOUNTAIN VIEW CA 94043-1351',
          city: 'MOUNTAIN VIEW',
          state: 'CA',
          zipCode: '94043',
          zipCodeExtension: '1351',
        },
        cassProcessed: true,
      },
    },
    responseId: 'corrected-abc123',
  }
}
