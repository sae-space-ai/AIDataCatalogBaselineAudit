// ============================================================
// INFRASTRUCTURE — API Client
// ============================================================
//
// Client for communicating with the backend API.
// 
// This client is used when the application is in REAL mode.
// It makes HTTP requests to the backend API endpoints.
//
// IMPORTANT: This client NEVER sends secrets to the backend.
// Authentication is handled separately (future enhancement).
//

import type { ApplicationConfig } from '../app/config';

/**
 * API client configuration.
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * API response structure.
 */
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Health check response.
 */
export interface HealthResponse {
  application: 'READY' | 'DEGRADED' | 'ERROR';
  api: 'READY' | 'NOT_CONFIGURED' | 'UNREACHABLE' | 'ERROR';
  mode: 'DEMO' | 'REAL';
  persistence: 'IN_MEMORY' | 'POSTGRESQL' | 'NOT_CONFIGURED';
  database: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'NOT_AVAILABLE';
  version: string;
  timestamp: string;
}

/**
 * Source data.
 */
export interface Source {
  id: string;
  name: string;
  type: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastScanAt?: string;
}

/**
 * API client for backend communication.
 */
export class ApiClient {
  private config: ApiClientConfig;
  
  constructor(config: ApiClientConfig) {
    this.config = config;
  }
  
  /**
   * Make a GET request.
   */
  private async get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(path, this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: this.config.timeout
        ? AbortSignal.timeout(this.config.timeout)
        : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}`,
        },
      }));
      
      return { error: error.error };
    }
    
    const data = await response.json();
    return { data };
  }
  
  /**
   * Make a POST request.
   */
  private async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const url = new URL(path, this.config.baseUrl);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: this.config.timeout
        ? AbortSignal.timeout(this.config.timeout)
        : undefined,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}`,
        },
      }));
      
      return { error: error.error };
    }
    
    const data = await response.json();
    return { data };
  }
  
  /**
   * Check API health.
   */
  async health(): Promise<ApiResponse<HealthResponse>> {
    return this.get<HealthResponse>('/api/health');
  }
  
  /**
   * List sources.
   */
  async listSources(params?: { page?: number; limit?: number }): Promise<ApiResponse<{ sources: Source[]; total: number }>> {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    
    return this.get('/api/sources', queryParams);
  }
  
  /**
   * Create a source.
   */
  async createSource(source: {
    name: string;
    type: string;
    description?: string;
    configuration: unknown;
  }): Promise<ApiResponse<{ id: string }>> {
    return this.post('/api/sources', source);
  }
  
  /**
   * Test source connection.
   */
  async testConnection(sourceId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.post(`/api/sources/${sourceId}/test`);
  }
  
  /**
   * Run scan on source.
   */
  async runScan(sourceId: string): Promise<ApiResponse<{ scanRunId: string; status: string }>> {
    return this.post(`/api/sources/${sourceId}/scan`);
  }
}

/**
 * Create an API client from application config.
 */
export function createApiClient(config: ApplicationConfig): ApiClient | null {
  if (!config.apiBaseUrl) {
    return null;
  }
  
  return new ApiClient({
    baseUrl: config.apiBaseUrl,
    timeout: 30000, // 30 seconds
  });
}

/**
 * Check if the API is reachable and healthy.
 */
export async function checkApiHealth(apiBaseUrl: string): Promise<{
  reachable: boolean;
  health?: HealthResponse;
  error?: string;
}> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });
    
    if (!response.ok) {
      return {
        reachable: false,
        error: `HTTP ${response.status}`,
      };
    }
    
    const health = await response.json();
    
    return {
      reachable: true,
      health,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
