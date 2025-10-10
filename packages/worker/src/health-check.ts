import { createServer, IncomingMessage, ServerResponse } from 'http';

/**
 * Health check HTTP server
 */
export class HealthCheckServer {
  private server?: ReturnType<typeof createServer>;
  private port: number;
  private isHealthy: boolean;

  constructor(port: number = 8080) {
    this.port = port;
    this.isHealthy = false;
  }

  /**
   * Start the health check server
   */
  start(): void {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health' && req.method === 'GET') {
        this.handleHealthCheck(res);
      } else if (req.url === '/ready' && req.method === 'GET') {
        this.handleReadyCheck(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(`[Health Check] Server listening on port ${this.port}`);
    });
  }

  /**
   * Handle /health endpoint
   */
  private handleHealthCheck(res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Handle /ready endpoint (readiness probe)
   */
  private handleReadyCheck(res: ServerResponse): void {
    if (this.isHealthy) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ready',
          timestamp: new Date().toISOString(),
        })
      );
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'not ready',
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Mark the service as healthy/ready
   */
  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  /**
   * Stop the health check server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
    }
  }
}
