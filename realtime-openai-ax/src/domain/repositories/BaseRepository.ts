/**
 * 🏗️ PATRÓN: Repository Pattern
 * 🎯 PRINCIPIO: Dependency Inversion + Interface Segregation
 * 
 * Interfaz base para repositorios que abstrae
 * el acceso a datos del dominio
 */

import { BaseEntity } from '../entities/BaseEntity';

/**
 * 🔄 PATRÓN: Result Pattern
 * Tipo para manejo explícito de errores
 */
export type RepositoryResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: string;
};

/**
 * 🎯 PATRÓN: Generic Repository Pattern
 * Interfaz genérica para operaciones CRUD
 */
export interface BaseRepository<TEntity extends BaseEntity<TId>, TId> {
  /**
   * 🔍 PATRÓN: Query Pattern
   * Búsqueda por identificador único
   */
  findById(id: TId): Promise<RepositoryResult<TEntity | null>>;

  /**
   * 🔍 PATRÓN: Specification Pattern (preparado)
   * Búsqueda con criterios específicos
   */
  findAll(): Promise<RepositoryResult<TEntity[]>>;

  /**
   * 💾 PATRÓN: Command Pattern
   * Persistencia de entidad
   */
  save(entity: TEntity): Promise<RepositoryResult<TEntity>>;

  /**
   * 🗑️ PATRÓN: Command Pattern
   * Eliminación de entidad
   */
  delete(id: TId): Promise<RepositoryResult<boolean>>;

  /**
   * 📊 PATRÓN: Query Pattern
   * Verificación de existencia
   */
  exists(id: TId): Promise<RepositoryResult<boolean>>;
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base con funcionalidades comunes
 */
export abstract class AbstractRepository<TEntity extends BaseEntity<TId>, TId> 
  implements BaseRepository<TEntity, TId> {

  /**
   * 🛡️ PATRÓN: Fail-Fast Pattern
   * Validación temprana de parámetros
   */
  protected validateId(id: TId): void {
    if (id === null || id === undefined) {
      throw new Error('ID cannot be null or undefined');
    }
  }

  /**
   * 🔄 PATRÓN: Error Handling Pattern
   * Manejo consistente de errores
   */
  protected createErrorResult<T>(error: string, code?: string): RepositoryResult<T> {
    return {
      success: false,
      error,
      code
    };
  }

  /**
   * ✅ PATRÓN: Success Pattern
   * Resultado exitoso tipado
   */
  protected createSuccessResult<T>(data: T): RepositoryResult<T> {
    return {
      success: true,
      data
    };
  }

  // Métodos abstractos que deben implementar las clases derivadas
  abstract findById(id: TId): Promise<RepositoryResult<TEntity | null>>;
  abstract findAll(): Promise<RepositoryResult<TEntity[]>>;
  abstract save(entity: TEntity): Promise<RepositoryResult<TEntity>>;
  abstract delete(id: TId): Promise<RepositoryResult<boolean>>;
  abstract exists(id: TId): Promise<RepositoryResult<boolean>>;
}
