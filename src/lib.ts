/**
 * Library entrypoint — expose the HTTP client, error types, rate limiter, and
 * cache so other Node projects can reuse them without spinning up the MCP
 * server. Import via the `companies-house-mcp/client` subpath:
 *
 *   import { CompaniesHouseClient } from "companies-house-mcp/client";
 *
 * This is how `lead-qual-agent` (and any downstream project that needs raw
 * CH data inside its own process) consumes the same code that backs the MCP
 * tools — without duplicating auth, retry, or caching.
 */
export { CompaniesHouseClient, type CompaniesHouseClientOptions } from "./companies-house.js";
export {
  CompaniesHouseError,
  NotFoundError,
  UnauthorizedError,
  RateLimitedError,
  UpstreamError,
} from "./errors.js";
export { RateLimiter } from "./rate-limiter.js";
export { TtlCache } from "./cache.js";
