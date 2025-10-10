#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { AblyWorkerClient } from './ably-client';
import { RequestHandler } from './request-handler';
import { RateLimiter } from './rate-limiter';
import { Logger } from './logger';
import { HealthCheckServer } from './health-check';
import { WorkerConfig } from './types';

// Load environment variables
dotenv.config();

/**
 * Main worker entry point
 */
async function main() {
  // Initialize logger
  const logger = new Logger('mcp-tunnel-worker');

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
    logger.error('ABLY_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!config.tenantId) {
    logger.error('TENANT_ID environment variable is required');
    process.exit(1);
  }

  logger.info('Starting MCP Tunnel Worker', {
    tenantId: config.tenantId,
    allowedHosts: config.allowedHosts || ['*'],
    maxRequestSize: config.maxRequestSize,
    rateLimit: config.rateLimit,
  });

  // Initialize components
  const ablyClient = new AblyWorkerClient(config);
  const requestHandler = new RequestHandler(config, logger);
  const rateLimiter = new RateLimiter(config.rateLimit || 100, 60000);
  const healthCheck = new HealthCheckServer(8080);

  try {
    // Start health check server
    healthCheck.start();

    // Connect to Ably
    await ablyClient.connect();
    healthCheck.setHealthy(true);

    // Set up periodic cleanup for rate limiter
    const cleanupInterval = setInterval(() => {
      rateLimiter.cleanup();
    }, 60000); // Every minute

    // Subscribe to requests
    await ablyClient.subscribeToRequests(async (request) => {
      // Check rate limit
      if (!rateLimiter.isAllowed(request.tenantId)) {
        logger.warn('Request rejected: rate limit exceeded', {
          requestId: request.requestId,
          tenantId: request.tenantId,
          currentCount: rateLimiter.getCount(request.tenantId),
          limit: config.rateLimit,
        });

        await ablyClient.publishResponse({
          requestId: request.requestId,
          tenantId: request.tenantId,
          status: 429,
          headers: {},
          error: 'Rate limit exceeded',
          timestamp: Date.now(),
        });
        return;
      }

      // Handle request
      const response = await requestHandler.handleRequest(request);
      await ablyClient.publishResponse(response);
    });

    logger.info('Worker is ready and listening for requests');

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      clearInterval(cleanupInterval);
      healthCheck.setHealthy(false);
      healthCheck.stop();
      await ablyClient.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Fatal error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    healthCheck.stop();
    process.exit(1);
  }
}

// Run the worker
main().catch((error) => {
  console.error('[Worker] Unhandled error:', error);
  process.exit(1);
});
