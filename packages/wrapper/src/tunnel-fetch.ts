import { v4 as uuidv4 } from 'uuid';
import { AblyTunnelClient } from './ably-client';
import { TunnelRequest, TunnelResponse, TunnelConfig } from './types';

/**
 * Creates a tunneled fetch function that intercepts HTTP requests
 * and sends them through Ably
 */
export class TunnelFetch {
  private ablyClient: AblyTunnelClient;
  private config: TunnelConfig;
  private pendingRequests: Map<string, (response: TunnelResponse) => void>;

  constructor(config: TunnelConfig) {
    this.config = config;
    this.ablyClient = new AblyTunnelClient(config);
    this.pendingRequests = new Map();
  }

  /**
   * Initialize the tunnel
   */
  async init(): Promise<void> {
    await this.ablyClient.connect();
  }

  /**
   * Tunneled fetch implementation
   */
  fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    const headers: Record<string, string> = {};

    // Extract headers
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, init.headers);
      }
    }

    // Extract body
    let body: string | undefined;
    if (init?.body) {
      if (typeof init.body === 'string') {
        body = Buffer.from(init.body).toString('base64');
      } else if (init.body instanceof ArrayBuffer) {
        body = Buffer.from(init.body).toString('base64');
      } else if (init.body instanceof Uint8Array) {
        body = Buffer.from(init.body).toString('base64');
      }
      // Handle other body types as needed
    }

    const requestId = uuidv4();
    const request: TunnelRequest = {
      requestId,
      tenantId: this.config.tenantId,
      method,
      url,
      headers,
      body,
      timestamp: Date.now(),
    };

    // Create promise that will resolve when response is received
    const responsePromise = new Promise<TunnelResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.config.timeout || 30000);

      this.pendingRequests.set(requestId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });

    // Subscribe to response before publishing request
    await this.ablyClient.subscribeToResponse(requestId, (response) => {
      const callback = this.pendingRequests.get(requestId);
      if (callback) {
        callback(response);
        this.pendingRequests.delete(requestId);
      }
    });

    // Publish request
    await this.ablyClient.publishRequest(request);

    // Wait for response
    const tunnelResponse = await responsePromise;

    // Convert TunnelResponse to Response
    if (tunnelResponse.error) {
      throw new Error(tunnelResponse.error);
    }

    const responseBody = tunnelResponse.body
      ? Buffer.from(tunnelResponse.body, 'base64').toString()
      : undefined;

    // Remove content-encoding header for backwards compatibility with older workers
    // The body is already decompressed, so this header would cause double-decompression errors
    const responseHeaders = { ...tunnelResponse.headers };
    delete responseHeaders['content-encoding'];

    return new Response(responseBody, {
      status: tunnelResponse.status,
      statusText: tunnelResponse.statusText || '',
      headers: responseHeaders,
    });
  };

  /**
   * Close the tunnel
   */
  async close(): Promise<void> {
    await this.ablyClient.close();
  }
}
