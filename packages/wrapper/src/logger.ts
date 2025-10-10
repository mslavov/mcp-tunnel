import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * File-based logger for MCP tunnel
 * Logs to ~/.mcp-tunnel/wrapper.log to avoid polluting stdio
 */
class Logger {
  private logDir: string;
  private logFile: string;
  private enabled: boolean;

  constructor() {
    // Only enable logging if MCP_TUNNEL_LOG_LEVEL is set
    this.enabled = !!process.env.MCP_TUNNEL_DEBUG;

    // Use home directory for log storage
    this.logDir = '.mcp-tunnel';
    this.logFile = join(this.logDir, 'wrapper.log');

    // Ensure log directory exists only if logging is enabled
    if (this.enabled) {
      this.ensureLogDir();
    }
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, prefix: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    return `[${timestamp}] [${level}] ${prefix} ${message}\n`;
  }

  log(prefix: string, ...args: any[]): void {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage('INFO', prefix, ...args);
      appendFileSync(this.logFile, message);
    } catch (error) {
      // Silently fail if we can't write to log file
    }
  }

  error(prefix: string, ...args: any[]): void {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage('ERROR', prefix, ...args);
      appendFileSync(this.logFile, message);
    } catch (error) {
      // Silently fail if we can't write to log file
    }
  }

  warn(prefix: string, ...args: any[]): void {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage('WARN', prefix, ...args);
      appendFileSync(this.logFile, message);
    } catch (error) {
      // Silently fail if we can't write to log file
    }
  }
}

// Export singleton instance
export const logger = new Logger();
