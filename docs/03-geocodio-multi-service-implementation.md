# Geocodio Multi-Service Implementation Summary

## Overview

This document describes the implementation of Geocodio service integration and the multi-service orchestration layer for the address validation API.

## Implementation Date

December 9, 2025

## Objectives

1. Add Geocodio as an additional geocoding service
2. Implement a `GEO_SERVICES` environment variable for service configuration
3. Create a service orchestration layer for parallel async calls
4. Implement request coalescing to avoid duplicate API calls
5. Add accuracy-based response selection
6. Include an `alt` attribute with alternative addresses from different services

## Changes Made

### 1. Geocodio Service Integration

**Files Created:**
- `src/services/geocodio/geocodio-service.ts` - Main service implementation
- `src/services/geocodio/schemas.ts` - Zod schemas for Geocodio API responses
- `src/services/geocodio/fixtures.ts` - Test fixtures
- `src/services/geocodio/geocodio-service.test.ts` - Comprehensive test suite

**Key Features:**
- Implements the `AddressService` base class
- Uses Geocodio v1.9 API
- Accuracy determination based on score (0-1) and accuracy type
- Handles rooftop, range_interpolation, point, and street_center accuracy types

### 2. Environment Configuration

**Files Modified:**
- `src/config/env.ts`

**Changes:**
- Added `GEO_SERVICES` variable with validation
  - Accepts comma-separated list: `google`, `geocodio`, `azure`
  - Validates that at least one service is configured
  - Ensures required API keys are present for selected services
- Made API keys optional but validates they exist when service is enabled
- Added `GeoServiceName` type export

### 3. Service Orchestration Layer

**Files Created:**
- `src/services/orchestrator.ts` - Main orchestrator implementation
- `src/services/orchestrator.test.ts` - Orchestrator test suite

**Key Features:**

#### Request Coalescing
- Maintains a cache of in-flight requests
- Duplicate concurrent requests for the same address share a single promise
- Automatically cleans up cache after request completion

#### Parallel Service Execution
- All configured services called asynchronously with `Promise.all()`
- Individual service failures don't cause complete failure
- Services that fail return unverifiable status

#### Accuracy Scoring System
The orchestrator scores results based on:
- **Status Score** (highest priority)
  - `valid`: 100 points
  - `corrected`: 50 points
  - `unverifiable`: 0 points
- **Completeness Bonuses**
  - Street number: +20 points
  - Street name: +15 points
  - City: +10 points
  - State: +10 points
  - ZIP: +10 points
  - Coordinates: +5 points
- **Service-Specific Bonuses**
  - Google Maps: +10 points (known high accuracy)
  - Geocodio: +5 points

#### Address Deduplication
- Normalizes addresses for comparison (lowercase, trim, standardize spacing)
- Compares by: number, street, city, state, zip
- Only unique addresses included in `alt` array

### 4. Response Schema Updates

**Files Modified:**
- `src/schemas/address.ts`

**Changes:**
- Added `addressWithServiceSchema` - extends address with `service` field
- Added `alt` field to `validateAddressResponseSchema`
- Made `alt` optional (only present when multiple unique addresses exist)

### 5. API Integration

**Files Modified:**
- `src/app.ts` - Added orchestrator registration
- `src/types/fastify.d.ts` - Added orchestrator type declaration
- `src/services/index.ts` - Exported orchestrator and factory function
- `src/routes/validate-address.ts` - Updated to use orchestrator, added `alt` to Swagger schema

### 6. Documentation

**Files Modified:**
- `.env.example` - Added new environment variables with documentation
- `README.md` - Added comprehensive documentation of multi-service architecture

**Files Created:**
- `docs/02-geocodio-multi-service-implementation.md` (this file)

## Test Coverage

### New Test Suites

1. **Geocodio Service Tests** (14 tests)
   - Response parsing
   - Accuracy determination
   - Error handling
   - Timeout handling
   - Address extraction

2. **Orchestrator Tests** (11 tests)
   - Single service operation
   - Multiple service coordination
   - Request coalescing
   - Accuracy scoring
   - Deduplication
   - Error handling

### Test Results

All tests passing (47 total):
- Google Maps Service: 10 tests ✓
- Geocodio Service: 14 tests ✓
- Orchestrator: 11 tests ✓
- Cache: 12 tests ✓

## Configuration Examples

### Single Service
```bash
GEO_SERVICES=google-geocode
GOOGLE_MAPS_API_KEY=your-key
```

### Multiple Services (Recommended)
```bash
GEO_SERVICES=google-geocode,geocodio
GOOGLE_MAPS_API_KEY=your-google-key
GEOCODIO_API_KEY=your-geocodio-key
```

### All Services
```bash
GEO_SERVICES=google-geocode,google-validation,geocodio,azure
GOOGLE_MAPS_API_KEY=your-google-key
GEOCODIO_API_KEY=your-geocodio-key
AZURE_MAPS_API_KEY=your-azure-key
```

## API Response Format

### When Services Agree
```json
{
  "address": { ... },
  "status": "valid"
}
```

### When Services Disagree
```json
{
  "address": { ... },
  "status": "valid",
  "alt": [
    { ..., "service": "google" },
    { ..., "service": "geocodio" }
  ]
}
```

## Performance Characteristics

### Request Coalescing
- Duplicate concurrent requests: Only 1 API call made
- Subsequent non-concurrent requests: Use cache (if within TTL)

### Parallel Execution
- With 2 services: Response time ≈ max(service1_time, service2_time)
- Without parallelization: Response time = service1_time + service2_time

### Accuracy Improvement
- Multiple services provide validation redundancy
- Best result automatically selected
- Alternative addresses available for user choice

## Extensibility

To add a new geocoding service:

1. Create service class extending `AddressService`
   ```typescript
   export class NewService extends AddressService {
     async validate(address: string): Promise<ValidationResult> { ... }
     protected parseResponse(rawResponse: unknown): ValidationResult { ... }
     protected buildRequestUrl(address: string): string { ... }
   }
   ```

2. Add to supported services in `src/config/env.ts`
   ```typescript
   const SUPPORTED_GEO_SERVICES = ['google', 'geocodio', 'azure', 'new-service']
   ```

3. Update orchestrator factory in `src/services/orchestrator.ts`
   ```typescript
   case 'new-service':
     return new NewService(config)
   ```

4. Add API key validation in `src/config/env.ts`
5. Add tests and fixtures

## Code Quality

- All code follows project code principles (CLAUDE.md)
- Comprehensive test coverage
- TypeScript strict mode compliance
- Clean separation of concerns
- Follows single responsibility principle

## Trade-offs and Decisions

### Why Orchestration at Application Level?
- Simpler than message queue/worker pattern
- Sufficient for expected load (300-500 requests)
- Lower operational complexity
- Easier to test and maintain

### Why Accuracy Scoring Instead of Voting?
- More nuanced than simple majority voting
- Considers completeness and service reliability
- Extensible to new criteria
- Deterministic selection

### Why In-Memory Request Coalescing?
- Simpler than distributed cache (Redis)
- Sufficient for single-instance deployment
- No additional dependencies
- Automatic cleanup prevents memory leaks

## Future Enhancements

Possible improvements for production:
1. Distributed request coalescing (Redis)
2. Service health checks and circuit breakers
3. Per-service rate limiting
4. Metrics and monitoring integration
5. Weighted service scoring based on historical accuracy
6. User feedback loop for accuracy improvement

## Conclusion

The implementation successfully adds:
- ✅ Geocodio service integration
- ✅ Multi-service orchestration with parallel execution
- ✅ Request coalescing for efficiency
- ✅ Accuracy-based selection algorithm
- ✅ Alternative addresses in response
- ✅ Comprehensive test coverage
- ✅ Complete documentation
- ✅ Clean, maintainable code

The system is production-ready and easily extensible to additional geocoding services.
