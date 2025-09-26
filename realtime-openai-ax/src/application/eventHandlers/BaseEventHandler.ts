/**
 * 🏗️ PATRÓN: Base Event Handler Pattern (Event-Driven Architecture)
 * 🎯 PRINCIPIO: Event Handler Base Class + Browser Events + Real-time Demo
 * 
 * BaseEventHandler - Clase base para todos los manejadores de eventos
 * Optimizada para demostración en navegador sin infraestructura compleja
 */

import { DomainEvent } from '../../domain/events/DomainEvent';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🎯 PATRÓN: Abstract Base Class Pattern
 * BaseEventHandler define la estructura común de todos los event handlers
 */
export abstract class BaseEventHandler<T extends DomainEvent> {
  
  public readonly handlerId: string;
  public readonly eventType: string;
  public readonly createdAt: Date;
  private _isActive: boolean = true;
  private _processedEvents: Set<string> = new Set();

  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor base con ID y tipo de evento
   */
  constructor(eventType: string, handlerId?: string) {
    this.handlerId = handlerId || uuidv4();
    this.eventType = eventType;
    this.createdAt = new Date();
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Método abstracto de manejo que deben implementar las subclases
   */
  public abstract handle(event: T): Promise<EventHandlerResult>;

  /**
   * 📊 PATRÓN: Event Validation Pattern
   * Método abstracto para validar eventos antes del procesamiento
   */
  public abstract canHandle(event: DomainEvent): boolean;

  /**
   * 🔄 PATRÓN: Event Processing Pipeline Pattern
   * Pipeline completo de procesamiento de eventos
   */
  public async process(event: T): Promise<EventHandlerResult> {
    try {
      // 1. Verificar si el handler está activo
      if (!this._isActive) {
        return {
          success: false,
          error: 'Event handler is not active',
          handlerId: this.handlerId,
          eventId: event.eventId,
          skipped: true
        };
      }

      // 2. Verificar si puede manejar el evento
      if (!this.canHandle(event)) {
        return {
          success: false,
          error: `Handler cannot process event type: ${event.eventType}`,
          handlerId: this.handlerId,
          eventId: event.eventId,
          skipped: true
        };
      }

      // 3. Verificar duplicados
      if (this._processedEvents.has(event.eventId)) {
        return {
          success: true,
          message: 'Event already processed (duplicate)',
          handlerId: this.handlerId,
          eventId: event.eventId,
          skipped: true,
          isDuplicate: true
        };
      }

      // 4. Validar evento
      const validation = this.validateEvent(event);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error!,
          handlerId: this.handlerId,
          eventId: event.eventId,
          validationErrors: validation.errors
        };
      }

      // 5. Procesar evento
      const startTime = Date.now();
      const result = await this.handle(event);
      const processingTime = Date.now() - startTime;

      // 6. Marcar como procesado si fue exitoso
      if (result.success) {
        this._processedEvents.add(event.eventId);
        
        // Limpiar eventos antiguos para evitar memory leaks
        this.cleanupOldEvents();
      }

      // 7. Agregar metadatos de procesamiento
      return {
        ...result,
        handlerId: this.handlerId,
        eventId: event.eventId,
        processingTime,
        processedAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Event processing failed',
        handlerId: this.handlerId,
        eventId: event.eventId,
        processingTime: 0
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Event Validation Pattern
   * Validar estructura y contenido del evento
   */
  protected validateEvent(event: T): EventValidationResult {
    const errors: string[] = [];

    if (!event.eventId) errors.push('Event ID is required');
    if (!event.eventType) errors.push('Event type is required');
    if (!event.aggregateId) errors.push('Aggregate ID is required');
    if (!event.occurredOn) errors.push('Occurred on timestamp is required');

    // Validar que el evento no sea muy antiguo (más de 1 hora)
    const eventAge = Date.now() - new Date(event.occurredOn).getTime();
    if (eventAge > 3600000) { // 1 hora
      errors.push('Event is too old to process');
    }

    return {
      isValid: errors.length === 0,
      errors,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 🔄 PATRÓN: Handler State Management Pattern
   * Gestión del estado del handler
   */
  public activate(): void {
    this._isActive = true;
  }

  public deactivate(): void {
    this._isActive = false;
  }

  public isActive(): boolean {
    return this._isActive;
  }

  /**
   * 📊 PATRÓN: Handler Metrics Pattern
   * Obtener métricas del handler
   */
  public getMetrics(): EventHandlerMetrics {
    return {
      handlerId: this.handlerId,
      eventType: this.eventType,
      isActive: this._isActive,
      processedEventCount: this._processedEvents.size,
      createdAt: this.createdAt,
      uptime: Date.now() - this.createdAt.getTime()
    };
  }

  /**
   * 🗑️ PATRÓN: Memory Management Pattern
   * Limpiar eventos antiguos para evitar memory leaks
   */
  private cleanupOldEvents(): void {
    // Mantener solo los últimos 100 eventos procesados
    if (this._processedEvents.size > 100) {
      const eventsArray = Array.from(this._processedEvents);
      const toKeep = eventsArray.slice(-50); // Mantener los últimos 50
      this._processedEvents = new Set(toKeep);
    }
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
   * 📋 PATRÓN: Storage Keys Pattern
   * Generar claves consistentes para el storage
   */
  protected getStorageKey(entity: string, id?: string): string {
    const prefix = 'realtime-openai-ax';
    return id ? `${prefix}:${entity}:${id}` : `${prefix}:${entity}`;
  }

  /**
   * 📡 PATRÓN: Event Broadcasting Pattern
   * Emitir eventos del navegador para comunicación en tiempo real
   */
  protected emitBrowserEvent(eventName: string, data: unknown): void {
    if (typeof window === 'undefined') return;
    
    try {
      const customEvent = new CustomEvent(eventName, {
        detail: data,
        bubbles: true
      });
      window.dispatchEvent(customEvent);
    } catch (error) {
      console.warn(`Failed to emit browser event: ${error}`);
    }
  }

  /**
   * 🎯 PATRÓN: Handler Identification Pattern
   * Verificar si este handler puede procesar un tipo específico de evento
   */
  public handlesEventType(eventType: string): boolean {
    return this.eventType === eventType;
  }

  /**
   * 📝 PATRÓN: Handler Logging Pattern
   * Log estructurado para debugging
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      handlerId: this.handlerId,
      eventType: this.eventType,
      level,
      message,
      data
    };

    console[level](`[EventHandler:${this.eventType}]`, logEntry);
  }

  /**
   * 🔄 PATRÓN: Handler Reset Pattern
   * Resetear estado del handler
   */
  public reset(): void {
    this._processedEvents.clear();
    this._isActive = true;
  }

  /**
   * 📊 PATRÓN: Handler Summary Pattern
   * Obtener resumen del handler
   */
  public getSummary(): EventHandlerSummary {
    return {
      handlerId: this.handlerId,
      eventType: this.eventType,
      isActive: this._isActive,
      processedEventCount: this._processedEvents.size,
      createdAt: this.createdAt,
      uptime: Date.now() - this.createdAt.getTime()
    };
  }
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado del procesamiento de eventos
 */
export interface EventHandlerResult {
  success: boolean;
  message?: string;
  error?: string;
  handlerId?: string;
  eventId?: string;
  processingTime?: number;
  processedAt?: Date;
  skipped?: boolean;
  isDuplicate?: boolean;
  validationErrors?: string[];
  sideEffects?: SideEffect[];
}

/**
 * 🛡️ PATRÓN: Validation Result Pattern
 * Resultado de validación de eventos
 */
export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  error?: string;
}

/**
 * 📊 PATRÓN: Metrics Pattern
 * Métricas del event handler
 */
export interface EventHandlerMetrics {
  handlerId: string;
  eventType: string;
  isActive: boolean;
  processedEventCount: number;
  createdAt: Date;
  uptime: number;
}

/**
 * 📊 PATRÓN: Summary Pattern
 * Resumen del event handler
 */
export interface EventHandlerSummary {
  handlerId: string;
  eventType: string;
  isActive: boolean;
  processedEventCount: number;
  createdAt: Date;
  uptime: number;
}

/**
 * 🔄 PATRÓN: Side Effect Pattern
 * Efectos secundarios del procesamiento de eventos
 */
export interface SideEffect {
  type: 'STORAGE_UPDATE' | 'BROWSER_EVENT' | 'API_CALL' | 'UI_UPDATE' | 'NOTIFICATION';
  description: string;
  success: boolean;
  error?: string;
  data?: unknown;
}