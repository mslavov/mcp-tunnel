import Ably from 'ably';
import { TunnelRequest, TunnelResponse, TunnelConfig } from './types';
import { logger } from './logger';

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
   * Wait for connection to Ably with reconnection logic
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Ably connection timeout'));
      }, 10000);

      this.client.connection.once('connected', () => {
        clearTimeout(timeout);
        logger.log('[Wrapper]', 'Connected to Ably');
        resolve();
      });

      this.client.connection.once('failed', (error) => {
        clearTimeout(timeout);
        logger.error('[Wrapper]', 'Failed to connect to Ably:', error);
        reject(error);
      });

      // Set up reconnection handlers
      this.setupReconnectionHandlers();
    });
  }

  /**
   * Set up automatic reconnection with exponential backoff
   */
  private setupReconnectionHandlers(): void {
    this.client.connection.on('disconnected', () => {
      logger.warn('[Wrapper]', 'Disconnected from Ably');
    });

    this.client.connection.on('suspended', () => {
      logger.warn('[Wrapper]', 'Connection suspended, will retry...');
    });

    this.client.connection.on('connected', () => {
      logger.log('[Wrapper]', 'Reconnected to Ably');
    });

    this.client.connection.on('failed', (error) => {
      logger.error('[Wrapper]', 'Connection failed:', error);
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
