# MCP Tunnel Examples

This directory contains example scripts demonstrating how to use the MCP Tunnel.

## Prerequisites

1. Set up environment variables:
   ```bash
   export ABLY_API_KEY=your-ably-api-key
   export TENANT_ID=tenant-123
   ```

2. Start the worker:
   ```bash
   # Option 1: Using Docker Compose
   docker-compose up

   # Option 2: Run locally
   cd packages/worker
   npm install
   npm run build
   npm start
   ```

3. Build the wrapper:
   ```bash
   cd packages/wrapper
   npm run build
   ```

## Running Examples

### Simple Test (Direct Tunnel API)

Tests the tunnel API directly with a public API (HTTPBin):

```bash
cd examples
npx ts-node simple-test.ts
```

Expected output:
```
[Test] Initializing tunnel...
[Test] Connected to Ably
[Test] Making request to https://httpbin.org/get
[Test] Response status: 200
[Test] Response data: { ... }
[Test] ✅ Test successful!
```

### Axios Test (Simulates Real MCP Server)

Tests that axios requests are intercepted (like official MCP weather server):

```bash
cd examples
ABLY_API_KEY=xxx TENANT_ID=yyy node --require ../packages/wrapper/dist/preload.js test-axios.js
```

Expected output:
```
[Tunnel Preload] HTTP interceptor activated
[Tunnel Preload] All HTTP requests (fetch, axios, http, https) will be tunneled
[Test Axios] Starting axios test...
[Tunnel Preload] Intercepted GET https://httpbin.org/get
[Test Axios] ✅ GET succeeded, status: 200
[Test Axios] ✅ All axios tests passed!
```

### Fetch Test (Native Fetch API)

Tests that native fetch requests are intercepted:

```bash
cd examples
ABLY_API_KEY=xxx TENANT_ID=yyy node --require ../packages/wrapper/dist/preload.js test-fetch.js
```

Expected output:
```
[Tunnel Preload] HTTP interceptor activated
[Test Fetch] Starting native fetch test...
[Tunnel Preload] Intercepted GET https://httpbin.org/get
[Test Fetch] ✅ GET succeeded, status: 200
[Test Fetch] ✅ All fetch tests passed!
```

## Real-World Example: Slack MCP Server (Tunneled)

The `slack-mcp-tunneled.json` file shows how to configure Claude Desktop to use the Slack MCP server through the tunnel. This is useful when your Slack workspace is behind a firewall or requires VPN access.

### Setup

1. **Deploy Worker** (on your private network where Slack is accessible):

   ```bash
   # Create .env file
   cat > .env <<EOF
   ABLY_API_KEY=your-ably-api-key
   TENANT_ID=your-tenant-id
   ALLOWED_HOSTS=*.slack.com,slack.com
   EOF

   # Run worker
   docker run -d \
     --name mcp-tunnel-worker \
     --env-file .env \
     ghcr.io/mslavov/mcp-tunnel-worker:latest
   ```

2. **Configure Claude Desktop:**

   Add to your `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "slack-tunneled": {
         "command": "npx",
         "args": [
           "@mcp-tunnel/wrapper",
           "--server",
           "npx",
           "--server-args",
           "-y simple-slack-mcp-server"
         ],
         "env": {
           "ABLY_API_KEY": "${ABLY_API_KEY}",
           "TENANT_ID": "your-tenant-id",
           "SLACK_BOT_TOKEN": "${SLACK_ACCESS_TOKEN}"
         }
       }
     }
   }
   ```

3. **Set Environment Variables:**

   ```bash
   export ABLY_API_KEY="your-ably-api-key"
   export SLACK_ACCESS_TOKEN="xoxb-your-slack-bot-token"
   ```

4. **Restart Claude Desktop** - The Slack MCP server will now tunnel all requests through your private network.

### Debugging

Enable debug logging:

```json
{
  "mcpServers": {
    "slack-tunneled": {
      "command": "npx",
      "args": ["@mcp-tunnel/wrapper", "--server", "npx", "--server-args", "-y simple-slack-mcp-server"],
      "env": {
        "ABLY_API_KEY": "${ABLY_API_KEY}",
        "TENANT_ID": "your-tenant-id",
        "SLACK_BOT_TOKEN": "${SLACK_ACCESS_TOKEN}",
        "MCP_TUNNEL_DEBUG": "1"
      }
    }
  }
}
```

View logs: `tail -f .mcp-tunnel/wrapper.log`

## Troubleshooting

### Worker not receiving requests

1. Check that `TENANT_ID` matches between wrapper and worker
2. Verify Ably API key has correct capabilities: `{"mcp-tunnel:<tenant_id>:*": ["publish", "subscribe"]}`
3. Check worker logs for errors

### Request blocked by worker

1. Ensure target host is in `ALLOWED_HOSTS` list
2. Check worker logs for "Blocked request" messages

### Connection timeout

1. Verify Ably API key is valid
2. Check internet connectivity
3. Ensure Ably service is operational: https://status.ably.com/

### Slack MCP specific issues

**401 Unauthorized:**
- Verify `SLACK_BOT_TOKEN` is correct and not expired
- Check token has required scopes in Slack App settings

**Host not allowed:**
- Worker must have `ALLOWED_HOSTS=*.slack.com,slack.com`
- Check worker logs for "host not allowed" errors
