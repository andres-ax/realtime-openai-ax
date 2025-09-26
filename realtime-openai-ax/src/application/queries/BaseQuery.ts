/**
 * 🏗️ PATRÓN: CQRS (Command Query Responsibility Segregation)
 * 🎯 PRINCIPIO: Single Responsibility + Query Pattern
 * 
 * Interfaz base para todas las consultas del sistema
 * que NO modifican el estado (solo lectura)
 */

/**
 * 🔍 PATRÓN: Query Pattern
 * Interfaz base para consultas
 */
export interface Query {
  readonly queryId: string;
  readonly queryType: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly filters?: Record<string, unknown>;
  readonly pagination?: PaginationOptions;
}

/**
 * 📊 PATRÓN: Pagination Pattern
 * Opciones de paginación para consultas
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base para crear consultas tipadas
 */
export abstract class BaseQuery implements Query {
  public readonly queryId: string;
  public readonly queryType: string;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly filters?: Record<string, unknown>;
  public readonly pagination?: PaginationOptions;

  constructor(
    queryType: string,
    userId?: string,
    filters?: Record<string, unknown>,
    pagination?: PaginationOptions
  ) {
    this.queryId = this.generateQueryId();
    this.queryType = queryType;
    this.timestamp = new Date();
    this.userId = userId;
    this.filters = filters ? Object.freeze(filters) : undefined;
    this.pagination = pagination;
  }

  /**
   * 🎯 PATRÓN: Factory Method Pattern
   * Generación única de identificadores
   */
  private generateQueryId(): string {
    return `qry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validación de la consulta antes de ejecución
   */
  public abstract validate(): QueryValidationResult;
}

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de validación de consulta
 */
export type QueryValidationResult = {
  isValid: true;
} | {
  isValid: false;
  errors: string[];
};

/**
 * 🎯 PATRÓN: Handler Pattern
 * Interfaz para manejadores de consultas
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<QueryResult<TResult>>;
}

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de ejecución de consulta
 */
export type QueryResult<T> = {
  success: true;
  data: T;
  totalCount?: number;
  hasMore?: boolean;
} | {
  success: false;
  error: string;
  code?: string;
};

/**
 * 📊 PATRÓN: Response Wrapper Pattern
 * Wrapper para respuestas paginadas
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
