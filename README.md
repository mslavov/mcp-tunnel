# MCP Tunnel

> Tunnel HTTP requests from MCP servers through Ably Pub/Sub to access services behind firewalls

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

MCP Tunnel enables [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers to securely access internal APIs and services behind firewalls without exposing them to the public internet. It uses [Ably Pub/Sub](https://ably.com/) for real-time bidirectional communication between a wrapper (npm package) and a worker (Docker container).

**Core Value Proposition**: Enable AI assistants to interact with internal APIs and services without exposing them to the public internet or requiring complex VPN setups.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant / Client                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         MCP Server (stdio, JSON-RPC 2.0)               │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │   Wrapper (@mcp-tunnel/wrapper)                  │ │ │
│  │  │   - Wraps MCP server execution                   │ │ │
│  │  │   - Intercepts HTTP/HTTPS requests               │ │ │
│  │  │   - Publishes requests to Ably                   │ │ │
│  │  │   - Receives responses from Ably                 │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Ably Pub/Sub
                           │ (Internet)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Private Network / Behind Firewall               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   Worker (Docker Container)                            │ │
│  │   - Subscribes to Ably request channel                 │ │
│  │   - Executes HTTP requests to internal services        │ │
│  │   - Publishes responses to Ably                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Internal APIs / Services                      │ │
│  │          (not publicly accessible)                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Features

- ✅ **Universal HTTP interception** - Works with fetch, axios, http/https, and all Node.js HTTP clients
- ✅ **Transparent tunneling** - MCP servers work without code changes
- ✅ **Firewall-friendly** - No inbound ports required
- ✅ **Secure by design** - Multi-tenant isolation via Ably capabilities
- ✅ **Host allow-lists** - Worker enforces allowed target hosts
- ✅ **Low latency** - Real-time pub/sub communication
- ✅ **TypeScript** - Full type safety with strict mode
- ✅ **Production-ready** - Rate limiting, request size limits, health checks

## Quick Start

### 1. Set Up Ably Account

1. Sign up for a free [Ably account](https://ably.com/)
2. Create a new app in the Ably dashboard
3. Create an API key with scoped capabilities:
   ```json
   {
     "mcp-tunnel:your-tenant-id:*": ["publish", "subscribe"]
   }
   ```

### 2. Install Wrapper (Client Side)

```bash
npm install -g @mcp-tunnel/wrapper
```

### 3. Deploy Worker (Private Network)

```bash
# Pull the Docker image
docker pull ghcr.io/mslavov/mcp-tunnel-worker:latest

# Create .env file
cat > .env <<EOF
ABLY_API_KEY=your-ably-api-key
TENANT_ID=your-tenant-id
ALLOWED_HOSTS=api.internal.company.com,*.internal.company.com
EOF

# Run the worker
docker run -d \
  --name mcp-tunnel-worker \
  --env-file .env \
  ghcr.io/mslavov/mcp-tunnel-worker:latest
```

### 4. Use with MCP Server

```bash
# Set environment variables
export ABLY_API_KEY=your-ably-api-key
export TENANT_ID=your-tenant-id

# Run with tunnel
mcp-tunnel --test https://api.internal.company.com/health
```

## HTTP Client Compatibility

The tunnel uses [@mswjs/interceptors](https://github.com/mswjs/interceptors) to intercept **all** HTTP requests, regardless of which library your MCP server uses:

**✅ Supported HTTP Clients:**
- **Native `fetch`** (Node.js 18+)
- **`axios`** (used by official MCP weather server example)
- **`got`**, **`node-fetch`**, **`request`**
- **Native `http`/`https` modules**
- Any library built on top of Node.js http/https

**How it works:**
```typescript
// Your MCP server code - NO CHANGES NEEDED!
import axios from 'axios';

// This request is automatically intercepted and tunneled
const response = await axios.get('https://api.internal.company.com/data');
```

The wrapper intercepts requests at the `http`/`https` module level, so it works transparently with any HTTP client library.

## Configuration

### Wrapper Configuration

Environment variables:
- `ABLY_API_KEY` (required) - Ably API key with publish/subscribe capabilities
- `TENANT_ID` (required) - Unique tenant identifier

### Worker Configuration

Environment variables:
- `ABLY_API_KEY` (required) - Ably API key with publish/subscribe capabilities
- `TENANT_ID` (required) - Unique tenant identifier
- `ALLOWED_HOSTS` (optional) - Comma-separated list of allowed hosts (supports wildcards like `*.example.com`)
- `MAX_REQUEST_SIZE` (optional) - Maximum request size in bytes (default: 10485760 = 10MB)
- `RATE_LIMIT_PER_TENANT` (optional) - Requests per minute per tenant (default: 100)

## Security

### Multi-Tenant Isolation

Each tenant is isolated using Ably's capability system:

```json
{
  "mcp-tunnel:tenant-123:*": ["publish", "subscribe"]
}
```

This ensures:
- ✅ Tenants can only access their own channels
- ✅ No cross-tenant data leakage
- ✅ API keys are scoped to specific tenants

### Worker Security

The worker enforces:
- **Host allow-lists** - Only allowed hosts can be accessed
- **Request size limits** - Prevents abuse
- **Rate limiting** - Per-tenant request limits

See [SECURITY.md](./SECURITY.md) for detailed security best practices.

## Development

### Prerequisites

- Node.js 18+
- npm 8+
- Docker 20+ (for worker)

### Setup

```bash
# Clone the repository
git clone https://github.com/mslavov/mcp-tunnel.git
cd mcp-tunnel

# Install dependencies
npm install

# Build packages
npm run build

# Run linter
npm run lint
```

### Project Structure

```
mcp-tunnel/
├── packages/
│   ├── wrapper/          # npm package for wrapping MCP servers
│   │   ├── src/
│   │   │   ├── ably-client.ts
│   │   │   ├── tunnel-fetch.ts
│   │   │   ├── cli.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── worker/           # Docker container for executing requests
│       ├── src/
│       │   ├── ably-client.ts
│       │   ├── request-handler.ts
│       │   ├── types.ts
│       │   └── index.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── publish.yml
├── package.json
├── tsconfig.base.json
└── README.md
```

## Roadmap

- [ ] Phase 1: Foundation ✅ (Complete)
  - [x] Monorepo setup
  - [x] Ably integration
  - [x] TypeScript configuration
- [ ] Phase 2: Core Implementation (In Progress)
  - [x] HTTP request interception
  - [x] Request/response tunneling
  - [ ] E2E testing
- [ ] Phase 3: MCP Integration
  - [ ] MCP server process spawner
  - [ ] Stdio transport forwarding
  - [ ] Concurrent request support
- [ ] Phase 4: Packaging & Deployment
  - [ ] npm package publishing
  - [ ] Docker image publishing
  - [ ] CI/CD pipeline
  - [ ] Documentation

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Ably Realtime](https://ably.com/) for pub/sub infrastructure
- Inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

---

**Built with ❤️ for the MCP community**
