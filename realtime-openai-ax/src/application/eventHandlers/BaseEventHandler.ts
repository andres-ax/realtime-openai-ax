/**
 * 🏗️ PATRÓN: Event-Driven Architecture + Observer Pattern
 * 🎯 PRINCIPIO: Single Responsibility + Open/Closed
 * 
 * Manejador base para eventos de dominio que permite
 * procesamiento asíncrono y desacoplado
 */

import { DomainEvent } from '../../domain/events/DomainEvent';

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de procesamiento de evento
 */
export type EventHandlerResult = {
  success: true;
  processedAt: Date;
  metadata?: Record<string, unknown>;
} | {
  success: false;
  error: string;
  code?: string;
  retryable?: boolean;
};

/**
 * 🎯 PATRÓN: Handler Pattern
 * Interfaz para manejadores de eventos
 */
export interface EventHandler<TEvent extends DomainEvent> {
  handle(event: TEvent): Promise<EventHandlerResult>;
  canHandle(event: DomainEvent): boolean;
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base para manejadores de eventos
 */
export abstract class BaseEventHandler<TEvent extends DomainEvent> 
  implements EventHandler<TEvent> {

  protected readonly eventType: string;

  constructor(eventType: string) {
    this.eventType = eventType;
  }

  /**
   * 🔧 PATRÓN: Template Method Pattern
   * Flujo estándar de procesamiento de eventos
   */
  public async handle(event: TEvent): Promise<EventHandlerResult> {
    try {
      // 1. Validación del evento
      if (!this.canHandle(event)) {
        return this.createErrorResult(
          `Handler cannot process event of type: ${event.eventType}`
        );
      }

      // 2. Procesamiento específico del evento
      const result = await this.processEvent(event);

      // 3. Post-procesamiento (logging, métricas, etc.)
      await this.postProcess(event, result);

      return result;
    } catch (error) {
      const errorResult = this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'HANDLER_ERROR',
        true // retryable
      );

      await this.handleError(event, error);
      return errorResult;
    }
  }

  /**
   * 🛡️ PATRÓN: Type Guard Pattern
   * Verificación de capacidad de procesamiento
   */
  public canHandle(event: DomainEvent): boolean {
    return event.eventType === this.eventType;
  }

  /**
   * 🎯 PATRÓN: Strategy Pattern
   * Procesamiento específico por tipo de evento
   */
  protected abstract processEvent(event: TEvent): Promise<EventHandlerResult>;

  /**
   * 📊 PATRÓN: Observer Pattern
   * Post-procesamiento opcional
   */
  protected async postProcess(event: TEvent, result: EventHandlerResult): Promise<void> {
    // Logging básico
    console.log(`Event ${event.eventType} processed:`, {
      eventId: event.eventId,
      success: result.success,
      processedAt: result.success ? result.processedAt : new Date()
    });
  }

  /**
   * 🚨 PATRÓN: Error Handling Pattern
   * Manejo de errores específico
   */
  protected async handleError(event: TEvent, error: unknown): Promise<void> {
    console.error(`Error processing event ${event.eventType}:`, {
      eventId: event.eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  /**
   * 🔄 PATRÓN: Error Result Pattern
   * Creación consistente de errores
   */
  protected createErrorResult(
    error: string, 
    code?: string, 
    retryable: boolean = false
  ): EventHandlerResult {
    return {
      success: false,
      error,
      code,
      retryable
    };
  }

  /**
   * ✅ PATRÓN: Success Result Pattern
   * Creación consistente de resultados exitosos
   */
  protected createSuccessResult(metadata?: Record<string, unknown>): EventHandlerResult {
    return {
      success: true,
      processedAt: new Date(),
      metadata
    };
  }
}

/**
 * 📡 PATRÓN: Event Bus Pattern
 * Interfaz para el bus de eventos
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<TEvent extends DomainEvent>(
    eventType: string, 
    handler: EventHandler<TEvent>
  ): void;
  unsubscribe(eventType: string, handler: EventHandler<DomainEvent>): void;
}
