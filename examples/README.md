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

## Running Examples

### Simple Test

Tests the tunnel with a public API (HTTPBin):

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
