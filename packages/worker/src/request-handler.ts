import { TunnelRequest, TunnelResponse, WorkerConfig } from './types';

/**
 * Handles executing HTTP requests and creating responses
 */
export class RequestHandler {
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;
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
   * Execute an HTTP request
   */
  async handleRequest(request: TunnelRequest): Promise<TunnelResponse> {
    const startTime = Date.now();

    try {
      // Validate URL
      if (!this.isUrlAllowed(request.url)) {
        console.warn(`[Worker] Blocked request to disallowed host: ${request.url}`);
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
      console.log(`[Worker] Executing ${request.method} ${request.url}`);

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
      console.log(
        `[Worker] Completed request ${request.requestId} in ${duration}ms (status: ${response.status})`
      );

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
      console.error(
        `[Worker] Error executing request ${request.requestId} after ${duration}ms:`,
        error
      );

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
