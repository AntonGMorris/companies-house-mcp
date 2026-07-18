# companies-house-mcp

[![CI](https://github.com/AntonGMorris/companies-house-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/AntonGMorris/companies-house-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/protocol-MCP-8A2BE2.svg)](https://modelcontextprotocol.io)

**Production-grade [Model Context Protocol](https://modelcontextprotocol.io) server for the UK [Companies House](https://developer.company-information.service.gov.uk/) API.**

Point any MCP-aware assistant (Claude Desktop, Claude Code, Cursor, custom agents) at UK company data. Auth, rate limiting, in-memory caching, structured errors, and a real test suite included — not a tutorial demo.

> **Status: alpha (v0.1).** Five core tools shipped. Free filing-history documents, resumable-filings, and disqualified-officers lookups on the roadmap.

---

## Why this exists

The [official MCP reference servers](https://github.com/modelcontextprotocol/servers) are explicitly educational. They ship without auth, rate limiting, caching, or tests — deliberately, so learners can read them in an afternoon. Every serious team building on MCP ends up re-implementing the same production concerns from scratch.

This is one of them, done properly, against a UK data source that accountants, KYC/AML teams, sales-ops, and journalists genuinely use every day.

## Tools exposed

| Tool | Description |
|---|---|
| `search_companies` | Free-text search across all registered UK companies. |
| `get_company_profile` | Full profile for a company by number (name, status, address, SIC codes, dates, accounts). |
| `list_officers` | Directors, secretaries, and LLP members for a company. |
| `list_filings` | Filing history (annual accounts, confirmation statements, appointments, resolutions). |
| `get_psc` | Persons with significant control (25%+ ownership, voting rights, etc.). |

Every tool returns structured JSON — the client model doesn't have to parse HTML or free-form text.

## Install & configure

Requires Node.js 20+ and a free Companies House API key from [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/).

### Claude Desktop

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "npx",
      "args": ["-y", "github:AntonGMorris/companies-house-mcp"],
      "env": {
        "CH_API_KEY": "your-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. Ask it: *"Look up MORRIS AI LTD on Companies House and tell me who the directors are."*

### Claude Code

```bash
claude mcp add companies-house npx -y github:AntonGMorris/companies-house-mcp -- --env CH_API_KEY=your-key-here
```

### Local dev

```bash
git clone https://github.com/AntonGMorris/companies-house-mcp
cd companies-house-mcp
npm install
cp .env.example .env    # add your API key
npm run build
npm start
```

### Docker

```bash
docker build -t companies-house-mcp .
docker run --rm -i -e CH_API_KEY=your-key-here companies-house-mcp
```

## Try it in the browser (MCP Inspector)

The fastest way to poke at the tools without wiring the server into Claude Desktop is the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — a web UI that connects to any MCP server and lets you call its tools with a form.

```bash
# put your key in .env first (or export CH_API_KEY=... in the shell)
npm run inspect
```

That builds the server, launches the Inspector in a local browser tab, and connects to the built server over stdio. You'll see the five tools listed on the left; click one, fill in the form on the right (`company_number: "12345678"` for `get_company_profile`, or `query: "morris"` for `search_companies`), hit **Run tool**, and the raw JSON response comes back below. Handy for verifying a tool works before you plug the server into Claude.

## Example — what the model sees

Ask a Claude Desktop connected to this server: *"look up Greggs plc"*. The tool-call chain and responses look like this:

```json
// call: search_companies({ query: "greggs" })
{
  "items": [
    { "company_number": "00502851", "title": "GREGGS PLC", "company_status": "active", "date_of_creation": "1951-05-25" },
    { "company_number": "12345678", "title": "GREGGS OF FAKENHAM LIMITED", "company_status": "active" }
  ]
}

// call: get_company_profile({ company_number: "00502851" })
{
  "company_name": "GREGGS PLC",
  "company_number": "00502851",
  "company_status": "active",
  "type": "plc",
  "date_of_creation": "1951-05-25",
  "registered_office_address": { "address_line_1": "Fernwood House", "locality": "Newcastle Upon Tyne", "postal_code": "NE1 4TZ" },
  "sic_codes": ["10710"]
}
```

Because responses are structured (not scraped HTML), the model can chain calls confidently — `search_companies` → pick the right hit → `list_officers` — without any glue code.

## Use the client directly (without the MCP server)

The HTTP client that backs the MCP tools is also exported as a plain library, so other Node projects can reuse the auth + rate-limiting + caching without running the server:

```ts
import { CompaniesHouseClient } from "@antonmorris/companies-house-mcp/client";

const client = new CompaniesHouseClient({ apiKey: process.env.CH_API_KEY! });

const profile = await client.getCompanyProfile("00000006");
const officers = await client.listOfficers("03017060");
```

Structured error types (`NotFoundError`, `UnauthorizedError`, `RateLimitedError`, `UpstreamError`) are exported alongside the client so you can `catch` typed. This is exactly how [`lead-qual-agent`](https://github.com/AntonGMorris/lead-qual-agent) consumes UK filings for enrichment — no duplicated auth code.

## Production concerns handled

**Auth.** Companies House uses HTTP Basic with the API key as the username. This server wraps that transparently — you only ever set `CH_API_KEY`.

**Rate limiting.** Companies House enforces 600 requests per 5-minute rolling window per API key. This server ships a token-bucket limiter tuned to match — requests over the budget queue and wait rather than being sent through and 429'd back. Configurable via `CH_RATE_LIMIT_MAX` and `CH_RATE_LIMIT_WINDOW_SECONDS`.

**Caching.** In-memory LRU with per-entry TTL (default 5 minutes). Company profiles rarely change intraday, so a cache dramatically cuts request count for repeated lookups. Configurable via `CH_CACHE_TTL_SECONDS` and `CH_CACHE_MAX_ENTRIES`.

**Structured errors.** Every failure surfaces as a typed error class the model can reason about — `NotFoundError`, `UnauthorizedError`, `RateLimitedError`, `UpstreamError` — instead of a generic 500.

**Tests.** Vitest covers the rate limiter, cache eviction, and the HTTP client with mocked fetch. `npm test` runs the whole suite.

## Configuration reference

| Env var | Default | Purpose |
|---|---|---|
| `CH_API_KEY` | *(required)* | Companies House API key. |
| `CH_RATE_LIMIT_MAX` | `600` | Max requests per window. |
| `CH_RATE_LIMIT_WINDOW_SECONDS` | `300` | Rolling window in seconds. |
| `CH_CACHE_TTL_SECONDS` | `300` | Cache entry TTL. |
| `CH_CACHE_MAX_ENTRIES` | `1000` | Max cache size before LRU eviction. |

## Roadmap

- **v0.2** — `get_filing_document` (fetches the PDF or iXBRL underlying a filing).
- **v0.3** — `disqualified_officers` search + `officer_appointments` (all companies a person is an officer of).
- **v0.4** — Streamable HTTP transport for remote/hosted deployments.
- **v0.5** — Optional Redis-backed cache + rate limiter for multi-instance deployments.

## Honest caveats

- The Companies House API returns data as filed — occasionally with typos, inconsistent capitalisation, or delays of days between filing and appearing. This server does not clean or reconcile any of that.
- Rate-limit budgeting is per-API-key. If you share a key across multiple instances of this server, they will not coordinate — colocate to one instance or supply a distributed limiter in v0.5.
- Not affiliated with or endorsed by Companies House.

## Part of the AI-governance stack

This repo is one of five that ship together as a coherent AI-governance stack. Each is standalone; they compose.

| Repo | What it is |
|---|---|
| [`companies-house-mcp`](https://github.com/AntonGMorris/companies-house-mcp) | **You are here.** Production-grade MCP server for the UK Companies House API. |
| [`prompt-injection-lab`](https://github.com/AntonGMorris/prompt-injection-lab) | Automated red-team suite. Fires known injection payloads at any AI endpoint. |
| [`hitl-review`](https://github.com/AntonGMorris/hitl-review) | Drop-in human-in-the-loop review queue. |
| [`audit-log-llm`](https://github.com/AntonGMorris/audit-log-llm) | GDPR-friendly structured audit logging for LLM calls. |
| [`lead-qual-agent`](https://github.com/AntonGMorris/lead-qual-agent) | Example agent that composes all of the above. |

Built and maintained by [Anton Morris](https://antonmorris.co.uk).

## License

MIT. See `LICENSE`.
