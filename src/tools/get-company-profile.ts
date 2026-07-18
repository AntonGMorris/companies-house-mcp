import { z } from "zod";

import type { CompaniesHouseClient } from "../companies-house.js";
import type { ToolDefinition } from "./types.js";

const shape = {
  company_number: z
    .string()
    .regex(/^[A-Za-z0-9]{1,10}$/)
    .describe("The company number, e.g. '12345678' or 'SC012345' for Scottish companies."),
};

export const getCompanyProfile: ToolDefinition<typeof shape> = {
  name: "get_company_profile",
  title: "Get company profile",
  description:
    "Full profile for a company: registered name, status, type, incorporation date, registered office address, SIC codes, accounts and confirmation-statement dates, and previous names.",
  inputSchema: shape,
  handle: async (raw, client: CompaniesHouseClient) => {
    const input = z.object(shape).parse(raw);
    return client.getCompanyProfile(input.company_number);
  },
};
