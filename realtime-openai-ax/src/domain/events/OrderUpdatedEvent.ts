/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Immutability
 * 
 * OrderUpdatedEvent - Evento emitido cuando se actualiza un pedido
 * Permite sincronización en tiempo real del carrito
 */

import { BaseDomainEvent } from './DomainEvent';
import { OrderId } from '../valueObjects/OrderId';
import { Price } from '../valueObjects/Price';
import { OrderItemSnapshot } from '../entities/Order';

/**
 * 📡 PATRÓN: Event Sourcing Pattern
 * OrderUpdatedEvent captura cambios en el pedido para sincronización
 */
export class OrderUpdatedEvent extends BaseDomainEvent {
  public readonly orderId: OrderId;
  public readonly items: OrderItemSnapshot[];
  public readonly total: Price;
  public readonly updatedAt: Date;

  constructor(
    orderId: OrderId,
    items: OrderItemSnapshot[],
    total: Price
  ) {
    super(
      orderId.toString(),
      'OrderUpdated',
      {
        orderId: orderId.toString(),
        items: items.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          unitPrice: item.unitPrice.getValue(),
          subtotal: item.subtotal.getValue()
        })),
        total: total.getValue(),
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    );
    
    this.orderId = orderId;
    this.items = items;
    this.total = total;
    this.updatedAt = new Date();
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para sincronización
   */
  public getPayload(): OrderUpdatedEventPayload {
    return {
      orderId: this.orderId.toString(),
      items: this.items.map(item => ({
        menuItem: item.menuItem,
        quantity: item.quantity,
        unitPrice: item.unitPrice.getValue(),
        subtotal: item.subtotal.getValue()
      })),
      total: this.total.getValue(),
      totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: this.updatedAt.toISOString()
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
    const itemCount = this.items.length;
    const totalAmount = this.total.toUSDString();
    return `Order ${this.orderId.toString()} updated with ${itemCount} items, total: ${totalAmount}`;
  }

  /**
   * 📊 PATRÓN: Change Detection Pattern
   * Verificar si hubo cambios significativos
   */
  public hasSignificantChanges(previousItems: OrderItemSnapshot[]): boolean {
    // Comparar cantidad de items
    if (this.items.length !== previousItems.length) {
      return true;
    }

    // Comparar items individuales
    return this.items.some(currentItem => {
      const previousItem = previousItems.find(
        prev => prev.menuItem === currentItem.menuItem
      );
      
      return !previousItem || 
             previousItem.quantity !== currentItem.quantity ||
             !previousItem.unitPrice.isEqualTo(currentItem.unitPrice);
    });
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface OrderUpdatedEventPayload {
  orderId: string;
  items: {
    menuItem: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  total: number;
  totalItems: number;
  updatedAt: string;
}
