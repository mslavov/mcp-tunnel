# @mcp-tunnel/wrapper

> Wrap MCP servers to access internal APIs through Ably Pub/Sub

[![npm version](https://img.shields.io/npm/v/@mcp-tunnel/wrapper.svg)](https://www.npmjs.com/package/@mcp-tunnel/wrapper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The MCP Tunnel wrapper enables [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers to access internal APIs behind firewalls. It intercepts HTTP requests and tunnels them through [Ably Pub/Sub](https://ably.com/) to a worker running on your private network.

**Core Features:**
- ✅ **Universal HTTP interception** - Works with fetch, axios, http/https, and all Node.js HTTP clients
- ✅ **Transparent** - MCP servers work without code changes
- ✅ **Firewall-friendly** - No inbound ports required
- ✅ **Debug logging** - Optional file-based logging for troubleshooting

## Installation

```bash
npm install -g @mcp-tunnel/wrapper
```

## Quick Start

### 1. Set Up Environment

```bash
export ABLY_API_KEY=your-ably-api-key
export TENANT_ID=your-tenant-id
```

### 2. Test the Tunnel

```bash
mcp-tunnel --test https://httpbin.org/get
```

### 3. Run with MCP Server

```bash
mcp-tunnel --server ./my-mcp-server.js
```

## Usage

### Command Line

```bash
mcp-tunnel [options]

Options:
  --server <path>         Path to MCP server executable/script
  --server-args <args>    Arguments to pass to MCP server (space-separated)
  --tenant-id <id>        Tenant ID (or use TENANT_ID env var)
  --ably-key <key>        Ably API key (or use ABLY_API_KEY env var)
  --timeout <ms>          Request timeout in milliseconds (default: 30000)
  --test <url>            Test mode - make a single request and exit
  --help, -h              Show help message
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-internal-api": {
      "command": "npx",
      "args": [
        "@mcp-tunnel/wrapper",
        "--server",
        "./my-mcp-server.js"
      ],
      "env": {
        "ABLY_API_KEY": "your-ably-api-key",
        "TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

## Environment Variables

- `ABLY_API_KEY` (required) - Ably API key with publish/subscribe capabilities
- `TENANT_ID` (required) - Unique tenant identifier
- `TUNNEL_TIMEOUT` (optional) - Request timeout in milliseconds (default: 30000)
- `MCP_TUNNEL_DEBUG` (optional) - Enable debug logging to `.mcp-tunnel/wrapper.log`

## Debugging

Enable detailed logging:

```bash
export MCP_TUNNEL_DEBUG=1
mcp-tunnel --server ./my-mcp-server.js

# In another terminal
tail -f .mcp-tunnel/wrapper.log
```

Debug logs include:
- HTTP request/response interception
- Ably connection status
- Error stack traces

## How It Works

1. The wrapper spawns your MCP server as a child process
2. It injects an HTTP interceptor using `@mswjs/interceptors`
3. All HTTP requests are intercepted and sent through Ably Pub/Sub
4. A worker on your private network executes the requests
5. Responses are returned through Ably back to your MCP server

## Requirements

- **Worker**: You need to deploy the worker on your private network. See [mcp-tunnel-worker](https://github.com/mslavov/mcp-tunnel#worker-deployment)
- **Ably Account**: Free tier available at [ably.com](https://ably.com/)
- **Node.js**: 18 or later

## Documentation

- [Full Documentation](https://github.com/mslavov/mcp-tunnel)
- [Usage Guide](https://github.com/mslavov/mcp-tunnel/blob/main/USAGE.md)
- [Examples](https://github.com/mslavov/mcp-tunnel/tree/main/examples)

## License

MIT - see [LICENSE](https://github.com/mslavov/mcp-tunnel/blob/main/LICENSE)

## Support

- [GitHub Issues](https://github.com/mslavov/mcp-tunnel/issues)
- [Repository](https://github.com/mslavov/mcp-tunnel)
