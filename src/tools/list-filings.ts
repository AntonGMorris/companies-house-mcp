import { z } from "zod";

import type { CompaniesHouseClient } from "../companies-house.js";
import type { ToolDefinition } from "./types.js";

const shape = {
  company_number: z
    .string()
    .regex(/^[A-Za-z0-9]{1,10}$/)
    .describe("The company number."),
  category: z
    .string()
    .optional()
    .describe(
      "Optional filter by filing category: accounts, annual-return, capital, confirmation-statement, incorporation, officers, resolution, address, etc.",
    ),
  items_per_page: z.number().int().min(1).max(100).optional(),
  start_index: z.number().int().min(0).optional(),
};

export const listFilings: ToolDefinition<typeof shape> = {
  name: "list_filings",
  title: "List company filings",
  description:
    "Chronological filing history for a company. Includes accounts, confirmation statements, appointments, resolutions, address changes, and more.",
  inputSchema: shape,
  handle: async (raw, client: CompaniesHouseClient) => {
    const input = z.object(shape).parse(raw);
    return client.listFilings(
      input.company_number,
      input.items_per_page ?? 25,
      input.start_index ?? 0,
      input.category,
    );
  },
};
