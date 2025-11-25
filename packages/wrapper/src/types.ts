/**
 * Tunnel protocol types for MCP tunnel communication
 */

/**
 * HTTP request sent through the tunnel
 */
export interface TunnelRequest {
  /** Unique request identifier (UUID v4) */
  requestId: string;
  /** Tenant/customer identifier */
  tenantId: string;
  /** HTTP method */
  method: string;
  /** Full URL */
  url: string;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Request body (Base64-encoded for binary data) */
  body?: string;
  /** Unix timestamp (ms) */
  timestamp: number;
}

/**
 * HTTP response received through the tunnel
 */
export interface TunnelResponse {
  /** Matches TunnelRequest.requestId */
  requestId: string;
  /** Tenant/customer identifier */
  tenantId: string;
  /** HTTP status code */
  status: number;
  /** HTTP status text (e.g., "Bad Request", "Not Found") */
  statusText?: string;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Response body (Base64-encoded for binary data) */
  body?: string;
  /** Error message if request failed */
  error?: string;
  /** Unix timestamp (ms) */
  timestamp: number;
}

/**
 * Tunnel configuration
 */
export interface TunnelConfig {
  /** Ably API key */
  ablyApiKey: string;
  /** Tenant ID */
  tenantId: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}
