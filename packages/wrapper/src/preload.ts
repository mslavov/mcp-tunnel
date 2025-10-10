/**
 * Preload script to inject universal HTTP interceptor into MCP server runtime
 *
 * This script is loaded using Node's --require flag before the MCP server starts.
 * It intercepts ALL HTTP requests (fetch, axios, http/https, etc.) and tunnels them through Ably.
 *
 * Usage: node --require ./preload.js my-mcp-server.js
 */

import { BatchInterceptor } from '@mswjs/interceptors';
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest';
import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { TunnelFetch } from './tunnel-fetch';
import { TunnelConfig } from './types';

/**
 * Initialize the universal HTTP interceptor
 */
async function initializeTunnel() {
  // Get configuration from environment variables
  const config: TunnelConfig = {
    ablyApiKey: process.env.ABLY_API_KEY || '',
    tenantId: process.env.TENANT_ID || '',
    timeout: parseInt(process.env.TUNNEL_TIMEOUT || '30000', 10),
  };

  if (!config.ablyApiKey) {
    console.error('[Tunnel Preload] Error: ABLY_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!config.tenantId) {
    console.error('[Tunnel Preload] Error: TENANT_ID environment variable is required');
    process.exit(1);
  }

  try {
    // Initialize tunnel
    const tunnel = new TunnelFetch(config);
    await tunnel.init();

    // Create batch interceptor for all HTTP clients
    const interceptor = new BatchInterceptor({
      name: 'mcp-tunnel',
      interceptors: [
        new ClientRequestInterceptor(), // Intercepts http/https (axios, got, etc.)
        new FetchInterceptor(),          // Intercepts fetch API
      ],
    });

    // Intercept all requests
    interceptor.on('request', async ({ request }) => {
      try {
        console.log(`[Tunnel Preload] Intercepted ${request.method} ${request.url}`);

        // Use the tunnel to execute the request
        const response = await tunnel.fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: request.body,
        });

        // Return the response
        return response;
      } catch (error) {
        console.error('[Tunnel Preload] Request failed:', error);
        throw error;
      }
    });

    // Apply the interceptor
    interceptor.apply();

    console.log('[Tunnel Preload] HTTP interceptor activated');
    console.log('[Tunnel Preload] Tenant ID:', config.tenantId);
    console.log('[Tunnel Preload] All HTTP requests (fetch, axios, http, https) will be tunneled');

    // Clean up on exit
    const cleanup = async () => {
      interceptor.dispose();
      await tunnel.close();
    };

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Tunnel Preload] Failed to initialize tunnel:', error);
    process.exit(1);
  }
}

// Only run if this is the preload script (not when imported)
if (require.main === module) {
  initializeTunnel().catch((error) => {
    console.error('[Tunnel Preload] Unhandled error:', error);
    process.exit(1);
  });
}
