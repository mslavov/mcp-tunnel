import { TunnelRequest, TunnelResponse, WorkerConfig } from './types';
import { Logger } from './logger';

/**
 * Handles executing HTTP requests and creating responses
 */
export class RequestHandler {
  private config: WorkerConfig;
  private logger: Logger;

  constructor(config: WorkerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Validate if a URL is allowed based on the allow-list
   */
  private isUrlAllowed(url: string): boolean {
    if (!this.config.allowedHosts || this.config.allowedHosts.length === 0) {
      return true; // No restrictions if no allow-list is configured
    }

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;

      return this.config.allowedHosts.some((pattern) => {
        // Support wildcard patterns like *.example.com
        if (pattern.startsWith('*.')) {
          const domain = pattern.substring(2);
          return hostname.endsWith(domain);
        }
        return hostname === pattern;
      });
    } catch {
      return false;
    }
  }

  /**
   * Validate request size
   */
  private isRequestSizeValid(request: TunnelRequest): boolean {
    const maxSize = this.config.maxRequestSize || 10485760; // 10MB default

    if (request.body) {
      const bodySize = Buffer.from(request.body, 'base64').length;
      if (bodySize > maxSize) {
        this.logger.warn('Request size exceeds limit', {
          requestId: request.requestId,
          tenantId: request.tenantId,
          bodySize,
          maxSize,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Execute an HTTP request
   */
  async handleRequest(request: TunnelRequest): Promise<TunnelResponse> {
    const startTime = Date.now();

    try {
      // Validate request size
      if (!this.isRequestSizeValid(request)) {
        this.logger.warn('Request rejected: size limit exceeded', {
          requestId: request.requestId,
          tenantId: request.tenantId,
          url: request.url,
        });

        return {
          requestId: request.requestId,
          tenantId: request.tenantId,
          status: 413,
          headers: {},
          error: 'Request size exceeds maximum allowed',
          timestamp: Date.now(),
        };
      }

      // Validate URL
      if (!this.isUrlAllowed(request.url)) {
        this.logger.warn('Request rejected: host not allowed', {
          requestId: request.requestId,
          tenantId: request.tenantId,
          url: request.url,
        });

        return {
          requestId: request.requestId,
          tenantId: request.tenantId,
          status: 403,
          headers: {},
          error: `Request to ${request.url} is not allowed`,
          timestamp: Date.now(),
        };
      }

      // Execute request
      this.logger.info('Executing request', {
        requestId: request.requestId,
        tenantId: request.tenantId,
        method: request.method,
        url: request.url,
      });

      const body = request.body ? Buffer.from(request.body, 'base64') : undefined;

      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body,
      });

      // Read response body
      const responseBuffer = await response.arrayBuffer();
      const responseBody = Buffer.from(responseBuffer).toString('base64');

      // Convert headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const duration = Date.now() - startTime;
      this.logger.info('Request completed', {
        requestId: request.requestId,
        tenantId: request.tenantId,
        status: response.status,
        duration,
      });

      return {
        requestId: request.requestId,
        tenantId: request.tenantId,
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
        timestamp: Date.now(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Request failed', {
        requestId: request.requestId,
        tenantId: request.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      return {
        requestId: request.requestId,
        tenantId: request.tenantId,
        status: 502,
        headers: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }
}
