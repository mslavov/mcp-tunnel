import { spawn, ChildProcess } from 'child_process';
import { TunnelFetch } from './tunnel-fetch';

/**
 * Configuration for spawning an MCP server
 */
export interface McpSpawnerConfig {
  /** Path to the MCP server executable or script */
  serverPath: string;
  /** Arguments to pass to the MCP server */
  serverArgs?: string[];
  /** Environment variables for the MCP server */
  env?: Record<string, string>;
  /** Tunnel fetch instance to inject */
  tunnelFetch: TunnelFetch;
}

/**
 * Spawns and manages an MCP server process with tunneled fetch
 */
export class McpSpawner {
  private childProcess?: ChildProcess;
  private config: McpSpawnerConfig;

  constructor(config: McpSpawnerConfig) {
    this.config = config;
  }

  /**
   * Spawn the MCP server and set up stdio forwarding
   */
  async spawn(): Promise<void> {
    const { serverPath, serverArgs = [], env = {} } = this.config;

    // Merge environment variables
    const processEnv = {
      ...process.env,
      ...env,
      // Signal to the MCP server that it's running in tunneled mode
      MCP_TUNNEL_ENABLED: 'true',
    };

    console.log('[Spawner] Starting MCP server:', serverPath);

    // Spawn the MCP server process
    this.childProcess = spawn(serverPath, serverArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: processEnv,
    });

    // Override global fetch in the child process context
    // Note: This is tricky because we can't directly inject into child process
    // We'll need to handle this differently - see the preload approach below
    this.setupStdioForwarding();
    this.setupErrorHandling();
  }

  /**
   * Set up stdio forwarding between parent process and MCP server
   */
  private setupStdioForwarding(): void {
    if (!this.childProcess) {
      throw new Error('Child process not spawned');
    }

    // Forward stdin from parent to child (AI assistant → MCP server)
    process.stdin.pipe(this.childProcess.stdin!);

    // Forward stdout from child to parent (MCP server → AI assistant)
    this.childProcess.stdout!.pipe(process.stdout);

    // Forward stderr to parent's stderr for debugging
    this.childProcess.stderr!.on('data', (data) => {
      console.error('[MCP Server stderr]:', data.toString());
    });

    console.log('[Spawner] Stdio forwarding established');
  }

  /**
   * Set up error handling for the child process
   */
  private setupErrorHandling(): void {
    if (!this.childProcess) {
      throw new Error('Child process not spawned');
    }

    this.childProcess.on('error', (error) => {
      console.error('[Spawner] MCP server process error:', error);
      process.exit(1);
    });

    this.childProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[Spawner] MCP server exited with code ${code}`);
        process.exit(code);
      } else if (signal) {
        console.error(`[Spawner] MCP server killed by signal ${signal}`);
        process.exit(1);
      } else {
        console.log('[Spawner] MCP server exited successfully');
        process.exit(0);
      }
    });
  }

  /**
   * Kill the MCP server process
   */
  async kill(): Promise<void> {
    if (this.childProcess) {
      console.log('[Spawner] Killing MCP server process');
      this.childProcess.kill('SIGTERM');
    }
  }
}
