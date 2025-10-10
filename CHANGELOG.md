# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- 🔍 **Debug logging system** - Optional file-based logging via `MCP_TUNNEL_DEBUG` environment variable
  - Logs to `.mcp-tunnel/wrapper.log` to avoid polluting stdio
  - Detailed initialization, request/response, and error logging
  - Does not impact MCP protocol communication
- 🚫 **Smart domain bypassing** - Automatically bypasses Ably domains to prevent intercepting tunnel's own connections
  - Bypassed domains: `realtime.ably.net`, `ably-realtime.com`, `ably.io`, `ably.com`
- 📖 **Slack MCP example** - Added `examples/slack-mcp-tunneled.json` showing real-world integration

### Changed
- ⚡ **Improved CLI spawn method** - Now uses `NODE_OPTIONS` instead of `--require` flag for better compatibility with different MCP server types
- 📝 **Enhanced preload logging** - Added comprehensive logging throughout the preload lifecycle when debug mode is enabled
- 🔇 **Silent by default** - Wrapper no longer logs to console unless debug mode is enabled

### Fixed
- 🔄 **Ably connection interception** - Prevented tunnel from intercepting its own Ably connections, which could cause loops

## [0.2.0] - 2025-10-10

### Added - Phase 3: MCP Integration & Robustness

**Wrapper:**
- ✅ **Universal HTTP interceptor** using @mswjs/interceptors
- ✅ Supports **all** HTTP clients: fetch, axios, got, node-fetch, http/https
- ✅ MCP server process spawner with stdio forwarding
- ✅ Preload script for injecting tunnel into MCP server runtime
- ✅ Enhanced CLI with `--server` and `--test` modes
- ✅ Automatic Ably reconnection with exponential backoff
- ✅ Concurrent request support (built into TunnelFetch)

**Worker:**
- ✅ Request size limits (configurable, default 10MB)
- ✅ Rate limiting per tenant (default 100 req/min)
- ✅ Structured JSON logging
- ✅ Health check HTTP server on port 8080 (`/health`, `/ready`)
- ✅ Automatic Ably reconnection with exponential backoff
- ✅ Graceful shutdown handling

**Infrastructure:**
- ✅ Updated README and docs with Phase 3 features
- ✅ Simplified configuration (removed redundant config file)

## [0.1.0] - 2025-10-10

### Added - Phase 1: Foundation

**Wrapper:**
- ✅ Basic HTTP request interception
- ✅ Ably Pub/Sub integration
- ✅ Request/response correlation with UUIDs
- ✅ TypeScript with strict mode

**Worker:**
- ✅ HTTP request execution
- ✅ Host allow-list validation
- ✅ Dockerfile for containerization
- ✅ Basic error handling

**Infrastructure:**
- ✅ Monorepo setup with npm workspaces
- ✅ TypeScript configuration
- ✅ ESLint + Prettier
- ✅ Docker Compose example
- ✅ Example test scripts
- ✅ MIT License
