import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { CompaniesHouseClient } from "./companies-house.js";
import { CompaniesHouseError } from "./errors.js";
import { ALL_TOOLS } from "./tools/index.js";

export interface BuildServerOptions {
  client: CompaniesHouseClient;
  serverName?: string;
  serverVersion?: string;
}

export function buildServer(opts: BuildServerOptions): McpServer {
  const server = new McpServer({
    name: opts.serverName ?? "companies-house-mcp",
    version: opts.serverVersion ?? "0.1.0",
  });

  for (const tool of ALL_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (rawInput: Record<string, unknown>) => {
        try {
          const result = await tool.handle(rawInput, opts.client);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return errorToToolResult(err);
        }
      },
    );
  }

  return server;
}

function errorToToolResult(err: unknown): {
  isError: true;
  content: [{ type: "text"; text: string }];
} {
  if (err instanceof CompaniesHouseError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: err.name,
              message: err.message,
              statusCode: err.statusCode,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify({ error: "InternalError", message }, null, 2) }],
  };
}
