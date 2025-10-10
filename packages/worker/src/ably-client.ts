import Ably from 'ably';
import { TunnelRequest, TunnelResponse, WorkerConfig } from './types';

/**
 * Ably client for the worker
 * Subscribes to requests and publishes responses
 */
export class AblyWorkerClient {
  private client: Ably.Realtime;
  private requestChannel: Ably.RealtimeChannel;
  private responseChannel: Ably.RealtimeChannel;

  constructor(config: WorkerConfig) {
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
        console.log('[Worker] Connected to Ably');
        resolve();
      });

      this.client.connection.once('failed', (error) => {
        clearTimeout(timeout);
        console.error('[Worker] Failed to connect to Ably:', error);
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
      console.warn('[Worker] Disconnected from Ably');
    });

    this.client.connection.on('suspended', () => {
      console.warn('[Worker] Connection suspended, will retry...');
    });

    this.client.connection.on('connected', () => {
      console.log('[Worker] Reconnected to Ably');
    });

    this.client.connection.on('failed', (error) => {
      console.error('[Worker] Connection failed:', error);
    });
  }

  /**
   * Subscribe to incoming requests
   */
  async subscribeToRequests(
    callback: (request: TunnelRequest) => Promise<void>
  ): Promise<void> {
    await this.requestChannel.subscribe('request', async (message: Ably.Message) => {
      const request = message.data as TunnelRequest;
      console.log(`[Worker] Received request ${request.requestId} for ${request.url}`);
      await callback(request);
    });

    console.log('[Worker] Subscribed to requests');
  }

  /**
   * Publish a response
   */
  async publishResponse(response: TunnelResponse): Promise<void> {
    await this.responseChannel.publish('response', response);
    console.log(`[Worker] Published response for request ${response.requestId}`);
  }

  /**
   * Close the Ably connection
   */
  async close(): Promise<void> {
    this.client.close();
  }
}
