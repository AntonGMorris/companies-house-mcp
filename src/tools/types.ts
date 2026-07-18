import type { ZodRawShape } from "zod";

import type { CompaniesHouseClient } from "../companies-house.js";

export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  handle: (input: Record<string, unknown>, client: CompaniesHouseClient) => Promise<unknown>;
}
