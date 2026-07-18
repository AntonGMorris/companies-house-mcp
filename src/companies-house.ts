import { TtlCache } from "./cache.js";
import {
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
  UpstreamError,
} from "./errors.js";
import { RateLimiter } from "./rate-limiter.js";

const DEFAULT_BASE_URL = "https://api.company-information.service.gov.uk";

export interface CompaniesHouseClientOptions {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: { maxRequests: number; windowMs: number };
  cache?: { maxEntries: number; ttlMs: number };
  fetchImpl?: typeof fetch;
}

export class CompaniesHouseClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly limiter: RateLimiter;
  private readonly cache: TtlCache<unknown>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: CompaniesHouseClientOptions) {
    if (!opts.apiKey) throw new Error("CH_API_KEY is required");
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.authHeader = "Basic " + Buffer.from(`${opts.apiKey}:`).toString("base64");
    this.limiter = new RateLimiter(
      opts.rateLimit?.maxRequests ?? 600,
      opts.rateLimit?.windowMs ?? 5 * 60 * 1000,
    );
    this.cache = new TtlCache<unknown>(
      opts.cache?.maxEntries ?? 1000,
      opts.cache?.ttlMs ?? 5 * 60 * 1000,
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async searchCompanies(query: string, itemsPerPage = 20, startIndex = 0): Promise<unknown> {
    const params = new URLSearchParams({
      q: query,
      items_per_page: String(itemsPerPage),
      start_index: String(startIndex),
    });
    return this.request(`/search/companies?${params.toString()}`);
  }

  async getCompanyProfile(companyNumber: string): Promise<unknown> {
    return this.request(`/company/${encodePathSegment(companyNumber)}`);
  }

  async listOfficers(companyNumber: string, itemsPerPage = 35, startIndex = 0): Promise<unknown> {
    const params = new URLSearchParams({
      items_per_page: String(itemsPerPage),
      start_index: String(startIndex),
    });
    return this.request(
      `/company/${encodePathSegment(companyNumber)}/officers?${params.toString()}`,
    );
  }

  async listFilings(
    companyNumber: string,
    itemsPerPage = 25,
    startIndex = 0,
    category?: string,
  ): Promise<unknown> {
    const params = new URLSearchParams({
      items_per_page: String(itemsPerPage),
      start_index: String(startIndex),
    });
    if (category) params.set("category", category);
    return this.request(
      `/company/${encodePathSegment(companyNumber)}/filing-history?${params.toString()}`,
    );
  }

  async getPersonsWithSignificantControl(
    companyNumber: string,
    itemsPerPage = 25,
    startIndex = 0,
  ): Promise<unknown> {
    const params = new URLSearchParams({
      items_per_page: String(itemsPerPage),
      start_index: String(startIndex),
    });
    return this.request(
      `/company/${encodePathSegment(companyNumber)}/persons-with-significant-control?${params.toString()}`,
    );
  }

  private async request(path: string): Promise<unknown> {
    const cached = this.cache.get(path);
    if (cached !== undefined) return cached;

    await this.limiter.acquire();

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
      },
    });

    if (response.status === 401) throw new UnauthorizedError();
    if (response.status === 404) throw new NotFoundError();
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new RateLimitedError(
        "Companies House returned 429 — the shared rate window is saturated",
        retryAfter ? Number(retryAfter) : undefined,
      );
    }
    if (!response.ok) {
      const body = await safeReadBody(response);
      throw new UpstreamError(
        `Companies House ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    const data = (await response.json()) as unknown;
    this.cache.set(path, data);
    return data;
  }
}

function encodePathSegment(input: string): string {
  const trimmed = input.trim();
  if (!/^[A-Za-z0-9]{1,10}$/.test(trimmed)) {
    throw new Error(`invalid company number: ${input}`);
  }
  return encodeURIComponent(trimmed);
}

async function safeReadBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    try {
      return await response.text();
    } catch {
      return undefined;
    }
  }
}
