export function mockGoogleGeocodeResponse(overrides: Record<string, unknown> = {}) {
  return {
    results: [
      {
        address_components: [
          { long_name: '1600', short_name: '1600', types: ['street_number'] },
          { long_name: 'Amphitheatre Parkway', short_name: 'Amphitheatre Pkwy', types: ['route'] },
          { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
          {
            long_name: 'California',
            short_name: 'CA',
            types: ['administrative_area_level_1'],
          },
          { long_name: '94043', short_name: '94043', types: ['postal_code'] },
          { long_name: 'United States', short_name: 'US', types: ['country'] },
        ],
        formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
        geometry: {
          location: { lat: 37.4224764, lng: -122.0842499 },
          location_type: 'ROOFTOP',
        },
        place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
        types: ['street_address'],
      },
    ],
    status: 'OK',
    ...overrides,
  }
}

export function mockGoogleZeroResultsResponse() {
  return {
    results: [],
    status: 'ZERO_RESULTS',
  }
}

export function mockGooglePartialMatchResponse() {
  const base = mockGoogleGeocodeResponse()
  ;(base.results[0] as Record<string, unknown>).partial_match = true
  return base
}
