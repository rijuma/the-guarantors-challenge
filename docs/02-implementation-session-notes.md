# Implementation Session Notes

**Date:** 2025-12-09

## Session Summary

This document captures the implementation decisions and changes made during a development session focused on API documentation, security improvements, and code cleanup.

---

## 1. Swagger/OpenAPI Documentation

**Requirement:** Add interactive API documentation to the project.

**Implementation:**
- Installed `@fastify/swagger` and `@fastify/swagger-ui`
- Configured OpenAPI 3.1.0 specification in `src/app.ts`
- Added route schemas with request/response definitions and examples
- Swagger UI accessible at `/docs`

---

## 2. Public Documentation Access

**Requirement:** Make Swagger UI publicly accessible without authentication.

**Initial approach:** Added hardcoded path exceptions in the auth plugin.

**Refactored approach:** Converted global auth plugin to a per-route `preHandler` function. Routes that require authentication explicitly use `verifyAuth`, while public routes (like `/docs`) don't include it.

**Files changed:**
- `src/plugins/auth.ts` - Converted from Fastify plugin to exported `verifyAuth` function
- `src/routes/validate-address.ts` - Added `preHandler: verifyAuth` to route options
- `src/app.ts` - Removed global auth plugin registration

---

## 3. CORS Configuration

**Requirement:** Enable CORS to allow Swagger UI to make API requests, with configurable domain.

**Implementation:**
- Installed `@fastify/cors`
- Added `API_DOMAIN` environment variable (defaults to `http://localhost:3000`)
- CORS origin restricted to the configured domain
- Swagger server URL also uses `API_DOMAIN` for consistency

**Files changed:**
- `src/config/env.ts` - Added `API_DOMAIN` to schema
- `src/app.ts` - Registered CORS plugin with domain config
- `.env.example` - Added `API_DOMAIN` variable

---

## 4. Response Schema Cleanup

**Requirement:** Remove `originalInput` field from the API response.

**Implementation:**
- Removed field from Zod response schema
- Removed from OpenAPI route schema and examples
- Removed from route handler response object
- Updated test mocks

**Files changed:**
- `src/schemas/address.ts`
- `src/routes/validate-address.ts`
- `src/cache/address-cache.test.ts`

---

## Environment Variables Added

| Variable | Default | Description |
|----------|---------|-------------|
| `API_DOMAIN` | `http://localhost:3000` | Domain for CORS and Swagger server URL |

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@fastify/swagger` | ^9.6.1 | OpenAPI spec generation |
| `@fastify/swagger-ui` | ^5.2.3 | Swagger UI serving |
| `@fastify/cors` | ^11.1.0 | CORS support |

---

## API Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `POST /validate-address` | Yes (X-Token) | Validate and standardize US addresses |
| `GET /docs` | No | Swagger UI |
| `GET /docs/json` | No | OpenAPI spec (JSON) |
| `GET /docs/yaml` | No | OpenAPI spec (YAML) |
