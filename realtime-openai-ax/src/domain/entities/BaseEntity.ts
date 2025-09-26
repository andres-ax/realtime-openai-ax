/**
 * 🏗️ PATRÓN: Entity Pattern (DDD)
 * 🎯 PRINCIPIO: Single Responsibility Principle
 * 
 * Entidad base que implementa los patrones fundamentales de DDD
 * con identidad única y eventos de dominio
 */

import type { DomainEvent } from '../events/DomainEvent';

export abstract class BaseEntity<T> {
  protected readonly _id: T;
  private _domainEvents: DomainEvent[] = [];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(id: T) {
    this._id = id;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 🎯 PATRÓN: Value Object Pattern
   * Getter inmutable para la identidad
   */
  public get id(): T {
    return this._id;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * 🔄 PATRÓN: Event-Driven Architecture
   * Gestión de eventos de dominio
   */
  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
    this._updatedAt = new Date();
  }

  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * 🛡️ PATRÓN: Equality Pattern
   * Comparación basada en identidad
   */
  public equals(entity: BaseEntity<T>): boolean {
    if (!(entity instanceof BaseEntity)) {
      return false;
    }

    return this._id === entity._id;
  }

  /**
   * 🔧 PATRÓN: Template Method Pattern
   * Método abstracto para validación específica
   */
  protected abstract validate(): void;
}
