#!/usr/bin/env node

import { TunnelFetch } from './tunnel-fetch';
import { TunnelConfig } from './types';

/**
 * Simple CLI for testing the wrapper
 */
async function main() {
  const config: TunnelConfig = {
    ablyApiKey: process.env.ABLY_API_KEY || '',
    tenantId: process.env.TENANT_ID || '',
    timeout: 30000,
  };

  if (!config.ablyApiKey) {
    console.error('Error: ABLY_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!config.tenantId) {
    console.error('Error: TENANT_ID environment variable is required');
    process.exit(1);
  }

  console.log('[Wrapper] Starting MCP Tunnel Wrapper');
  console.log(`[Wrapper] Tenant ID: ${config.tenantId}`);

  const tunnel = new TunnelFetch(config);

  try {
    await tunnel.init();
    console.log('[Wrapper] Connected to Ably');

    // Override global fetch
    (globalThis as typeof globalThis & { fetch: typeof tunnel.fetch }).fetch = tunnel.fetch;

    console.log('[Wrapper] Global fetch has been overridden');
    console.log('[Wrapper] All HTTP requests will now be tunneled through Ably');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('[Wrapper] Shutting down...');
      await tunnel.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('[Wrapper] Shutting down...');
      await tunnel.close();
      process.exit(0);
    });

    // Example: Make a test request
    if (process.argv.includes('--test')) {
      const testUrl = process.argv[process.argv.indexOf('--test') + 1];
      if (testUrl) {
        console.log(`[Wrapper] Testing with URL: ${testUrl}`);
        const response = await tunnel.fetch(testUrl);
        console.log(`[Wrapper] Response status: ${response.status}`);
        const text = await response.text();
        console.log(`[Wrapper] Response body: ${text.substring(0, 200)}...`);
        await tunnel.close();
        process.exit(0);
      }
    }
  } catch (error) {
    console.error('[Wrapper] Fatal error:', error);
    process.exit(1);
  }
}

main();
