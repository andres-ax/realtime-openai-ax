/**
 * 🏗️ PATRÓN: Adapter Pattern + Hexagonal Architecture
 * 🎯 PRINCIPIO: Dependency Inversion + Interface Segregation
 * 
 * Adaptador base para integraciones con APIs externas
 * que abstrae los detalles de comunicación HTTP
 */

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de operaciones de API
 */
export type ApiResult<T> = {
  success: true;
  data: T;
  statusCode: number;
  headers?: Record<string, string>;
} | {
  success: false;
  error: string;
  statusCode?: number;
  code?: string;
};

/**
 * 📊 PATRÓN: Configuration Pattern
 * Configuración del adaptador
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
  apiKey?: string;
}

/**
 * 🔄 PATRÓN: Retry Pattern
 * Configuración de reintentos
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  retryableStatusCodes: number[];
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base para adaptadores de API
 */
export abstract class BaseApiAdapter {
  protected readonly config: ApiConfig;
  protected readonly retryConfig: RetryConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.retryConfig = {
      maxRetries: config.retries,
      backoffMs: 1000,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
    };
  }

  /**
   * 🌐 PATRÓN: HTTP Client Pattern
   * Método GET con reintentos
   */
  protected async get<T>(
    endpoint: string, 
    params?: Record<string, string>
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(endpoint, params);
    return this.executeWithRetry(() => this.performGet<T>(url));
  }

  /**
   * 🌐 PATRÓN: HTTP Client Pattern
   * Método POST con reintentos
   */
  protected async post<T>(
    endpoint: string, 
    data?: unknown
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry(() => this.performPost<T>(url, data));
  }

  /**
   * 🌐 PATRÓN: HTTP Client Pattern
   * Método PUT con reintentos
   */
  protected async put<T>(
    endpoint: string, 
    data?: unknown
  ): Promise<ApiResult<T>> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry(() => this.performPut<T>(url, data));
  }

  /**
   * 🌐 PATRÓN: HTTP Client Pattern
   * Método DELETE con reintentos
   */
  protected async delete<T>(endpoint: string): Promise<ApiResult<T>> {
    const url = this.buildUrl(endpoint);
    return this.executeWithRetry(() => this.performDelete<T>(url));
  }

  /**
   * 🔄 PATRÓN: Retry Pattern
   * Ejecución con reintentos automáticos
   */
  private async executeWithRetry<T>(
    operation: () => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> {
    let lastError: ApiResult<T> | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (result.success || !this.shouldRetry(result)) {
          return result;
        }

        lastError = result;
        
        if (attempt < this.retryConfig.maxRetries) {
          await this.delay(this.retryConfig.backoffMs * Math.pow(2, attempt));
        }
      } catch (error) {
        lastError = this.createErrorResult(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    return lastError || this.createErrorResult('Max retries exceeded');
  }

  /**
   * 🛡️ PATRÓN: Guard Pattern
   * Verificación de si se debe reintentar
   */
  private shouldRetry(result: ApiResult<unknown>): boolean {
    if (result.success) return false;
    
    return result.statusCode ? 
      this.retryConfig.retryableStatusCodes.includes(result.statusCode) : 
      false;
  }

  /**
   * 🔧 PATRÓN: URL Builder Pattern
   * Construcción de URLs con parámetros
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const baseUrl = this.config.baseUrl.endsWith('/') ? 
      this.config.baseUrl.slice(0, -1) : 
      this.config.baseUrl;
    
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }

  /**
   * ⏱️ PATRÓN: Delay Pattern
   * Delay para reintentos
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🔄 PATRÓN: Error Result Pattern
   * Creación consistente de errores
   */
  protected createErrorResult<T>(
    error: string, 
    statusCode?: number, 
    code?: string
  ): ApiResult<T> {
    return {
      success: false,
      error,
      statusCode,
      code
    };
  }

  /**
   * ✅ PATRÓN: Success Result Pattern
   * Creación consistente de resultados exitosos
   */
  protected createSuccessResult<T>(
    data: T, 
    statusCode: number, 
    headers?: Record<string, string>
  ): ApiResult<T> {
    return {
      success: true,
      data,
      statusCode,
      headers
    };
  }

  // Métodos abstractos que deben implementar las clases derivadas
  protected abstract performGet<T>(url: string): Promise<ApiResult<T>>;
  protected abstract performPost<T>(url: string, data?: unknown): Promise<ApiResult<T>>;
  protected abstract performPut<T>(url: string, data?: unknown): Promise<ApiResult<T>>;
  protected abstract performDelete<T>(url: string): Promise<ApiResult<T>>;
}
