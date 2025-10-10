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
import { logger } from './logger';

// Log that preload script is being loaded
logger.log('[Tunnel Preload]', '='.repeat(80));
logger.log('[Tunnel Preload]', 'Preload script loaded at', new Date().toISOString());
logger.log('[Tunnel Preload]', 'Node version:', process.version);
logger.log('[Tunnel Preload]', 'Process ID:', process.pid);
logger.log('[Tunnel Preload]', 'Working directory:', process.cwd());
logger.log('[Tunnel Preload]', 'Script path:', __filename);
logger.log('[Tunnel Preload]', 'require.main:', require.main?.filename || 'undefined');
logger.log('[Tunnel Preload]', 'module:', module.filename);
logger.log('[Tunnel Preload]', '='.repeat(80));

/**
 * Initialize the universal HTTP interceptor
 */
async function initializeTunnel() {
  logger.log('[Tunnel Preload]', 'Starting tunnel initialization...');

  // Log environment variables (mask sensitive data)
  logger.log('[Tunnel Preload]', 'Environment check:');
  logger.log('[Tunnel Preload]', '  ABLY_API_KEY:', process.env.ABLY_API_KEY ? `${process.env.ABLY_API_KEY.substring(0, 10)}...` : 'NOT SET');
  logger.log('[Tunnel Preload]', '  TENANT_ID:', process.env.TENANT_ID || 'NOT SET');
  logger.log('[Tunnel Preload]', '  TUNNEL_TIMEOUT:', process.env.TUNNEL_TIMEOUT || '30000 (default)');

  // Get configuration from environment variables
  const config: TunnelConfig = {
    ablyApiKey: process.env.ABLY_API_KEY || '',
    tenantId: process.env.TENANT_ID || '',
    timeout: parseInt(process.env.TUNNEL_TIMEOUT || '30000', 10),
  };

  if (!config.ablyApiKey) {
    logger.error('[Tunnel Preload]', 'ABLY_API_KEY environment variable is required');
    logger.error('[Tunnel Preload]', 'Please set ABLY_API_KEY before running');
    process.exit(1);
  }

  if (!config.tenantId) {
    logger.error('[Tunnel Preload]', 'TENANT_ID environment variable is required');
    logger.error('[Tunnel Preload]', 'Please set TENANT_ID before running');
    process.exit(1);
  }

  logger.log('[Tunnel Preload]', 'Configuration validated successfully');

  try {
    // Initialize tunnel
    logger.log('[Tunnel Preload]', 'Creating TunnelFetch instance...');
    const tunnel = new TunnelFetch(config);

    logger.log('[Tunnel Preload]', 'Initializing tunnel connection...');
    await tunnel.init();
    logger.log('[Tunnel Preload]', 'Tunnel connection initialized successfully');

    // Create batch interceptor for all HTTP clients
    logger.log('[Tunnel Preload]', 'Creating HTTP interceptors...');
    logger.log('[Tunnel Preload]', '  - ClientRequestInterceptor (for http/https modules)');
    logger.log('[Tunnel Preload]', '  - FetchInterceptor (for fetch API)');

    const interceptor = new BatchInterceptor({
      name: 'mcp-tunnel',
      interceptors: [
        new ClientRequestInterceptor(), // Intercepts http/https (axios, got, etc.)
        new FetchInterceptor(),          // Intercepts fetch API
      ],
    });
    logger.log('[Tunnel Preload]', 'Interceptors created successfully');

    // Domains to skip (bypass tunnel)
    const skipDomains = [
      'realtime.ably.net',
      'ably-realtime.com',
      'ably.io',
      'ably.com'
    ];

    // Intercept all requests
    logger.log('[Tunnel Preload]', 'Setting up request interceptor handler...');
    interceptor.on('request', async ({ request }) => {
      try {
        const url = new URL(request.url);

        // Check if domain should be skipped
        const shouldSkip = skipDomains.some(domain => url.hostname.includes(domain));

        if (shouldSkip) {
          logger.log('[Tunnel Preload]', `>>> Skipping ${request.method} ${request.url} (bypassed domain)`);
          // Return undefined to let the request pass through
          return;
        }

        logger.log('[Tunnel Preload]', `>>> Intercepted ${request.method} ${request.url}`);
        logger.log('[Tunnel Preload]', `>>> Headers:`, Object.fromEntries(request.headers.entries()));

        // Use the tunnel to execute the request
        logger.log('[Tunnel Preload]', `>>> Sending request through tunnel...`);
        const response = await tunnel.fetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          body: request.body,
        });

        logger.log('[Tunnel Preload]', `<<< Response received: ${response.status} ${response.statusText}`);

        // Return the response
        return response;
      } catch (error) {
        logger.error('[Tunnel Preload]', '!!! Request failed:', error);
        logger.error('[Tunnel Preload]', '!!! Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      }
    });

    // Apply the interceptor
    logger.log('[Tunnel Preload]', 'Applying interceptors to runtime...');
    interceptor.apply();
    logger.log('[Tunnel Preload]', '✓ Interceptors applied successfully');

    logger.log('[Tunnel Preload]', '='.repeat(80));
    logger.log('[Tunnel Preload]', '✓ HTTP interceptor activated');
    logger.log('[Tunnel Preload]', '✓ Tenant ID:', config.tenantId);
    logger.log('[Tunnel Preload]', '✓ Timeout:', config.timeout, 'ms');
    logger.log('[Tunnel Preload]', '✓ All HTTP requests (fetch, axios, http, https) will be tunneled');
    logger.log('[Tunnel Preload]', '✓ Ready to intercept requests');
    logger.log('[Tunnel Preload]', '='.repeat(80));

    // Clean up on exit
    const cleanup = async () => {
      logger.log('[Tunnel Preload]', 'Cleaning up...');
      interceptor.dispose();
      await tunnel.close();
      logger.log('[Tunnel Preload]', 'Cleanup complete');
    };

    process.on('SIGINT', async () => {
      logger.log('[Tunnel Preload]', 'Received SIGINT signal');
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.log('[Tunnel Preload]', 'Received SIGTERM signal');
      await cleanup();
      process.exit(0);
    });
  } catch (error) {
    logger.error('[Tunnel Preload]', 'Failed to initialize tunnel:', error);
    logger.error('[Tunnel Preload]', 'Error details:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error);
    process.exit(1);
  }
}

// Start initialization immediately when script loads (for --require usage)
logger.log('[Tunnel Preload]', 'Checking if script should initialize...');
logger.log('[Tunnel Preload]', 'Is main module:', require.main === module);
logger.log('[Tunnel Preload]', 'Starting initialization...');

initializeTunnel().catch((error) => {
  logger.error('[Tunnel Preload]', 'Unhandled error during initialization:', error);
  logger.error('[Tunnel Preload]', 'Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  process.exit(1);
});
