# Wishfinity ChatGPT App (MCP) — Project Context (Phase 1A)

## Summary
This repository contains a production-ready MCP (Model Context Protocol) server that enables ChatGPT to generate a Wishfinity “Save for later” link for any product URL. The app is built for a “bookmark / wishlist” intent: users often discover products in chat but are not ready to buy immediately.

## Current status
- MCP server and tool are built, deployed, and verified.
- The app works in ChatGPT “DEV” mode but is not publicly discoverable in the ChatGPT App Store.
- There is currently no “Publish / Submit for review” option for our MCP app in ChatGPT UI, so we are in a holding pattern until OpenAI opens publishing/distribution for MCP apps.
- Wishfinity already has a published Custom GPT for user-facing distribution while MCP publishing is unavailable.

## Goal UX
When users say:
- “bookmark this”
- “save for later”
- “add to my wishlist”
- “save this wish”
- “save #2”
ChatGPT should call our MCP tool and return a Wishfinity save link.

Important behavior rules:
- Do NOT ask the user for Wishfinity email/username/password.
- If a valid product URL is provided, generate the save link immediately.
- If the user references an item number (e.g., “save #2”) and we don’t have the URL, ask for the URL.

## What we built (Phase 1A: pure link-out)
### Tool
Tool name:
- get_wishfinity_save_link

Input:
- { url: "https://..." }

Output:
- A text response containing a link:
  https://wishfinity.com/add?url=<ENCODED_PRODUCT_URL>&source=chatgpt

### Authentication model
Browser handoff:
- User clicks the returned Wishfinity link.
- Wishfinity opens in the user’s browser.
- If not logged in, Wishfinity prompts sign-in (Magic link, Google, Apple, Facebook).
- After login, Wishfinity saves the item.

No OAuth/token exchange with OpenAI in Phase 1A.

## Local architecture

### Verified MCP SSE flow (confirmed)
1) ChatGPT connects to `GET /sse`.
2) Server creates `new SSEServerTransport("/messages", res)`, stores it by `sessionId`, and calls `server.connect(transport)`.
3) Server responds on the **same HTTP response** (`res`) as an SSE stream, emitting an `event: endpoint` with `/messages?sessionId=...`.
4) ChatGPT sends JSON-RPC to `POST /messages?sessionId=...`.
5) Server routes to the correct transport and calls `transport.handlePostMessage(req, res)`.
6) The POST returns **HTTP 202**, while the tool results are delivered as SSE `event: message` payloads on the open `/sse` stream.
7) On SSE close, the server deletes that `sessionId` from the Map.

Critical constraint: never apply `express.json()` to `/messages` (or any body-parsing middleware that consumes the raw stream), or you will hit `stream is not readable`.

### Components

- Node.js + Express server
- MCP server using @modelcontextprotocol/sdk
- SSE transport:
  - GET /sse opens SSE stream
  - POST /messages receives MCP JSON-RPC messages


## Hosting / infrastructure
- Deployed as a long-lived Render Web Service.
- Service must support long-running SSE connections.

Known-good checks (production):
1) SSE:
   curl -i https://wishfinity-chatgpt-mcp.onrender.com/sse
   Expect: HTTP 200, Content-Type: text/event-stream, and an endpoint event with /messages?sessionId=...

2) tools/list:
   curl -i -X POST "https://wishfinity-chatgpt-mcp.onrender.com/messages?sessionId=<SESSION_ID>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   Expect: HTTP 202 and an SSE message containing tool metadata.

## Repo files
- server.js: Express + MCP SSE server + tool definition(s)
- package.json / package-lock.json: deps and lockfile

## Future ideas (when OpenAI enables MCP publishing)
- Add URL normalization (strip Amazon tracking params) before generating Wishfinity link
- Add support for saving multiple items from a numbered list (“save #2 and #4”)
- Add a /health endpoint returning version and status
- Refine tool output to be short and CTA-like

