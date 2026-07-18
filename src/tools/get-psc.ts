import { z } from "zod";

import type { CompaniesHouseClient } from "../companies-house.js";
import type { ToolDefinition } from "./types.js";

const shape = {
  company_number: z
    .string()
    .regex(/^[A-Za-z0-9]{1,10}$/)
    .describe("The company number."),
  items_per_page: z.number().int().min(1).max(100).optional(),
  start_index: z.number().int().min(0).optional(),
};

export const getPsc: ToolDefinition<typeof shape> = {
  name: "get_psc",
  title: "Get persons with significant control",
  description:
    "Persons with Significant Control (PSC) for a company — individuals or entities holding 25%+ shares, 25%+ voting rights, or the right to appoint/remove a majority of directors.",
  inputSchema: shape,
  handle: async (raw, client: CompaniesHouseClient) => {
    const input = z.object(shape).parse(raw);
    return client.getPersonsWithSignificantControl(
      input.company_number,
      input.items_per_page ?? 25,
      input.start_index ?? 0,
    );
  },
};
