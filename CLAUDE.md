# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Tunnel enables Model Context Protocol (MCP) servers to access internal APIs behind firewalls using Ably Pub/Sub. The system consists of two main packages:

1. **Wrapper** (`packages/wrapper/`) - npm package that wraps MCP servers and intercepts HTTP requests
2. **Worker** (`packages/worker/`) - Docker container that executes tunneled requests on private networks

## Architecture

### High-Level Flow
```
MCP Server → Wrapper (HTTP Interceptor) → Ably Pub/Sub → Worker → Internal API
                                            (Internet)
```

### Key Components

**Wrapper (packages/wrapper/):**
- **preload.ts** - Core injection script loaded via `NODE_OPTIONS=--require`. Uses `@mswjs/interceptors` to intercept ALL HTTP requests (fetch, axios, http/https modules)
- **tunnel-fetch.ts** - Publishes requests to Ably and waits for responses with UUID-based correlation
- **cli.ts** - CLI entry point that spawns MCP servers with the preload script injected
- **ably-client.ts** - Ably connection management with auto-reconnection
- **logger.ts** - File-based debug logging to `.mcp-tunnel/wrapper.log` (enabled via `MCP_TUNNEL_DEBUG=1`)

**Worker (packages/worker/):**
- **index.ts** - Main entry point that subscribes to Ably requests and orchestrates handling
- **request-handler.ts** - Executes HTTP requests with host allow-list validation
- **rate-limiter.ts** - Per-tenant rate limiting (default 100 req/min)
- **health-check.ts** - HTTP server on port 8080 with `/health` and `/ready` endpoints
- **ably-client.ts** - Worker-side Ably connection management

### Critical Design Patterns

1. **HTTP Interception Strategy**: Uses `@mswjs/interceptors` BatchInterceptor with both `ClientRequestInterceptor` (for http/https modules) and `FetchInterceptor` (for fetch API). This provides universal coverage for all Node.js HTTP clients.

2. **Domain Bypassing**: The wrapper automatically skips Ably domains (`realtime.ably.net`, `ably-realtime.com`, `ably.io`, `ably.com`) to prevent intercepting its own tunnel connections.

3. **Request/Response Correlation**: Each request gets a UUID. The wrapper publishes to `mcp-tunnel:<tenant_id>:requests` and subscribes to `mcp-tunnel:<tenant_id>:responses`, filtering by `requestId`.

4. **Multi-Tenancy**: Ably API keys are scoped with capabilities like `{"mcp-tunnel:<tenant_id>:*": ["publish", "subscribe"]}` to enforce tenant isolation.

5. **MCP Server Spawning**: The CLI spawns the MCP server using `NODE_OPTIONS` environment variable injection (not `--require` flag) for better compatibility: `NODE_OPTIONS=--require ${preloadScript}`.

## Development Commands

### Building
```bash
# Build all packages
npm run build

# Build specific package
cd packages/wrapper && npm run build
cd packages/worker && npm run build

# Watch mode for development
cd packages/wrapper && npm run dev
```

### Linting
```bash
# Lint all packages
npm run lint

# Lint specific package
cd packages/wrapper && npm run lint
```

### Testing Locally
```bash
# Terminal 1: Start worker
cd packages/worker
npm run build
ABLY_API_KEY=your-key TENANT_ID=test npm start

# Terminal 2: Test wrapper
cd packages/wrapper
npm run build
ABLY_API_KEY=your-key TENANT_ID=test node dist/cli.js --test https://httpbin.org/get
```

### Docker Development
```bash
# Build worker image
docker build -t mcp-tunnel-worker packages/worker/

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Debug Logging
```bash
# Enable wrapper debug logs
export MCP_TUNNEL_DEBUG=1
mcp-tunnel --server ./my-server.js

# View logs in real-time (separate terminal)
tail -f .mcp-tunnel/wrapper.log

# Worker logs (JSON format)
docker-compose logs -f | grep '"level":"error"'
```

## Important Implementation Details

### TypeScript Configuration
- Uses strict mode with no `any` types allowed (replace with `unknown[]` for rest parameters)
- Shared `tsconfig.base.json` extended by both packages
- All packages compile to `dist/` directory

### Environment Variables

**Wrapper:**
- `ABLY_API_KEY` (required) - Scoped Ably API key
- `TENANT_ID` (required) - Must match worker's tenant ID
- `TUNNEL_TIMEOUT` (optional) - Request timeout in ms (default: 30000)
- `MCP_TUNNEL_DEBUG` (optional) - Enable file-based debug logging

**Worker:**
- `ABLY_API_KEY` (required) - Scoped Ably API key
- `TENANT_ID` (required) - Must match wrapper's tenant ID
- `ALLOWED_HOSTS` (optional) - Comma-separated list, supports wildcards (`*.example.com`)
- `MAX_REQUEST_SIZE` (optional) - Bytes (default: 10485760 = 10MB)
- `RATE_LIMIT_PER_TENANT` (optional) - Requests per minute (default: 100)

### Channel Naming Convention
- Request channel: `mcp-tunnel:<tenant_id>:requests`
- Response channel: `mcp-tunnel:<tenant_id>:responses`
- Delimiter is `:` (Ably standard for capability wildcards)

### Security Considerations
- Never log full API keys (mask with `key.substring(0, 10)...`)
- Worker validates hosts against allow-list before executing requests
- Enforce request size limits to prevent abuse
- Rate limiting is per-tenant with configurable limits

## CI/CD

### GitHub Actions Workflows

**test.yml** - Runs on push/PR:
- Linting
- Building
- Tests (when implemented)

**publish.yml** - Runs on release creation:
- Publishes `@mcp-tunnel/wrapper` to npm (requires `NPM_TOKEN` secret)
- Builds and pushes Docker image to `ghcr.io/mslavov/mcp-tunnel-worker`

### Creating a Release

**IMPORTANT: npm Version Immutability**
- Once a version is published to npm, it **CANNOT** be republished or overwritten
- Always check the latest published version before releasing: `npm view @mcp-tunnel/wrapper version`
- If a release fails after npm publish succeeds, you MUST increment the version for the next attempt
- Docker images CAN be overwritten with the same tag, but npm packages cannot

```bash
# 1. Check current published version on npm
npm view @mcp-tunnel/wrapper version

# 2. Update versions in package.json files (increment from published version)
# - packages/wrapper/package.json
# - packages/worker/package.json
# - package.json (root)

# 3. Update CHANGELOG.md with new version

# 4. Test Docker build locally BEFORE releasing
docker build -t mcp-tunnel-worker:test packages/worker/

# 5. Commit and tag
git add -A
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags

# 6. Create GitHub release (triggers publish workflow)
gh release create vX.Y.Z --generate-notes

# 7. Monitor GitHub Actions for success/failure
gh run watch

# 8. If publish fails AFTER npm published:
# - Delete the GitHub release: gh release delete vX.Y.Z --yes
# - Delete the tag: git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
# - Increment version (e.g., 0.2.0 → 0.2.1)
# - Commit version bump
# - Repeat from step 4
```

## Common Tasks

### Adding a New Feature to Wrapper
1. Implement in `packages/wrapper/src/`
2. Update types in `types.ts` if needed
3. Rebuild: `npm run build`
4. Test locally with `--test` mode
5. Update CHANGELOG.md

### Adding a New Feature to Worker
1. Implement in `packages/worker/src/`
2. Update types in `types.ts` if needed
3. Rebuild Docker image: `docker build -t mcp-tunnel-worker packages/worker/`
4. Test with docker-compose
5. Update CHANGELOG.md

### Debugging Interceptor Issues
1. Enable debug logging: `export MCP_TUNNEL_DEBUG=1`
2. Check `.mcp-tunnel/wrapper.log` for intercepted requests
3. Verify domains aren't in bypass list (Ably domains are auto-skipped)
4. Check `preload.ts` interceptor setup - both `ClientRequestInterceptor` and `FetchInterceptor` must be present

### Troubleshooting Ably Connection
1. Verify API key has correct capabilities: `{"mcp-tunnel:<tenant_id>:*": ["publish", "subscribe"]}`
2. Check `TENANT_ID` matches between wrapper and worker
3. Ensure firewall allows outbound HTTPS to `*.ably.io`
4. Check Ably status: https://status.ably.com/

## File Locations

**Configuration:**
- Root: `package.json`, `tsconfig.base.json`, `.eslintrc.json`, `.prettierrc.json`
- Docker: `docker-compose.yml`
- CI/CD: `.github/workflows/test.yml`, `.github/workflows/publish.yml`

**Source Code:**
- Wrapper: `packages/wrapper/src/`
- Worker: `packages/worker/src/`
- Examples: `examples/` (test scripts and Claude Desktop config)

**Documentation:**
- `README.md` - Project overview and quick start
- `USAGE.md` - Detailed usage guide with examples
- `CHANGELOG.md` - Version history
- `examples/README.md` - Example configurations and troubleshooting
