import { getCompanyProfile } from "./get-company-profile.js";
import { getPsc } from "./get-psc.js";
import { listFilings } from "./list-filings.js";
import { listOfficers } from "./list-officers.js";
import { searchCompanies } from "./search-companies.js";
import type { ToolDefinition } from "./types.js";

export const ALL_TOOLS: ToolDefinition[] = [
  searchCompanies,
  getCompanyProfile,
  listOfficers,
  listFilings,
  getPsc,
];

export type { ToolDefinition };
