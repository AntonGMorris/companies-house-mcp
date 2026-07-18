import { z } from "zod";

import type { CompaniesHouseClient } from "../companies-house.js";
import type { ToolDefinition } from "./types.js";

const shape = {
  query: z.string().min(1).describe("Free-text company name or partial name to search for."),
  items_per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page (max 100, default 20)."),
  start_index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based offset into the result set for pagination."),
};

export const searchCompanies: ToolDefinition<typeof shape> = {
  name: "search_companies",
  title: "Search companies",
  description:
    "Free-text search across UK registered companies. Returns a list of matching companies with company number, name, status, and address.",
  inputSchema: shape,
  handle: async (raw, client: CompaniesHouseClient) => {
    const input = z.object(shape).parse(raw);
    return client.searchCompanies(
      input.query,
      input.items_per_page ?? 20,
      input.start_index ?? 0,
    );
  },
};
