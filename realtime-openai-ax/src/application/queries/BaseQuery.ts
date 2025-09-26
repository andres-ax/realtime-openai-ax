/**
 * 🏗️ PATRÓN: Base Query Pattern (CQRS)
 * 🎯 PRINCIPIO: Query Base Class + Browser Storage + Real-time Demo
 * 
 * BaseQuery - Clase base para todas las queries
 * Optimizada para demostración en navegador sin base de datos
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 🎯 PATRÓN: Abstract Base Class Pattern
 * BaseQuery define la estructura común de todas las queries
 */
export abstract class BaseQuery {
  
  public readonly queryId: string;
  public readonly timestamp: Date;

  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor base con ID y timestamp automáticos
   */
  constructor(queryId?: string) {
    this.queryId = queryId || uuidv4();
    this.timestamp = new Date();
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Método abstracto de validación que deben implementar las subclases
   */
  public abstract validate(): QueryValidationResult;

  /**
   * 📊 PATRÓN: Metadata Pattern
   * Método abstracto para obtener metadatos específicos de la query
   */
  public abstract getMetadata(): QueryMetadata;

  /**
   * 🔄 PATRÓN: Serialization Pattern
   * Método abstracto para serialización específica de la query
   */
  public abstract serialize(): SerializedQuery;

  /**
   * ⏱️ PATRÓN: Age Calculation Pattern
   * Calcular edad de la query en milisegundos
   */
  public getAge(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * ⏰ PATRÓN: Expiration Pattern
   * Verificar si la query ha expirado (para cache)
   */
  public isExpired(maxAgeMs: number = 30000): boolean { // 30 segundos por defecto
    return this.getAge() > maxAgeMs;
  }

  /**
   * 🔍 PATRÓN: Query Inspection Pattern
   * Verificar si la query es del tipo especificado
   */
  public isOfType(queryType: string): boolean {
    return this.getMetadata().queryType === queryType;
  }

  /**
   * 📊 PATRÓN: Query Summary Pattern
   * Obtener resumen básico de la query
   */
  public getSummary(): QuerySummary {
    const metadata = this.getMetadata();
    return {
      queryId: this.queryId,
      queryType: metadata.queryType,
      timestamp: this.timestamp,
      age: this.getAge(),
      isExpired: this.isExpired(),
      isCacheable: metadata.isCacheable,
      estimatedDuration: metadata.estimatedDuration
    };
  }

  /**
   * 🎯 PATRÓN: Query Equality Pattern
   * Comparar queries por ID
   */
  public equals(other: BaseQuery): boolean {
    return this.queryId === other.queryId;
  }

  /**
   * 📝 PATRÓN: String Representation Pattern
   * Representación en string de la query
   */
  public toString(): string {
    const metadata = this.getMetadata();
    return `${metadata.queryType}[${this.queryId}] at ${this.timestamp.toISOString()}`;
  }

  /**
   * 🏪 PATRÓN: Browser Storage Pattern
   * Obtener datos desde localStorage/sessionStorage
   */
  protected getBrowserStorage(key: string, useSession: boolean = false): unknown {
    if (typeof window === 'undefined') return null;
    
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const data = storage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Failed to read from browser storage: ${error}`);
      return null;
    }
  }

  /**
   * 💾 PATRÓN: Browser Storage Pattern
   * Guardar datos en localStorage/sessionStorage
   */
  protected setBrowserStorage(key: string, data: unknown, useSession: boolean = false): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to write to browser storage: ${error}`);
    }
  }

  /**
   * 🗑️ PATRÓN: Browser Storage Pattern
   * Limpiar datos del storage
   */
  protected clearBrowserStorage(key: string, useSession: boolean = false): void {
    if (typeof window === 'undefined') return;
    
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear browser storage: ${error}`);
    }
  }

  /**
   * 📋 PATRÓN: Storage Keys Pattern
   * Generar claves consistentes para el storage
   */
  protected getStorageKey(entity: string, id?: string): string {
    const prefix = 'realtime-openai-ax';
    return id ? `${prefix}:${entity}:${id}` : `${prefix}:${entity}`;
  }
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de validación de query
 */
export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  errorMessage?: string;
}

/**
 * 📊 PATRÓN: Metadata Pattern
 * Metadatos de la query
 */
export interface QueryMetadata {
  queryType: string;
  queryId: string;
  timestamp: Date;
  sessionId?: string;
  customerId?: string;
  targetResource?: string;
  isCacheable: boolean;
  cacheKey?: string;
  estimatedDuration: number;
  requiresRealTimeData: boolean;
  dataSource: 'BROWSER_STORAGE' | 'SESSION_STORAGE' | 'MEMORY' | 'COMPUTED';
}

/**
 * 📊 PATRÓN: Serialization Pattern
 * Query serializada
 */
export interface SerializedQuery {
  queryType: string;
  queryId: string;
  timestamp: string;
  parameters: Record<string, unknown>;
}

/**
 * 📊 PATRÓN: Summary Pattern
 * Resumen de la query
 */
export interface QuerySummary {
  queryId: string;
  queryType: string;
  timestamp: Date;
  age: number;
  isExpired: boolean;
  isCacheable: boolean;
  estimatedDuration: number;
}