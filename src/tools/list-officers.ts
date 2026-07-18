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

export const listOfficers: ToolDefinition<typeof shape> = {
  name: "list_officers",
  title: "List company officers",
  description:
    "Directors, secretaries, and LLP members for a company — active and resigned. Includes appointed and resigned dates, nationality, occupation, and role.",
  inputSchema: shape,
  handle: async (raw, client: CompaniesHouseClient) => {
    const input = z.object(shape).parse(raw);
    return client.listOfficers(
      input.company_number,
      input.items_per_page ?? 35,
      input.start_index ?? 0,
    );
  },
};
