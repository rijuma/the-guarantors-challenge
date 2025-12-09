export function mockGeocodioResponse(overrides: Record<string, unknown> = {}) {
  return {
    input: {
      address_string: '1600 Amphitheatre Parkway, Mountain View, CA',
      formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
    },
    results: [
      {
        address_components: {
          number: '1600',
          predirectional: '',
          street: 'Amphitheatre',
          suffix: 'Pkwy',
          formatted_street: 'Amphitheatre Pkwy',
          city: 'Mountain View',
          county: 'Santa Clara County',
          state: 'CA',
          zip: '94043',
          country: 'US',
        },
        formatted_address: '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
        location: {
          lat: 37.422408,
          lng: -122.08416,
        },
        accuracy: 1,
        accuracy_type: 'rooftop',
        source: 'TIGER/Line® dataset from the US Census Bureau',
      },
    ],
    ...overrides,
  }
}

export function mockGeocodioZeroResultsResponse() {
  return {
    input: {
      address_string: 'invalid address',
      formatted_address: 'invalid address',
    },
    results: [],
  }
}

export function mockGeocodioLowAccuracyResponse() {
  const base = mockGeocodioResponse()
  base.results[0].accuracy = 0.5
  base.results[0].accuracy_type = 'street_center'
  return base
}

export function mockGeocodioWithoutNumberResponse() {
  const base = mockGeocodioResponse()
  base.results[0].address_components.number = ''
  return base
}
