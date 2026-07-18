import { describe, expect, it, vi } from "vitest";

import { CompaniesHouseClient } from "../src/companies-house.js";
import {
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  UpstreamError,
} from "../src/errors.js";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("CompaniesHouseClient", () => {
  it("sends HTTP Basic auth with the API key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [] }));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    await client.searchCompanies("acme");

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0]!;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe(
      "Basic " + Buffer.from("test-key:").toString("base64"),
    );
  });

  it("caches identical requests", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ company_name: "MORRIS AI LTD" }));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });

    await client.getCompanyProfile("12345678");
    await client.getCompanyProfile("12345678");

    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("throws NotFoundError on 404", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    await expect(client.getCompanyProfile("99999999")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws UnauthorizedError on 401", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad key", { status: 401 }));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    await expect(client.searchCompanies("acme")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws RateLimitedError on 429", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("slow down", { status: 429, headers: { "retry-after": "42" } }),
    );
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    const err = await client.searchCompanies("acme").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect((err as RateLimitedError).retryAfterSeconds).toBe(42);
  });

  it("throws UpstreamError on 500", async () => {
    const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    await expect(client.searchCompanies("acme")).rejects.toBeInstanceOf(UpstreamError);
  });

  it("rejects malformed company numbers before hitting the network", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    const client = new CompaniesHouseClient({ apiKey: "test-key", fetchImpl });
    await expect(client.getCompanyProfile("../etc/passwd")).rejects.toThrow(/invalid company number/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires an API key", () => {
    expect(() => new CompaniesHouseClient({ apiKey: "" })).toThrow();
  });
});
