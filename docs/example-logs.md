# Example logs

If you run the server locally and enable all three services, you'll see something like this in the console, explaining the thought process.

## Example address: "1600 Amphitheatre Parkway, Mountain View, CA"

Output:

```
[19:20:02.810] INFO (12659): incoming request
    reqId: "req-1"
    req: {
      "method": "POST",
      "url": "/validate-address",
      "host": "localhost:3000",
      "remoteAddress": "127.0.0.1",
      "remotePort": 35794
    }
[19:20:02.814] DEBUG (12659): Starting address validation
    address: "1600 Amphitheatre Parkway, Mountain View, CA"
    services: [
      "google",
      "geocodio",
      "azure"
    ]
[19:20:02.814] DEBUG (12659): Calling service
    service: "google"
[19:20:02.836] DEBUG (12659): Calling service
    service: "geocodio"
[19:20:02.837] DEBUG (12659): Calling service
    service: "azure"
[19:20:03.218] DEBUG (12659): Service response
    service: "google"
    status: "valid"
    address: {
      "street": "Amphitheatre Parkway",
      "number": "1600",
      "city": "Mountain View",
      "state": "CA",
      "zip": "94043",
      "coordinates": [
        37.4216724,
        -122.0856444
      ]
    }
    hasRawResponse: true
[19:20:03.219] DEBUG (12659): Service raw response
    service: "google"
    rawResponse: {
      "results": [
        {
          "address_components": [
            {
              "long_name": "Google Building 41",
              "short_name": "Google Building 41",
              "types": [
                "premise"
              ]
            },
            {
              "long_name": "1600",
              "short_name": "1600",
              "types": [
                "street_number"
              ]
            },
            {
              "long_name": "Amphitheatre Parkway",
              "short_name": "Amphitheatre Pkwy",
              "types": [
                "route"
              ]
            },
            {
              "long_name": "Mountain View",
              "short_name": "Mountain View",
              "types": [
                "locality",
                "political"
              ]
            },
            {
              "long_name": "Santa Clara County",
              "short_name": "Santa Clara County",
              "types": [
                "administrative_area_level_2",
                "political"
              ]
            },
            {
              "long_name": "California",
              "short_name": "CA",
              "types": [
                "administrative_area_level_1",
                "political"
              ]
            },
            {
              "long_name": "United States",
              "short_name": "US",
              "types": [
                "country",
                "political"
              ]
            },
            {
              "long_name": "94043",
              "short_name": "94043",
              "types": [
                "postal_code"
              ]
            },
            {
              "long_name": "1351",
              "short_name": "1351",
              "types": [
                "postal_code_suffix"
              ]
            }
          ],
          "formatted_address": "Google Building 41, 1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
          "geometry": {
            "location": {
              "lat": 37.4216724,
              "lng": -122.0856444
            },
            "location_type": "ROOFTOP",
            "viewport": {
              "northeast": {
                "lat": 37.4230213802915,
                "lng": -122.0842954197085
              },
              "southwest": {
                "lat": 37.4203234197085,
                "lng": -122.0869933802915
              }
            }
          },
          "place_id": "ChIJxQvW8wK6j4AR3ukttGy3w2s",
          "types": [
            "premise",
            "street_address"
          ]
        }
      ],
      "status": "OK"
    }
[19:20:03.618] DEBUG (12659): Service response
    service: "azure"
    status: "corrected"
    address: {
      "street": "Amphitheatre Parkway",
      "number": "1600",
      "city": "Mountain View",
      "state": "CA",
      "zip": "94043",
      "coordinates": [
        37.4221599,
        -122.0842744
      ]
    }
    hasRawResponse: true
[19:20:03.618] DEBUG (12659): Service raw response
    service: "azure"
    rawResponse: {
      "summary": {
        "query": "mountain view 1600 amphitheatre parkway ca",
        "queryType": "NON_NEAR",
        "queryTime": 6,
        "numResults": 1,
        "offset": 0,
        "totalResults": 1,
        "fuzzyLevel": 1
      },
      "results": [
        {
          "type": "Point Address",
          "id": "5BIgSJMxBEKJc8fyCP4r3A",
          "score": 1,
          "matchConfidence": {
            "score": 1
          },
          "address": {
            "streetNumber": "1600",
            "streetName": "Amphitheatre Parkway",
            "municipality": "Mountain View",
            "countrySecondarySubdivision": "Santa Clara",
            "countrySubdivision": "CA",
            "countrySubdivisionName": "California",
            "countrySubdivisionCode": "CA",
            "postalCode": "94043",
            "extendedPostalCode": "94043-1351",
            "countryCode": "US",
            "country": "United States",
            "countryCodeISO3": "USA",
            "freeformAddress": "1600 Amphitheatre Parkway, Mountain View, CA 94043",
            "localName": "Mountain View"
          },
          "position": {
            "lat": 37.4221599,
            "lon": -122.0842744
          },
          "viewport": {
            "topLeftPoint": {
              "lat": 37.42325,
              "lon": -122.08565
            },
            "btmRightPoint": {
              "lat": 37.42107,
              "lon": -122.0829
            }
          },
          "entryPoints": [
            {
              "type": "main",
              "position": {
                "lat": 37.42313,
                "lon": -122.0849
              }
            },
            {
              "type": "minor",
              "position": {
                "lat": 37.42278,
                "lon": -122.08422
              }
            }
          ]
        }
      ]
    }
[19:20:03.852] DEBUG (12659): Service response
    service: "geocodio"
    status: "valid"
    address: {
      "street": "Amphitheatre Pkwy",
      "number": "1600",
      "city": "Mountain View",
      "state": "CA",
      "zip": "94043",
      "coordinates": [
        37.422601,
        -122.085065
      ]
    }
    hasRawResponse: true
[19:20:03.852] DEBUG (12659): Service raw response
    service: "geocodio"
    rawResponse: {
      "input": {
        "address_components": {
          "number": "1600",
          "street": "Amphitheatre",
          "suffix": "Pkwy",
          "formatted_street": "Amphitheatre Pkwy",
          "city": "Mountain View",
          "state": "CA",
          "country": "US"
        },
        "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA"
      },
      "results": [
        {
          "address_components": {
            "number": "1600",
            "street": "Amphitheatre",
            "suffix": "Pkwy",
            "formatted_street": "Amphitheatre Pkwy",
            "city": "Mountain View",
            "county": "Santa Clara County",
            "state": "CA",
            "zip": "94043",
            "country": "US"
          },
          "address_lines": [
            "1600 Amphitheatre Pkwy",
            "",
            "Mountain View, CA 94043"
          ],
          "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
          "location": {
            "lat": 37.422601,
            "lng": -122.085065
          },
          "accuracy": 1,
          "accuracy_type": "rooftop",
          "source": "City of Mountain View"
        }
      ]
    }
[19:20:03.853] DEBUG (12659): Filtered valid results
    validCount: 3
    totalCount: 3
[19:20:03.853] DEBUG (12659): Scored results
    scores: [
      {
        "service": "google",
        "score": 180,
        "status": "valid"
      },
      {
        "service": "geocodio",
        "score": 175,
        "status": "valid"
      },
      {
        "service": "azure",
        "score": 127,
        "status": "corrected"
      }
    ]
[19:20:03.853] DEBUG (12659): Best result selected
    service: "google"
    score: 180
[19:20:03.853] DEBUG (12659): Addresses after deduplication
    uniqueCount: 2
[19:20:03.853] DEBUG (12659): Validation complete
    result: {
      "address": {
        "street": "Amphitheatre Parkway",
        "number": "1600",
        "city": "Mountain View",
        "state": "CA",
        "zip": "94043",
        "coordinates": [
          37.4216724,
          -122.0856444
        ]
      },
      "status": "valid",
      "alt": [
        {
          "street": "Amphitheatre Parkway",
          "number": "1600",
          "city": "Mountain View",
          "state": "CA",
          "zip": "94043",
          "coordinates": [
            37.4216724,
            -122.0856444
          ],
          "service": "google"
        },
        {
          "street": "Amphitheatre Pkwy",
          "number": "1600",
          "city": "Mountain View",
          "state": "CA",
          "zip": "94043",
          "coordinates": [
            37.422601,
            -122.085065
          ],
          "service": "geocodio"
        }
      ]
    }
[19:20:03.856] INFO (12659): request completed
    reqId: "req-1"
    res: {
      "statusCode": 200
    }
    responseTime: 1045.451820999384
```
