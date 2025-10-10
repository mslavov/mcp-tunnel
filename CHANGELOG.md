# Changelog

All notable changes to this project will be documented in this file.

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
