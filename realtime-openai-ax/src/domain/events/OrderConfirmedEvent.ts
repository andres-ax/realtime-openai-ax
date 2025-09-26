/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Business Process Trigger
 * 
 * OrderConfirmedEvent - Evento emitido cuando se confirma un pedido
 * Desencadena procesos de pago y preparación
 */

import { BaseDomainEvent } from './DomainEvent';
import { OrderId } from '../valueObjects/OrderId';
import { Price } from '../valueObjects/Price';

/**
 * 📡 PATRÓN: Business Event Pattern
 * OrderConfirmedEvent marca un hito importante en el proceso de pedido
 */
export class OrderConfirmedEvent extends BaseDomainEvent {
  public readonly orderId: OrderId;
  public readonly total: Price;
  public readonly confirmedAt: Date;

  constructor(
    orderId: OrderId,
    total: Price,
    confirmedAt: Date
  ) {
    super(
      orderId.toString(),
      'OrderConfirmed',
      {
        orderId: orderId.toString(),
        total: total.getValue(),
        totalFormatted: total.toUSDString(),
        confirmedAt: confirmedAt.toISOString()
      }
    );
    
    this.orderId = orderId;
    this.total = total;
    this.confirmedAt = confirmedAt;
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para procesamiento
   */
  public getPayload(): OrderConfirmedEventPayload {
    return {
      orderId: this.orderId.toString(),
      total: this.total.getValue(),
      totalFormatted: this.total.toUSDString(),
      confirmedAt: this.confirmedAt.toISOString()
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
    return `Order ${this.orderId.toString()} confirmed with total ${this.total.toUSDString()}`;
  }

  /**
   * 💰 PATRÓN: Business Logic Pattern
   * Verificar si requiere procesamiento de pago
   */
  public requiresPaymentProcessing(): boolean {
    return this.total.isPositive();
  }

  /**
   * 📊 PATRÓN: Priority Classification Pattern
   * Clasificar prioridad del pedido basado en monto
   */
  public getPriority(): OrderPriority {
    const amount = this.total.getValue();
    
    if (amount >= 100) {
      return 'HIGH';
    } else if (amount >= 50) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface OrderConfirmedEventPayload {
  orderId: string;
  total: number;
  totalFormatted: string;
  confirmedAt: string;
}

/**
 * 📊 PATRÓN: Enum Pattern
 * Prioridades de pedido
 */
export type OrderPriority = 'LOW' | 'MEDIUM' | 'HIGH';
