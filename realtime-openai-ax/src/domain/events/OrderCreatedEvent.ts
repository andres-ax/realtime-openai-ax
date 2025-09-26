/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Immutability
 * 
 * OrderCreatedEvent - Evento emitido cuando se crea un nuevo pedido
 * Permite comunicación desacoplada entre contextos
 */

import { BaseDomainEvent } from './DomainEvent';
import { OrderId } from '../valueObjects/OrderId';
import { CustomerId } from '../valueObjects/CustomerId';

/**
 * 📡 PATRÓN: Event Sourcing Pattern
 * OrderCreatedEvent captura el momento de creación de un pedido
 */
export class OrderCreatedEvent extends BaseDomainEvent {
  public readonly orderId: OrderId;
  public readonly customerId?: CustomerId;
  public readonly createdAt: Date;

  constructor(
    orderId: OrderId,
    customerId: CustomerId | undefined,
    createdAt: Date
  ) {
    super(
      orderId.toString(),
      'OrderCreated',
      {
        orderId: orderId.toString(),
        customerId: customerId?.toString(),
        createdAt: createdAt.toISOString()
      }
    );
    
    this.orderId = orderId;
    this.customerId = customerId;
    this.createdAt = createdAt;
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para procesamiento
   */
  public getPayload(): OrderCreatedEventPayload {
    return {
      orderId: this.orderId.toString(),
      customerId: this.customerId?.toString(),
      createdAt: this.createdAt.toISOString()
    };
  }

  /**
   * 🔍 PATRÓN: Event Identification Pattern
   * Identificar el agregado afectado
   */
  public getAggregateId(): string {
    return this.orderId.toString();
  }

  /**
   * 🎯 PATRÓN: Event Description Pattern
   * Descripción legible del evento
   */
  public getDescription(): string {
    const customerInfo = this.customerId 
      ? ` for customer ${this.customerId.toString()}`
      : '';
    return `Order ${this.orderId.toString()} was created${customerInfo}`;
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface OrderCreatedEventPayload {
  orderId: string;
  customerId?: string;
  createdAt: string;
}
