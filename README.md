# Wishfinity ChatGPT App (MCP)

This repository contains Wishfinity’s Model Context Protocol (MCP) server for enabling a “Save for later / bookmark” workflow inside ChatGPT.

The app allows ChatGPT to generate a Wishfinity save link for any product URL, enabling users to bookmark items they discover in chat and save them to Wishfinity via a browser handoff.

---

## Status

- MCP server built and production-verified
- SSE transport working (/sse + /messages)
- App currently in DEV mode in ChatGPT
- Awaiting OpenAI support for MCP app publishing / discoverability

Full architecture, intent rules, and platform constraints are documented in CLAUDE.md.

---

## What this app does

- Registers an MCP tool: get_wishfinity_save_link
- Accepts a product URL
- Returns a Wishfinity link in this format:

  https://wishfinity.com/add?url=<ENCODED_URL>&source=chatgpt

- User clicks the link, Wishfinity handles sign-in if needed, and the item is saved

Phase 1A design is intentional:
- No credentials handled by ChatGPT
- No OAuth/token exchange
- Pure browser handoff

---

## Live deployment

Primary URL (Render):
- https://wishfinity-chatgpt-mcp.onrender.com

---

## Production checks

1) Open SSE stream

curl -i https://wishfinity-chatgpt-mcp.onrender.com/sse

Expected:
- HTTP 200
- Content-Type includes text/event-stream
- event: endpoint with /messages?sessionId=...

2) List MCP tools

curl -i -X POST "https://wishfinity-chatgpt-mcp.onrender.com/messages?sessionId=<SESSION_ID>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

Expected:
- HTTP 202
- SSE event: message containing tool metadata

---

## Local development

npm install
node server.js

Local test:
curl -i http://localhost:3000/sse

---

## Key constraints (do not break)

- Never apply express.json() to /messages
- SSEServerTransport requires the raw request stream
- Tool responses are delivered over SSE, not the POST response body

