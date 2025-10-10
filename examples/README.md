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
