/**
 * Simple test to verify the tunnel is working
 *
 * Usage:
 * 1. Start the worker: cd packages/worker && npm start
 * 2. In another terminal: cd examples && ts-node simple-test.ts
 */

import { TunnelFetch, TunnelConfig } from '../packages/wrapper/src';

async function main() {
  const config: TunnelConfig = {
    ablyApiKey: process.env.ABLY_API_KEY || '',
    tenantId: process.env.TENANT_ID || 'tenant-123',
    timeout: 30000,
  };

  if (!config.ablyApiKey) {
    console.error('Error: ABLY_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('[Test] Initializing tunnel...');
  const tunnel = new TunnelFetch(config);

  try {
    await tunnel.init();
    console.log('[Test] Connected to Ably');

    // Test with a public API (HTTPBin is great for testing)
    const testUrl = 'https://httpbin.org/get';
    console.log(`[Test] Making request to ${testUrl}`);

    const response = await tunnel.fetch(testUrl);
    console.log(`[Test] Response status: ${response.status}`);

    const data = await response.json();
    console.log('[Test] Response data:', JSON.stringify(data, null, 2));

    console.log('[Test] ✅ Test successful!');
  } catch (error) {
    console.error('[Test] ❌ Test failed:', error);
    process.exit(1);
  } finally {
    await tunnel.close();
    console.log('[Test] Connection closed');
  }
}

main();
