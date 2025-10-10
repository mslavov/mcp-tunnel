# MCP Tunnel Usage Guide

Complete guide for using the MCP Tunnel to access internal APIs from MCP servers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Wrapper Usage](#wrapper-usage)
- [Worker Configuration](#worker-configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

1. **Ably Account**: Sign up at [https://ably.com/](https://ably.com/)
2. **Create API Key** with scoped capabilities:
   ```json
   {
     "mcp-tunnel:your-tenant-id:*": ["publish", "subscribe"]
   }
   ```
3. **Node.js 18+** for wrapper
4. **Docker** for worker (recommended)

## Quick Start

### 1. Deploy Worker (Private Network)

Create `.env` file:
```bash
ABLY_API_KEY=your-ably-api-key
TENANT_ID=tenant-123
ALLOWED_HOSTS=api.internal.company.com,*.internal.company.com
```

Start with Docker Compose:
```bash
docker-compose up -d
```

Or run locally:
```bash
cd packages/worker
npm install
npm run build
npm start
```

### 2. Test the Tunnel

```bash
# Set environment variables
export ABLY_API_KEY=your-ably-api-key
export TENANT_ID=tenant-123

# Run test
npx @mcp-tunnel/wrapper --test https://httpbin.org/get
```

Expected output:
```
[Wrapper] Starting MCP Tunnel Wrapper
[Wrapper] Tenant ID: tenant-123
[Wrapper] Connected to Ably
[Wrapper] Testing with URL: https://httpbin.org/get
[Wrapper] Response status: 200
[Wrapper] Response body (truncated):
{
  "args": {},
  "headers": { ... }
}
[Wrapper] ✅ Test successful
```

## Wrapper Usage

### Method 1: Environment Variables (Recommended)

```bash
export ABLY_API_KEY=your-key
export TENANT_ID=tenant-123

mcp-tunnel --server ./my-mcp-server.js --server-args "--port 3000"
```

### Method 2: Inline CLI Args

```bash
mcp-tunnel \
  --server ./my-mcp-server.js \
  --tenant-id tenant-123 \
  --ably-key your-ably-api-key
```

### Method 3: MCP Client Config (Best for Production)

Configure in `claude_desktop_config.json` or your MCP client config:

```json
{
  "mcpServers": {
    "my-internal-api": {
      "command": "mcp-tunnel",
      "args": ["--server", "./my-mcp-server.js", "--tenant-id", "tenant-123"],
      "env": {
        "ABLY_API_KEY": "your-ably-api-key-here"
      }
    }
  }
}
```

### CLI Reference

```
mcp-tunnel [options]

Options:
  --server <path>         Path to MCP server executable/script
  --server-args <args>    Arguments to pass to MCP server (space-separated)
  --tenant-id <id>        Tenant ID (can also use TENANT_ID env var)
  --ably-key <key>        Ably API key (can also use ABLY_API_KEY env var)
  --timeout <ms>          Request timeout in milliseconds (default: 30000)
  --test <url>            Test mode - make a single request and exit
  --help, -h              Show help message

Examples:
  # Using environment variables
  export ABLY_API_KEY=your-key
  export TENANT_ID=tenant-123
  mcp-tunnel --server ./my-mcp-server.js

  # Using CLI arguments
  mcp-tunnel --server ./my-mcp-server.js --tenant-id tenant-123 --ably-key your-key

  # Test mode
  mcp-tunnel --test https://httpbin.org/get
```

## Worker Configuration

### Environment Variables

```bash
# Required
ABLY_API_KEY=your-ably-api-key
TENANT_ID=tenant-123

# Optional
ALLOWED_HOSTS=api.internal.company.com,*.internal.company.com  # Default: * (all)
MAX_REQUEST_SIZE=10485760                                      # Default: 10MB
RATE_LIMIT_PER_TENANT=100                                      # Default: 100 req/min
```

### Host Allow-List Patterns

```bash
# Single host
ALLOWED_HOSTS=api.internal.company.com

# Multiple hosts
ALLOWED_HOSTS=api.internal.company.com,db.internal.company.com

# Wildcard subdomain
ALLOWED_HOSTS=*.internal.company.com

# Mix and match
ALLOWED_HOSTS=api.internal.company.com,*.staging.company.com,db.company.com
```

### Health Check Endpoints

The worker exposes health check endpoints on port 8080:

- `GET /health` - Always returns 200 if server is running
- `GET /ready` - Returns 200 if connected to Ably, 503 otherwise

Example health check:
```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"2025-10-10T12:00:00.000Z"}

curl http://localhost:8080/ready
# {"status":"ready","timestamp":"2025-10-10T12:00:00.000Z"}
```

## Testing

### 1. Basic Connectivity Test

```bash
# Start worker
docker-compose up -d

# Test from wrapper
export ABLY_API_KEY=your-key
export TENANT_ID=tenant-123
npx @mcp-tunnel/wrapper --test https://httpbin.org/get
```

### 2. Test with Internal API

```bash
# Worker should allow the host in ALLOWED_HOSTS
ALLOWED_HOSTS=api.internal.company.com docker-compose up -d

# Test from wrapper
mcp-tunnel --test https://api.internal.company.com/health
```

### 3. Test Rate Limiting

```bash
# Set low rate limit for testing
RATE_LIMIT_PER_TENANT=5 docker-compose up -d

# Run concurrent requests (will hit rate limit)
for i in {1..10}; do
  mcp-tunnel --test https://httpbin.org/get &
done
wait
```

### 4. Test Request Size Limit

```bash
# Set small size limit for testing
MAX_REQUEST_SIZE=1024 docker-compose up -d

# Send large request (will be rejected)
mcp-tunnel --test https://httpbin.org/post
```

## Production Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'

services:
  mcp-tunnel-worker:
    image: ghcr.io/mslavov/mcp-tunnel-worker:latest
    restart: always
    environment:
      ABLY_API_KEY: ${ABLY_API_KEY}
      TENANT_ID: ${TENANT_ID}
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
      MAX_REQUEST_SIZE: 10485760
      RATE_LIMIT_PER_TENANT: 100
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/ready"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-tunnel-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-tunnel-worker
  template:
    metadata:
      labels:
        app: mcp-tunnel-worker
    spec:
      containers:
      - name: worker
        image: ghcr.io/mslavov/mcp-tunnel-worker:latest
        env:
        - name: ABLY_API_KEY
          valueFrom:
            secretKeyRef:
              name: mcp-tunnel-secrets
              key: ably-api-key
        - name: TENANT_ID
          value: "tenant-123"
        - name: ALLOWED_HOSTS
          value: "api.internal.company.com,*.internal.company.com"
        ports:
        - containerPort: 8080
          name: health
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Troubleshooting

### Worker Not Receiving Requests

**Symptom**: Wrapper shows "Request timeout"

**Solution**:
1. Check worker logs: `docker-compose logs -f`
2. Verify `TENANT_ID` matches between wrapper and worker
3. Check Ably API key has correct capabilities:
   ```json
   {"mcp-tunnel:<tenant_id>:*": ["publish", "subscribe"]}
   ```
4. Test Ably connectivity: `curl https://status.ably.com/`

### Request Rejected (403 Forbidden)

**Symptom**: Worker logs show "host not allowed"

**Solution**:
1. Check `ALLOWED_HOSTS` includes target host
2. Wildcard patterns must match: `*.example.com` matches `api.example.com`
3. Remove `ALLOWED_HOSTS` to allow all (testing only!)

### Rate Limit Exceeded (429)

**Symptom**: Wrapper receives 429 status

**Solution**:
1. Check worker logs for current rate limit
2. Increase `RATE_LIMIT_PER_TENANT` in worker config
3. Implement client-side rate limiting/retry logic
4. Consider deploying multiple workers

### Request Size Too Large (413)

**Symptom**: Wrapper receives 413 status

**Solution**:
1. Increase `MAX_REQUEST_SIZE` in worker config
2. Split large requests into smaller chunks
3. Use streaming for large payloads

### Connection Issues

**Symptom**: "Ably connection timeout" or "Connection failed"

**Solution**:
1. Check internet connectivity
2. Verify Ably API key is valid (not expired/revoked)
3. Check firewall allows outbound HTTPS to `*.ably.io`
4. Review Ably service status: https://status.ably.com/

### Worker Logs

Worker uses structured JSON logging. Filter logs:

```bash
# All logs
docker-compose logs -f

# Error logs only
docker-compose logs -f | grep '"level":"error"'

# Specific tenant
docker-compose logs -f | grep '"tenantId":"tenant-123"'

# Specific request
docker-compose logs -f | grep '"requestId":"abc-123"'
```

### Wrapper Logs

By default, the wrapper does not log to stdout/stderr to avoid breaking MCP protocol communication. Enable debug logging with:

```bash
# Enable debug logging
export MCP_TUNNEL_DEBUG=1
mcp-tunnel --server ./my-server.js

# View logs in real-time
tail -f .mcp-tunnel/wrapper.log

# Or in another terminal
watch -n 1 tail -20 .mcp-tunnel/wrapper.log
```

Debug logs include:
- Preload script initialization details
- All intercepted HTTP requests with full URLs and headers
- Response status codes and timing
- Ably connection events (connected, disconnected, reconnecting)
- Detailed error messages with stack traces

**Log file location:** `.mcp-tunnel/wrapper.log` in the current working directory

## Advanced Usage

### Multiple Tenants (Shared Worker)

Not recommended for production, but possible:

```bash
# Worker with root API key
ABLY_API_KEY=root-key-with-wildcard-capability
CHANNEL_PATTERN="mcp-tunnel:*:requests"
docker-compose up
```

### Custom Timeouts

```bash
# Increase timeout to 60 seconds
mcp-tunnel --server ./my-slow-mcp-server.js --timeout 60000
```

### Debugging

Enable debug logging to troubleshoot issues:

**Wrapper:**
```bash
# Enable debug logging
export MCP_TUNNEL_DEBUG=1
export ABLY_API_KEY=your-key
export TENANT_ID=your-tenant-id

# Run with tunnel
mcp-tunnel --server ./my-mcp-server.js

# In another terminal, watch logs
tail -f .mcp-tunnel/wrapper.log
```

**What gets logged:**
```
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] ================================================================================
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] Preload script loaded at 2025-10-10T12:00:00.000Z
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] Node version: v18.17.0
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] >>> Intercepted GET https://api.internal.company.com/data
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] >>> Headers: {"content-type":"application/json"}
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] >>> Sending request through tunnel...
[2025-10-10T12:00:00.000Z] [INFO] [Tunnel Preload] <<< Response received: 200 OK
```

**Worker:**
```bash
# Worker uses JSON logging by default
LOG_LEVEL=debug docker-compose up
```

**Bypassed Domains:**

The tunnel automatically bypasses these domains to prevent intercepting its own Ably connections:
- `realtime.ably.net`
- `ably-realtime.com`
- `ably.io`
- `ably.com`

**Performance Note:** Debug logging may impact performance. Disable it in production unless actively troubleshooting.

---

For more information, see:
- [README.md](./README.md) - Project overview
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [examples/](./examples/) - Example scripts
