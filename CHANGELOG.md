# Changelog

All notable changes to this project are documented here. Follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-07-18

### Added
- `companies-house-mcp/client` subpath export. `CompaniesHouseClient`, `RateLimiter`, `TtlCache`, and the four typed error classes are now importable directly for use outside the MCP server.
- `prepare` script so `npm install github:AntonGMorris/companies-house-mcp` auto-builds.
- "Use the client directly" section in the README with an example.

### Changed
- The MCP tool implementations continue to use the same client; no behavioural change for MCP consumers.

## [0.1.0] — 2026-07-18

### Added
- Five MCP tools: `search_companies`, `get_company_profile`, `list_officers`, `list_filings`, `get_psc`.
- HTTP Basic auth wrapped transparently.
- Sliding-window rate limiter tuned to Companies House's 600 req / 5 min per key.
- LRU + TTL cache with configurable size / TTL.
- Typed error classes (`NotFoundError`, `UnauthorizedError`, `RateLimitedError`, `UpstreamError`) surfaced to the MCP client.
- Company-number validation before any network call.
- Vitest suite (17 tests) covering rate limiter, cache eviction/TTL, and HTTP client with mocked fetch.
- `npm run inspect` script that launches the MCP Inspector against the built server.
- Multi-stage Dockerfile with a non-root runtime.
- GitHub Actions CI on Node 20 & 22.
