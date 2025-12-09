export function mockAzureMapsResponse(overrides: Record<string, unknown> = {}) {
  return {
    summary: {
      query: '1600 Amphitheatre Parkway, Mountain View, CA',
      queryType: 'NON_NEAR',
      queryTime: 45,
      numResults: 1,
      fuzzyLevel: 1,
    },
    results: [
      {
        type: 'Point Address',
        score: 8.5,
        matchType: 'AddressPoint',
        address: {
          streetNumber: '1600',
          streetName: 'Amphitheatre Parkway',
          municipality: 'Mountain View',
          countrySubdivision: 'California',
          countrySubdivisionCode: 'CA',
          postalCode: '94043',
          freeformAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
          country: 'United States',
          countryCode: 'US',
        },
        position: {
          lat: 37.4224764,
          lon: -122.0842499,
        },
      },
    ],
    ...overrides,
  }
}

export function mockAzureMapsZeroResultsResponse() {
  return {
    summary: {
      query: 'invalid address xyz',
      queryType: 'NON_NEAR',
      queryTime: 20,
      numResults: 0,
    },
    results: [],
  }
}

export function mockAzureMapsFuzzyMatchResponse() {
  const base = mockAzureMapsResponse()
  base.summary.fuzzyLevel = 2
  base.results[0].score = 6.5
  base.results[0].matchType = 'HouseNumberRange'
  return base
}

export function mockAzureMapsLowScoreResponse() {
  const base = mockAzureMapsResponse()
  base.results[0].score = 4.0
  base.results[0].matchType = 'Street'
  return base
}

export function mockAzureMapsWithoutNumberResponse() {
  return {
    summary: {
      query: 'Amphitheatre Parkway, Mountain View, CA',
      queryType: 'NON_NEAR',
      queryTime: 45,
      numResults: 1,
      fuzzyLevel: 1,
    },
    results: [
      {
        type: 'Point Address',
        score: 8.5,
        matchType: 'AddressPoint',
        address: {
          streetName: 'Amphitheatre Parkway',
          municipality: 'Mountain View',
          countrySubdivision: 'California',
          countrySubdivisionCode: 'CA',
          postalCode: '94043',
          freeformAddress: 'Amphitheatre Parkway, Mountain View, CA 94043',
          country: 'United States',
          countryCode: 'US',
        },
        position: {
          lat: 37.4224764,
          lon: -122.0842499,
        },
      },
    ],
  }
}
