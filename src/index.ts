#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { CompaniesHouseClient } from "./companies-house.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const apiKey = process.env.CH_API_KEY;
  if (!apiKey) {
    console.error(
      "companies-house-mcp: CH_API_KEY is not set. Get a free key at " +
        "https://developer.company-information.service.gov.uk/ and set it in your MCP client config.",
    );
    process.exit(1);
  }

  const client = new CompaniesHouseClient({
    apiKey,
    rateLimit: envRateLimit(),
    cache: envCache(),
  });

  const server = buildServer({ client });
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log lifecycle events to stderr — MCP uses stdout for the protocol so stdout
  // must not be written to for any other reason.
  console.error("companies-house-mcp: connected on stdio");
}

function envRateLimit(): { maxRequests: number; windowMs: number } | undefined {
  const max = process.env.CH_RATE_LIMIT_MAX;
  const window = process.env.CH_RATE_LIMIT_WINDOW_SECONDS;
  if (!max && !window) return undefined;
  return {
    maxRequests: max ? Number(max) : 600,
    windowMs: (window ? Number(window) : 300) * 1000,
  };
}

function envCache(): { maxEntries: number; ttlMs: number } | undefined {
  const ttl = process.env.CH_CACHE_TTL_SECONDS;
  const max = process.env.CH_CACHE_MAX_ENTRIES;
  if (!ttl && !max) return undefined;
  return {
    maxEntries: max ? Number(max) : 1000,
    ttlMs: (ttl ? Number(ttl) : 300) * 1000,
  };
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error("companies-house-mcp: fatal:", message);
  process.exit(1);
});
