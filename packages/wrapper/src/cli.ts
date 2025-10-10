#!/usr/bin/env node

import { resolve } from 'path';
import { spawn } from 'child_process';
import { TunnelFetch } from './tunnel-fetch';
import { TunnelConfig } from './types';

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    server?: string;
    serverArgs?: string[];
    test?: string;
    tenantId?: string;
    ablyKey?: string;
    timeout?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--server') {
      options.server = args[++i];
    } else if (arg === '--server-args') {
      options.serverArgs = args[++i]?.split(' ');
    } else if (arg === '--tenant-id') {
      options.tenantId = args[++i];
    } else if (arg === '--ably-key') {
      options.ablyKey = args[++i];
    } else if (arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--test') {
      options.test = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print CLI help
 */
function printHelp() {
  console.log(`
MCP Tunnel Wrapper - Tunnel HTTP requests through Ably Pub/Sub

Usage:
  mcp-tunnel [options]

Options:
  --server <path>         Path to MCP server executable/script
  --server-args <args>    Arguments to pass to MCP server (space-separated)
  --tenant-id <id>        Tenant ID (can also use TENANT_ID env var)
  --ably-key <key>        Ably API key (can also use ABLY_API_KEY env var)
  --timeout <ms>          Request timeout in milliseconds (default: 30000)
  --test <url>            Test mode - make a single request and exit
  --help, -h              Show this help message

Examples:
  # Run MCP server with tunnel
  mcp-tunnel --server ./my-mcp-server.js --tenant-id tenant-123

  # Using environment variables (recommended)
  export ABLY_API_KEY=your-key
  export TENANT_ID=tenant-123
  mcp-tunnel --server ./my-mcp-server.js

  # Test mode
  mcp-tunnel --test https://httpbin.org/get

Environment Variables:
  ABLY_API_KEY            Ably API key with publish/subscribe capabilities
  TENANT_ID               Unique tenant identifier
  TUNNEL_TIMEOUT          Request timeout in milliseconds

MCP Client Config Example (claude_desktop_config.json):
  {
    "mcpServers": {
      "my-internal-api": {
        "command": "mcp-tunnel",
        "args": ["--server", "./my-mcp-server.js", "--tenant-id", "tenant-123"],
        "env": {
          "ABLY_API_KEY": "your-key-here"
        }
      }
    }
  }
`);
}

/**
 * Spawn MCP server with preload script
 */
function spawnMcpServer(serverPath: string, serverArgs: string[], env: NodeJS.ProcessEnv) {
  const preloadScript = resolve(__dirname, 'preload.js');

  console.log('[Wrapper] Spawning MCP server:', serverPath);
  console.log('[Wrapper] Using preload script:', preloadScript);

  const child = spawn('node', ['--require', preloadScript, serverPath, ...serverArgs], {
    stdio: 'inherit',
    env,
  });

  child.on('error', (error) => {
    console.error('[Wrapper] Failed to spawn MCP server:', error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Wrapper] MCP server exited with code ${code}`);
      process.exit(code);
    }
    process.exit(0);
  });

  // Forward signals to child process
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = parseArgs();

  // Build config from env vars and CLI args
  const config: TunnelConfig = {
    ablyApiKey: args.ablyKey || process.env.ABLY_API_KEY || '',
    tenantId: args.tenantId || process.env.TENANT_ID || '',
    timeout: args.timeout || 30000,
  };

  // Validate required config
  if (!config.ablyApiKey) {
    console.error('Error: ABLY_API_KEY is required (env var or --ably-key)');
    process.exit(1);
  }

  if (!config.tenantId) {
    console.error('Error: TENANT_ID is required (env var or --tenant-id)');
    process.exit(1);
  }

  console.log('[Wrapper] Starting MCP Tunnel Wrapper');
  console.log(`[Wrapper] Tenant ID: ${config.tenantId}`);

  // Test mode - make a single request and exit
  if (args.test) {
    const tunnel = new TunnelFetch(config);
    try {
      await tunnel.init();
      console.log('[Wrapper] Connected to Ably');
      console.log(`[Wrapper] Testing with URL: ${args.test}`);

      const response = await tunnel.fetch(args.test);
      console.log(`[Wrapper] Response status: ${response.status}`);
      const text = await response.text();
      console.log(`[Wrapper] Response body (truncated):`);
      console.log(text.substring(0, 500));

      await tunnel.close();
      console.log('[Wrapper] ✅ Test successful');
      process.exit(0);
    } catch (error) {
      console.error('[Wrapper] ❌ Test failed:', error);
      await tunnel.close();
      process.exit(1);
    }
  }

  // MCP server mode - spawn server with tunnel
  if (args.server) {
    const env = {
      ...process.env,
      ABLY_API_KEY: config.ablyApiKey,
      TENANT_ID: config.tenantId,
      TUNNEL_TIMEOUT: config.timeout?.toString() || '30000',
    };

    spawnMcpServer(args.server, args.serverArgs || [], env);
  } else {
    console.error('Error: No MCP server specified. Use --server <path>');
    printHelp();
    process.exit(1);
  }
}

main();
