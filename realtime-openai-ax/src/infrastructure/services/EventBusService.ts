/**
 * 🏗️ PATRÓN: Event Bus Service Pattern
 * 🎯 PRINCIPIO: Publish-Subscribe + Event-Driven Communication
 * 
 * EventBusService - Bus de eventos para comunicación desacoplada
 * Maneja publicación, suscripción y enrutamiento de eventos del sistema
 */

import type { DomainEvent } from '../../domain/events/DomainEvent';

/**
 * 🎯 PATRÓN: Event Bus Pattern
 * EventBusService centraliza toda la comunicación por eventos
 */
export class EventBusService {
  private subscribers: Map<string, EventSubscriber[]> = new Map();
  private eventQueue: QueuedEvent[] = [];
  private isProcessingQueue = false;
  private eventHistory: EventHistoryEntry[] = [];
  private middlewares: EventMiddleware[] = [];
  private eventFilters: EventFilter[] = [];

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración del bus de eventos
   */
  constructor(private readonly config: EventBusConfig) {
    this.config = {
      maxQueueSize: 1000,
      maxHistorySize: 500,
      enableEventHistory: true,
      enableEventFiltering: true,
      enableMiddleware: true,
      batchProcessing: true,
      batchSize: 10,
      processingDelayMs: 0,
      enableDeadLetterQueue: true,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar bus de eventos
   */
  public async initialize(): Promise<EventBusInitResult> {
    try {
      // 1. Configurar middlewares por defecto
      this.setupDefaultMiddlewares();

      // 2. Configurar filtros por defecto
      this.setupDefaultFilters();

      // 3. Iniciar procesamiento de cola
      this.startQueueProcessing();

      return {
        success: true,
        message: 'Event bus service initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize event bus service'
      };
    }
  }

  /**
   * 📡 PATRÓN: Event Publishing Pattern
   * Publicar evento en el bus
   */
  public async publish<T extends DomainEvent>(event: T): Promise<PublishResult> {
    try {
      // 1. Validar evento
      const validation = this.validateEvent(event);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. Aplicar filtros
      if (this.config.enableEventFiltering) {
        const shouldProcess = this.applyFilters(event);
        if (!shouldProcess) {
          return {
            success: true,
            filtered: true,
            eventId: event.eventId
          };
        }
      }

      // 3. Aplicar middlewares
      let processedEvent = event;
      if (this.config.enableMiddleware) {
        processedEvent = await this.applyMiddlewares(event, 'before_publish');
      }

      // 4. Agregar a cola o procesar inmediatamente
      const queuedEvent: QueuedEvent = {
        id: this.generateEventId(),
        event: processedEvent,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending'
      };

      if (this.config.batchProcessing) {
        this.addToQueue(queuedEvent);
      } else {
        await this.processEvent(queuedEvent);
      }

      // 5. Agregar a historial
      if (this.config.enableEventHistory) {
        this.addToHistory(processedEvent);
      }

      return {
        success: true,
        eventId: processedEvent.eventId,
        queuedEventId: queuedEvent.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish event'
      };
    }
  }

  /**
   * 📥 PATRÓN: Event Subscription Pattern
   * Suscribirse a eventos específicos
   */
  public subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): SubscriptionResult {
    try {
      const subscriber: EventSubscriber = {
        id: this.generateSubscriberId(),
        eventType,
        handler: handler as EventHandler<DomainEvent>,
        options: {
          priority: 0,
          once: false,
          filter: undefined,
          ...options
        },
        createdAt: Date.now()
      };

      // Agregar a la lista de suscriptores
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, []);
      }

      const eventSubscribers = this.subscribers.get(eventType)!;
      eventSubscribers.push(subscriber);

      // Ordenar por prioridad (mayor prioridad primero)
      eventSubscribers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));

      return {
        success: true,
        subscriptionId: subscriber.id,
        unsubscribe: () => this.unsubscribe(subscriber.id)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to event'
      };
    }
  }

  /**
   * 📤 PATRÓN: Event Unsubscription Pattern
   * Cancelar suscripción a eventos
   */
  public unsubscribe(subscriptionId: string): UnsubscribeResult {
    try {
      let found = false;

      for (const [eventType, subscribers] of this.subscribers.entries()) {
        const index = subscribers.findIndex(sub => sub.id === subscriptionId);
        if (index !== -1) {
          subscribers.splice(index, 1);
          found = true;
          
          // Limpiar array vacío
          if (subscribers.length === 0) {
            this.subscribers.delete(eventType);
          }
          break;
        }
      }

      return {
        success: found,
        error: found ? undefined : 'Subscription not found'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      };
    }
  }

  /**
   * 🔍 PATRÓN: Event Query Pattern
   * Consultar eventos del historial
   */
  public queryEvents(query: EventQuery): EventQueryResult {
    try {
      if (!this.config.enableEventHistory) {
        return {
          success: false,
          error: 'Event history is disabled'
        };
      }

      let filteredEvents = [...this.eventHistory];

      // Filtrar por tipo de evento
      if (query.eventType) {
        filteredEvents = filteredEvents.filter(entry => 
          entry.event.eventType === query.eventType
        );
      }

      // Filtrar por rango de tiempo
      if (query.fromTimestamp) {
        filteredEvents = filteredEvents.filter(entry => 
          entry.timestamp >= query.fromTimestamp!
        );
      }

      if (query.toTimestamp) {
        filteredEvents = filteredEvents.filter(entry => 
          entry.timestamp <= query.toTimestamp!
        );
      }

      // Filtrar por agregado
      if (query.aggregateId) {
        filteredEvents = filteredEvents.filter(entry => 
          entry.event.aggregateId === query.aggregateId
        );
      }

      // Aplicar límite
      if (query.limit) {
        filteredEvents = filteredEvents.slice(-query.limit);
      }

      return {
        success: true,
        events: filteredEvents.map(entry => entry.event),
        total: filteredEvents.length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query events'
      };
    }
  }

  /**
   * 🔧 PATRÓN: Middleware Registration Pattern
   * Registrar middleware de eventos
   */
  public registerMiddleware(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
    
    // Ordenar por prioridad
    this.middlewares.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * 🔍 PATRÓN: Filter Registration Pattern
   * Registrar filtro de eventos
   */
  public registerFilter(filter: EventFilter): void {
    this.eventFilters.push(filter);
  }

  /**
   * 📊 PATRÓN: Event Bus Statistics Pattern
   * Obtener estadísticas del bus
   */
  public getStatistics(): EventBusStatistics {
    const subscriberCounts = new Map<string, number>();
    
    for (const [eventType, subscribers] of this.subscribers.entries()) {
      subscriberCounts.set(eventType, subscribers.length);
    }

    return {
      totalSubscribers: Array.from(this.subscribers.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      subscribersByEventType: Object.fromEntries(subscriberCounts),
      queueSize: this.eventQueue.length,
      historySize: this.eventHistory.length,
      isProcessingQueue: this.isProcessingQueue,
      middlewareCount: this.middlewares.length,
      filterCount: this.eventFilters.length
    };
  }

  /**
   * 🧹 PATRÓN: Cleanup Pattern
   * Limpiar recursos del bus de eventos
   */
  public cleanup(): void {
    this.subscribers.clear();
    this.eventQueue.length = 0;
    this.eventHistory.length = 0;
    this.middlewares.length = 0;
    this.eventFilters.length = 0;
    this.isProcessingQueue = false;
  }

  /**
   * 📋 PATRÓN: Queue Management Pattern
   * Agregar evento a la cola
   */
  private addToQueue(queuedEvent: QueuedEvent): void {
    // Verificar límite de cola
    if (this.eventQueue.length >= (this.config.maxQueueSize || 1000)) { 
      // Remover eventos más antiguos
      this.eventQueue.shift();
    }

    this.eventQueue.push(queuedEvent);
  }

  /**
   * 🔄 PATRÓN: Queue Processing Pattern
   * Iniciar procesamiento de cola
   */
  private startQueueProcessing(): void {
    const processQueue = async () => {
      if (this.isProcessingQueue || this.eventQueue.length === 0) {
        setTimeout(processQueue, 100);
        return;
      }

      this.isProcessingQueue = true;

      try {
        const batch = this.eventQueue.splice(0, this.config.batchSize || 10);
        
        for (const queuedEvent of batch) {
          try {
            await this.processEvent(queuedEvent);
          } catch (error) {
            await this.handleEventError(queuedEvent, error);
          }
        }

        if (this.config.processingDelayMs && this.config.processingDelayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.processingDelayMs));
        }

      } finally {
        this.isProcessingQueue = false;
      }

      setTimeout(processQueue, 10);
    };

    processQueue();
  }

  /**
   * ⚙️ PATRÓN: Event Processing Pattern
   * Procesar evento individual
   */
  private async processEvent(queuedEvent: QueuedEvent): Promise<void> {
    const { event } = queuedEvent;
    const eventType = event.eventType;
    
    queuedEvent.status = 'processing';

    // Obtener suscriptores para este tipo de evento
    const subscribers = this.subscribers.get(eventType) || [];
    const wildcardSubscribers = this.subscribers.get('*') || [];
    const allSubscribers = [...subscribers, ...wildcardSubscribers];

    if (allSubscribers.length === 0) {
      queuedEvent.status = 'completed';
      return;
    }

    // Procesar cada suscriptor
    const results: SubscriberResult[] = [];
    
    for (const subscriber of allSubscribers) {
      try {
        // Aplicar filtro del suscriptor si existe
        if (subscriber.options.filter && !subscriber.options.filter(event)) {
          continue;
        }

        // Ejecutar handler
        await subscriber.handler(event);
        
        results.push({
          subscriberId: subscriber.id,
          success: true
        });

        // Remover suscriptor si es 'once'
        if (subscriber.options.once) {
          this.unsubscribe(subscriber.id);
        }

      } catch (error) {
        results.push({
          subscriberId: subscriber.id,
          success: false,
          error: error instanceof Error ? error.message : 'Handler failed'
        });
      }
    }

    // Aplicar middlewares post-procesamiento
    if (this.config.enableMiddleware) {
      await this.applyMiddlewares(event, 'after_process', { results });
    }

    queuedEvent.status = 'completed';
    queuedEvent.results = results;
  }

  /**
   * ❌ PATRÓN: Error Handling Pattern
   * Manejar error de evento
   */
  private async handleEventError(queuedEvent: QueuedEvent, error: unknown): Promise<void> {
    queuedEvent.retries++;
    queuedEvent.status = 'error';
    queuedEvent.error = error instanceof Error ? error.message : 'Unknown error';

    if (queuedEvent.retries < (this.config.maxRetries || 3)) {
      // Reintentar
      queuedEvent.status = 'pending';
      this.eventQueue.unshift(queuedEvent);
    } else if (this.config.enableDeadLetterQueue) {
      // Enviar a dead letter queue (simplificado)
      console.error('Event failed after max retries:', queuedEvent);
    }
  }

  /**
   * ✅ PATRÓN: Event Validation Pattern
   * Validar evento
   */
  private validateEvent(event: DomainEvent): ValidationResult {
    if (!event.eventId) {
      return { isValid: false, error: 'Event ID is required' };
    }

    if (!event.eventType) {
      return { isValid: false, error: 'Event type is required' };
    }

    if (!event.aggregateId) {
      return { isValid: false, error: 'Aggregate ID is required' };
    }

    if (!event.occurredOn) {
      return { isValid: false, error: 'Occurred at timestamp is required' };
    }

    return { isValid: true };
  }

  /**
   * 🔍 PATRÓN: Event Filtering Pattern
   * Aplicar filtros de eventos
   */
  private applyFilters(event: DomainEvent): boolean {
    for (const filter of this.eventFilters) {
      if (!filter.predicate(event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 🔧 PATRÓN: Middleware Application Pattern
   * Aplicar middlewares
   */
  private async applyMiddlewares<T extends DomainEvent>(
    event: T,
    phase: MiddlewarePhase,
    context?: Record<string, unknown>
  ): Promise<T> {
    let processedEvent = event;

    for (const middleware of this.middlewares) {
      if (middleware.phases.includes(phase)) {
        processedEvent = await middleware.process(processedEvent, phase, context);
      }
    }

    return processedEvent;
  }

  /**
   * 📚 PATRÓN: Event History Pattern
   * Agregar evento al historial
   */
  private addToHistory(event: DomainEvent): void {
    // Verificar límite de historial
    if (this.eventHistory.length >= (this.config.maxHistorySize || 500)) {
      this.eventHistory.shift();
    }

    this.eventHistory.push({
      event,
      timestamp: Date.now(),
      id: this.generateEventId()
    });
  }

  /**
   * 🔧 PATRÓN: Default Setup Pattern
   * Configurar middlewares por defecto
   */
  private setupDefaultMiddlewares(): void {
    // Middleware de logging
    this.registerMiddleware({
      name: 'logging',
      priority: 100,
      phases: ['before_publish', 'after_process'],
      process: async (event, phase, context) => {
        if (phase === 'before_publish') {
          console.log(`[EventBus] Publishing event: ${event.eventType}`, event.eventId);
        } else if (phase === 'after_process') {
          const results = context?.results as SubscriberResult[] || [];
          const successCount = results.filter(r => r.success).length;
          console.log(`[EventBus] Processed event: ${event.eventType}, ${successCount}/${results.length} handlers succeeded`);
        }
        return event;
      }
    });

    // Middleware de métricas
    this.registerMiddleware({
      name: 'metrics',
      priority: 90,
      phases: ['before_publish', 'after_process'],
      process: async (event) => {
        // En una implementación real, aquí se enviarían métricas
        return event;
      }
    });
  }

  /**
   * 🔍 PATRÓN: Default Filters Pattern
   * Configurar filtros por defecto
   */
  private setupDefaultFilters(): void {
    // Filtro para eventos duplicados (simplificado)
    this.registerFilter({
      name: 'duplicate_prevention',
      predicate: (event) => {
        const recent = this.eventHistory
          .slice(-10)
          .some(entry => entry.event.eventId === event.eventId);
        return !recent;
      }
    });
  }

  /**
   * 🔧 PATRÓN: Utility Methods
   * Métodos utilitarios
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para Event Bus Service
 */
export interface EventBusConfig {
  maxQueueSize?: number;
  maxHistorySize?: number;
  enableEventHistory?: boolean;
  enableEventFiltering?: boolean;
  enableMiddleware?: boolean;
  batchProcessing?: boolean;
  batchSize?: number;
  processingDelayMs?: number;
  enableDeadLetterQueue?: boolean;
  maxRetries?: number;
}

export interface EventBusInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  eventId?: string;
  queuedEventId?: string;
  filtered?: boolean;
  error?: string;
}

export interface SubscriptionOptions {
  priority?: number;
  once?: boolean;
  filter?: (event: DomainEvent) => boolean;
}

export interface EventSubscriber {
  id: string;
  eventType: string;
  handler: EventHandler<DomainEvent>;
  options: SubscriptionOptions;
  createdAt: number;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  unsubscribe?: () => UnsubscribeResult;
  error?: string;
}

export interface UnsubscribeResult {
  success: boolean;
  error?: string;
}

export interface QueuedEvent {
  id: string;
  event: DomainEvent;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results?: SubscriberResult[];
}

export interface SubscriberResult {
  subscriberId: string;
  success: boolean;
  error?: string;
}

export interface EventHistoryEntry {
  id: string;
  event: DomainEvent;
  timestamp: number;
}

export interface EventQuery {
  eventType?: string;
  aggregateId?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
}

export interface EventQueryResult {
  success: boolean;
  events?: DomainEvent[];
  total?: number;
  error?: string;
}

export interface EventBusStatistics {
  totalSubscribers: number;
  subscribersByEventType: Record<string, number>;
  queueSize: number;
  historySize: number;
  isProcessingQueue: boolean;
  middlewareCount: number;
  filterCount: number;
}

export type MiddlewarePhase = 'before_publish' | 'after_process';

export interface EventMiddleware {
  name: string;
  priority?: number;
  phases: MiddlewarePhase[];
  process: <T extends DomainEvent>(
    event: T,
    phase: MiddlewarePhase,
    context?: Record<string, unknown>
  ) => Promise<T>;
}

export interface EventFilter {
  name: string;
  predicate: (event: DomainEvent) => boolean;
}

export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
