import Ably from 'ably';
import { TunnelRequest, TunnelResponse, TunnelConfig } from './types';

/**
 * Ably client for the wrapper
 * Publishes requests and subscribes to responses
 */
export class AblyTunnelClient {
  private client: Ably.Realtime;
  private requestChannel: Ably.RealtimeChannel;
  private responseChannel: Ably.RealtimeChannel;

  constructor(config: TunnelConfig) {
    this.client = new Ably.Realtime({
      key: config.ablyApiKey,
      echoMessages: false,
    });

    // Initialize channels
    const channelPrefix = `mcp-tunnel:${config.tenantId}`;
    this.requestChannel = this.client.channels.get(`${channelPrefix}:requests`);
    this.responseChannel = this.client.channels.get(`${channelPrefix}:responses`);
  }

  /**
   * Wait for connection to Ably
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ably connection timeout'));
      }, 10000);

      this.client.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.connection.once('failed', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Publish a request to the tunnel
   */
  async publishRequest(request: TunnelRequest): Promise<void> {
    await this.requestChannel.publish('request', request);
  }

  /**
   * Subscribe to responses for a specific request
   */
  async subscribeToResponse(
    requestId: string,
    callback: (response: TunnelResponse) => void
  ): Promise<void> {
    const handler = (message: Ably.Message) => {
      const response = message.data as TunnelResponse;
      if (response.requestId === requestId) {
        callback(response);
        // Unsubscribe after receiving the response
        this.responseChannel.unsubscribe('response', handler);
      }
    };

    await this.responseChannel.subscribe('response', handler);
  }

  /**
   * Close the Ably connection
   */
  async close(): Promise<void> {
    this.client.close();
  }
}
