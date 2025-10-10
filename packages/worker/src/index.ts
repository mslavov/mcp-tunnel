#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { AblyWorkerClient } from './ably-client';
import { RequestHandler } from './request-handler';
import { WorkerConfig } from './types';

// Load environment variables
dotenv.config();

/**
 * Main worker entry point
 */
async function main() {
  // Read configuration from environment
  const config: WorkerConfig = {
    ablyApiKey: process.env.ABLY_API_KEY || '',
    tenantId: process.env.TENANT_ID || '',
    allowedHosts: process.env.ALLOWED_HOSTS?.split(',').map((h) => h.trim()),
    maxRequestSize: parseInt(process.env.MAX_REQUEST_SIZE || '10485760', 10),
    rateLimit: parseInt(process.env.RATE_LIMIT_PER_TENANT || '100', 10),
  };

  // Validate required config
  if (!config.ablyApiKey) {
    console.error('[Worker] Error: ABLY_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!config.tenantId) {
    console.error('[Worker] Error: TENANT_ID environment variable is required');
    process.exit(1);
  }

  console.log('[Worker] Starting MCP Tunnel Worker');
  console.log(`[Worker] Tenant ID: ${config.tenantId}`);
  console.log(
    `[Worker] Allowed hosts: ${config.allowedHosts?.join(', ') || 'All hosts (no restrictions)'}`
  );

  // Initialize Ably client
  const ablyClient = new AblyWorkerClient(config);
  const requestHandler = new RequestHandler(config);

  try {
    // Connect to Ably
    await ablyClient.connect();

    // Subscribe to requests
    await ablyClient.subscribeToRequests(async (request) => {
      const response = await requestHandler.handleRequest(request);
      await ablyClient.publishResponse(response);
    });

    console.log('[Worker] Worker is ready and listening for requests');
  } catch (error) {
    console.error('[Worker] Fatal error:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[Worker] Shutting down...');
    await ablyClient.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[Worker] Shutting down...');
    await ablyClient.close();
    process.exit(0);
  });
}

// Run the worker
main().catch((error) => {
  console.error('[Worker] Unhandled error:', error);
  process.exit(1);
});
