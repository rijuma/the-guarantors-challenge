# TheGuarantors Code challenge

> Dev: Juan Marcos Rigoli ([@rijuma](https://github.com/rijuma))

**DeepWiki Analysis**: https://deepwiki.com/rijuma/the-guarantors-challenge

## Challenge instructions

Your task is to design and implement a backend API that validates and standardizes property addresses. The API should expose a single endpoint (ie POST /validate-address) that accepts a property address in free-form text and returns a structured, validated version of the address, including street, number, city, state, zip code. The service can restrict its output for US addresses only. Your solution should handle edge cases (ie partial addresses, typos, etc) gracefully and indicate whether the address is valid, corrected or unverifiable.

Include a short README explaining your thought process, any tools used (including AI prompts if available), and how to run your solution locally. You can choose one of the following programming languages: Python, Java, Javascript, C#, Golang, Kotlin, Typescript, Rust, or PHP. You are encouraged to to use AI assistants and mention how you used them. We are more interested in your ability to design thoughtful APIs, integrate with external systems, and communicate trade-offs than in writing everything from scratch. Clean code, clear error handling, and an easy-to-follow structure is key.

Also, please share a publicly-accessible git repository that can be cloned by our team.

## Challenge considerations

Based on the above instructions, I've chosen the following requirements:

- Framework: [Fastify](https://fastify.dev/) (Node.js + TypeScript)
- AI Assistants: ChatGPT 5.1 for investigation. Claude as a coding assistant.

The API should have an abstraction that allows "connectors" to different API services based on some flag, probably a list with comma separated services through an environment variable. The API will asynchronously search in all these services and based on some criteria will return a suggested final address and a list with alternative options that could be used by the API consumer if the address is too vague, for a better User Experience.

The API will be simple, no database, with a rate limit based on IP. Since the requirement is to expose a single endpoint, account handling will not be required. A simple API token will be provided by an env variable and needs to match a X-Token header included on every request.

The API will have a 10 minute cache based on the provided input and will implement a request coalescing for multiple concurrent similar requests.

## First discovery

For a first discovery I've used the following prompt on ChatGPT 5.1 Deep Research (see [full chat](https://chatgpt.com/share/69375fcc-763c-8012-aa0f-eb133077b5ad))

> I want to implement a backend API that validates and standardizes property addresses. The API should expose a single endpoint (ie POST /validate-address) that accepts a property address in free-form text and returns a structured, validated version of the address, including street, number, city, state, zip code. The service can restrict its output for US addresses only. Your solution should handle edge cases (ie partial addresses, typos, etc) gracefully and indicate whether the address is valid, corrected or unverifiable. I'm thinking about using Google Maps API to search for locations matching the free form text provided by the user. If a single marker is returned, it can be taken as the best option, and if multiple places are returned, I'd like to have suggestions for a criteria to select the best suitable option. Do consider some additional services to use, list advantages and disadvantages and have a few best alternatives regardless of paid services or free services to consider on the final project and a few free options or with suitable free tiers for a POC.

To see a breakdown on the development process, from the first discovery docs through the implementation, please check at the [docs folder](docs/index.md).

## Live Demo

Just to have an easy way to test it, the API is currently hosted at: https://address-validator.rigoli.dev

You can access swagger through: https://address-validator.rigoli.dev/docs

In order to use it, please click on Authorize and provide the **x-token** that will be sent through email and/or by the challenge submission, or send an `x-header` in the request headers to authorize the request.

This will be taken down once the review period is over.

## Implementation

### Multi-Service Architecture

The API implements a service orchestration layer that supports multiple geocoding services running in parallel:

#### Supported Services

- **Google Maps Geocoding API**: High accuracy geocoding service with excellent typo tolerance
- **Azure Maps Search API**: High accuracy geocoding with TomTom data and strong typo tolerance
- **Geocodio**: Cost-effective geocoding service with generous free tier

#### Configuration

Services are configured via the `GEO_SERVICES` environment variable as a comma-separated list:

```bash
# Use only Google Maps
GEO_SERVICES=google

# Use only Geocodio
GEO_SERVICES=geocodio

# Use only Azure Maps
GEO_SERVICES=azure

# Use multiple services (recommended for best accuracy)
GEO_SERVICES=google,geocodio,azure
```

Each service requires its corresponding API key:

- `GOOGLE_MAPS_API_KEY` - Required when `google` is enabled
- `GEOCODIO_API_KEY` - Required when `geocodio` is enabled
- `AZURE_MAPS_API_KEY` - Required when `azure` is enabled

### Key Features

#### Request Coalescing

Duplicate concurrent requests for the same address are automatically coalesced into a single operation, preventing unnecessary API calls and improving efficiency.

#### Parallel Service Execution

When multiple services are configured, they are called asynchronously in parallel to minimize response time.

#### Accuracy-Based Selection

The orchestrator scores each result based on multiple criteria:

- Validation status (valid > corrected > unverifiable)
- Address completeness (presence of street number, coordinates, etc.)
- Service-specific reliability scores
- The best result is returned as the primary response

#### Alternative Addresses

When multiple services return different addresses, the `alt` array is included in the response with:

- All unique addresses ordered by accuracy score
- A `service` field identifying the source of each address
- Only included when there are multiple distinct addresses

#### Response Examples

Single address (all services agree):

```json
{
  "address": {
    "street": "Amphitheatre Pkwy",
    "number": "1600",
    "city": "Mountain View",
    "state": "CA",
    "zip": "94043",
    "coordinates": [37.4224764, -122.0842499]
  },
  "status": "valid"
}
```

Multiple addresses (services disagree):

```json
{
  "address": {
    "street": "Main St",
    "number": "123",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "coordinates": [39.7817, -89.6501]
  },
  "status": "valid",
  "alt": [
    {
      "street": "Main St",
      "number": "123",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "coordinates": [39.7817, -89.6501],
      "service": "google"
    },
    {
      "street": "Main Ave",
      "number": "123",
      "city": "Springfield",
      "state": "IL",
      "zip": "62701",
      "coordinates": [39.7818, -89.6502],
      "service": "geocodio"
    }
  ]
}
```

### Extensibility

The architecture is designed for easy extension to additional geocoding services:

1. Create a new service class extending `AddressService`
2. Implement the `validate()` and `parseResponse()` methods
3. Add the service name to `SUPPORTED_GEO_SERVICES` in `src/config/env.ts`
4. Update the factory in `src/services/orchestrator.ts`

### Environment Variables

Copy `.env.example` as `.env` and update its configuration options.

### Logging

The application automatically adjusts log levels based on the `NODE_ENV` environment variable:

- **Development** (`NODE_ENV=development`): Debug-level logs are enabled, showing detailed information about:

  - Which services are being called
  - Raw responses from each service
  - Accuracy scores for each result
  - Deduplication process
  - Final selected result

- **Production** (`NODE_ENV=production`): Only info-level and above logs are shown

Example debug output in development (structured JSON logs):

```json
{"level":20,"msg":"Starting address validation","address":"1600 Amphitheatre Parkway, Mountain View, CA","services":["google","geocodio","azure"]}
{"level":20,"msg":"Calling service","service":"google"}
{"level":20,"msg":"Service response","service":"google","status":"valid","address":{...},"hasRawResponse":true}
{"level":20,"msg":"Service raw response","service":"google","rawResponse":{...}}
{"level":20,"msg":"Calling service","service":"geocodio"}
{"level":20,"msg":"Service response","service":"geocodio","status":"valid","address":{...}}
{"level":20,"msg":"Calling service","service":"azure"}
{"level":20,"msg":"Service response","service":"azure","status":"valid","address":{...}}
{"level":20,"msg":"Filtered valid results","validCount":3,"totalCount":3}
{"level":20,"msg":"Scored results","scores":[{"service":"google","score":170,"status":"valid"},{"service":"azure","score":167,"status":"valid"},{"service":"geocodio","score":165,"status":"valid"}]}
{"level":20,"msg":"Best result selected","service":"google","score":170}
{"level":20,"msg":"Addresses after deduplication","uniqueCount":1}
{"level":20,"msg":"Validation complete","result":{...}}
```

You can see a full example logs for an address search on all three services [here](docs/example-logs.md).

**Note**: Logs use Fastify's built-in logger (pino). The `dev` and `start:dev` scripts automatically use `pino-pretty` for human-readable output. Production (`start`) uses structured JSON logs for better parsing and analysis.

## Running the Application

### Development

```bash
pnpm install
pnpm dev          # Start dev server with hot reload
```

### Production

```bash
pnpm build        # Bundle with tsup (creates optimized dist/index.js)
pnpm start        # Run bundled production build
```

### Testing

```bash
# Run tests
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Type checking only
pnpm typecheck
```

### Alternative Commands

```bash
pnpm start:dev    # Run TypeScript directly with tsx (no build needed)
```

### Development process

To see a breakdown on the development process, from the first discovery docs through the implementation, please check at the [docs folder](docs/index.md).

### Architecture

- **Development**: Uses `tsx` for fast iteration with hot reload
- **Production**: Uses `tsup` to create a single bundled ESM file
- **Type Checking**: Uses TypeScript compiler for validation
- **Testing**: Uses Vitest with native TypeScript support

## API Documentation

Once the server is running, API documentation is available at:

- Swagger UI: `http://localhost:3000/docs`

> [!NOTE]
> Please ignore files ´Dockerfile´ and ´compose.yml´. Those are not part of the project, and are only used to make this project available for testing by hosting it on a private server.
