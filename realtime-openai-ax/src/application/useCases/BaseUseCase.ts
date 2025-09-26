/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + Dependency Inversion
 * 
 * Clase base para casos de uso que orquestan
 * la lógica de aplicación sin depender de detalles de implementación
 */

import { DomainEvent } from '../../domain/events/DomainEvent';

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de ejecución de caso de uso
 */
export type UseCaseResult<T> = {
  success: true;
  data: T;
  events?: DomainEvent[];
} | {
  success: false;
  error: string;
  code?: string;
};

/**
 * 🎯 PATRÓN: Template Method Pattern
 * Interfaz base para casos de uso
 */
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<UseCaseResult<TResponse>>;
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base con funcionalidades comunes
 */
export abstract class BaseUseCase<TRequest, TResponse> 
  implements UseCase<TRequest, TResponse> {

  /**
   * 🔧 PATRÓN: Template Method Pattern
   * Flujo de ejecución estándar
   */
  public async execute(request: TRequest): Promise<UseCaseResult<TResponse>> {
    try {
      // 1. Validación de entrada
      const validationResult = await this.validateRequest(request);
      if (!validationResult.isValid) {
        return this.createErrorResult(
          `Validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // 2. Ejecución de la lógica de negocio
      const result = await this.executeBusinessLogic(request);
      
      // 3. Procesamiento de eventos de dominio (si los hay)
      if (result.success && result.events && result.events.length > 0) {
        await this.publishDomainEvents(result.events);
      }

      return result;
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validación específica por caso de uso
   */
  protected abstract validateRequest(request: TRequest): Promise<ValidationResult>;

  /**
   * 🎯 PATRÓN: Strategy Pattern
   * Lógica de negocio específica
   */
  protected abstract executeBusinessLogic(request: TRequest): Promise<UseCaseResult<TResponse>>;

  /**
   * 📡 PATRÓN: Event-Driven Architecture
   * Publicación de eventos de dominio
   */
  protected async publishDomainEvents(events: DomainEvent[]): Promise<void> {
    // TODO: Implementar publicador de eventos
    // Por ahora solo registramos los eventos
    console.log(`Publishing ${events.length} domain events:`, events.map(e => e.eventType));
  }

  /**
   * 🔄 PATRÓN: Error Handling Pattern
   * Creación consistente de errores
   */
  protected createErrorResult(error: string, code?: string): UseCaseResult<TResponse> {
    return {
      success: false,
      error,
      code
    };
  }

  /**
   * ✅ PATRÓN: Success Pattern
   * Creación consistente de resultados exitosos
   */
  protected createSuccessResult(data: TResponse, events?: DomainEvent[]): UseCaseResult<TResponse> {
    return {
      success: true,
      data,
      events
    };
  }
}

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de validación
 */
export type ValidationResult = {
  isValid: true;
} | {
  isValid: false;
  errors: string[];
};
