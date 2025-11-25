# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2025-11-25

### Fixed
- 🔧 **Wrapper interceptor response handling** - Fixed `@mswjs/interceptors` to use `controller.respondWith()` instead of return value, which was causing intercepted requests to fail
- 🗜️ **Content-encoding header handling** - Removed `content-encoding` header in worker responses since `fetch()` automatically decompresses bodies, preventing double-decompression errors
- 🔄 **Backwards compatibility** - Added `content-encoding` header removal in wrapper for compatibility with older workers

## [0.2.1] - 2025-10-10

### Added
- 📦 **Wrapper README** - Comprehensive README.md for npm package with installation and usage instructions

### Fixed
- 🐳 **Docker build** - Fixed worker Dockerfile to properly install TypeScript and build
  - Changed from `npm ci` to `npm install` (no package-lock in workspace packages)
  - Added TypeScript and @types/node to worker devDependencies
  - Made tsconfig.json standalone (removed dependency on root tsconfig)
  - Added `downlevelIteration` to fix iterator compilation issues

### Changed
- 📝 **Release process** - Updated CLAUDE.md with npm version immutability warnings and best practices

## [0.2.0] - 2025-10-10

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

## [0.1.0] - 2025-10-10

### Added

**Wrapper:**
- ✅ Basic HTTP request interception
- ✅ **Universal HTTP interceptor** using @mswjs/interceptors
- ✅ Supports **all** HTTP clients: fetch, axios, got, node-fetch, http/https
- ✅ MCP server process spawner with stdio forwarding
- ✅ Preload script for injecting tunnel into MCP server runtime
- ✅ Enhanced CLI with `--server` and `--test` modes
- ✅ Ably Pub/Sub integration
- ✅ Request/response correlation with UUIDs
- ✅ Automatic Ably reconnection with exponential backoff
- ✅ Concurrent request support (built into TunnelFetch)
- ✅ TypeScript with strict mode

**Worker:**
- ✅ HTTP request execution
- ✅ Host allow-list validation
- ✅ Request size limits (configurable, default 10MB)
- ✅ Rate limiting per tenant (default 100 req/min)
- ✅ Structured JSON logging
- ✅ Health check HTTP server on port 8080 (`/health`, `/ready`)
- ✅ Automatic Ably reconnection with exponential backoff
- ✅ Graceful shutdown handling
- ✅ Dockerfile for containerization
- ✅ Basic error handling

**Infrastructure:**
- ✅ Monorepo setup with npm workspaces
- ✅ TypeScript configuration
- ✅ ESLint + Prettier
- ✅ Docker Compose example
- ✅ Example test scripts
- ✅ Updated README and documentation
- ✅ MIT License
