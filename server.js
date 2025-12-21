import express from "express";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/**
 * Wishfinity ChatGPT App (Phase 1A) - SSE MCP server
 *
 * Endpoints:
 *   GET  /sse        -> opens SSE stream (ChatGPT connects here)
 *   POST /messages   -> receives MCP JSON-RPC messages
 *
 * IMPORTANT:
 * Do NOT use express.json() on /messages.
 * SSEServerTransport needs the raw request stream.
 */

const app = express();

// Only parse JSON for non-MCP routes
app.use((req, res, next) => {
  if (req.path === "/messages") return next();
  return express.json({ limit: "1mb" })(req, res, next);
});

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

// Keep active transports by sessionId
const transports = new Map();

app.get("/", (_req, res) => {
  res.status(200).send("Wishfinity MCP server is running.");
});

// SSE endpoint
app.get("/sse", async (_req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

// Messages endpoint (raw stream)
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).send("Missing sessionId");
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).send("Unknown sessionId");
  }

  await transport.handlePostMessage(req, res);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MCP SSE server listening on port ${port}`);
});
