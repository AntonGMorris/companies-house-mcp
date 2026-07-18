export class CompaniesHouseError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly upstreamBody?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends CompaniesHouseError {
  constructor(message = "resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends CompaniesHouseError {
  constructor(message = "unauthorized — check CH_API_KEY") {
    super(message, 401);
  }
}

export class RateLimitedError extends CompaniesHouseError {
  constructor(
    message = "Companies House rate limit exceeded",
    readonly retryAfterSeconds?: number,
  ) {
    super(message, 429);
  }
}

export class UpstreamError extends CompaniesHouseError {}
