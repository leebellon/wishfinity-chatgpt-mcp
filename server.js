import express from "express";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const server = new McpServer({
  name: "wishfinity-plusw",
  version: "0.1.0",
});

const UrlSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
});

server.tool(
  "get_wishfinity_save_link",
  "Generate a Wishfinity +W save link for a product URL. The user will click the link to open Wishfinity in their browser, sign in if needed, and confirm the item is saved.",
  UrlSchema.shape,
  async ({ url }) => {
    const actionUrl =
      "https://wishfinity.com/add?url=" +
      encodeURIComponent(url) +
      "&source=chatgpt";

    return {
      content: [
        {
          type: "text",
          text:
            `Save in Wishfinity: ${actionUrl}\n\n` +
            `This opens in your browser. If you're not signed in, Wishfinity will prompt you to sign in and then save the item.`,
        },
      ],
    };
  }
);

// Health check
app.get("/", (_req, res) => {
  res.status(200).send("Wishfinity MCP server is running.");
});

// IMPORTANT: some clients do a GET probe to validate the endpoint.
// Return 200 so the connector creation doesn't fail on a GET check.
app.get("/mcp", (_req, res) => {
  res.status(200).send("MCP endpoint ready. Use POST for MCP requests.");
});

// Streamable HTTP MCP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport(req, res);
  await server.connect(transport);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP Streamable HTTP server listening on port ${port}`);
});
