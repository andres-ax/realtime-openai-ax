/**
 * 🏗️ PATRÓN: Event-Driven Architecture
 * 🎯 PRINCIPIO: Single Responsibility + Open/Closed
 * 
 * Interfaz base para todos los eventos de dominio
 * que permite comunicación desacoplada entre bounded contexts
 */

export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly eventVersion: number;
  readonly payload: Record<string, unknown>;
}

/**
 * 🔄 PATRÓN: Abstract Factory Pattern
 * Clase base para crear eventos de dominio tipados
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly eventVersion: number;
  public readonly payload: Record<string, unknown>;

  constructor(
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown> = {},
    eventVersion: number = 1
  ) {
    this.eventId = this.generateEventId();
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventVersion = eventVersion;
    this.payload = Object.freeze(payload);
  }

  /**
   * 🎯 PATRÓN: Factory Method Pattern
   * Generación única de identificadores
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🛡️ PATRÓN: Equality Pattern
   * Comparación por identidad del evento
   */
  public equals(event: DomainEvent): boolean {
    return this.eventId === event.eventId;
  }

  /**
   * 🎯 PATRÓN: Serialization Pattern
   * Serialización segura del evento
   */
  public serialize(): string {
    return JSON.stringify({
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      eventVersion: this.eventVersion,
      payload: this.payload
    });
  }
}
