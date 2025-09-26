/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Real-time Synchronization
 * 
 * CartUpdatedEvent - Evento emitido cuando se actualiza el carrito
 * Permite sincronización en tiempo real del carrito en la UI
 */

import { BaseDomainEvent } from './DomainEvent';
import { CartId } from '../valueObjects/CartId';
import { Price } from '../valueObjects/Price';
import { CartItemSnapshot } from '../entities/Cart';

/**
 * 📡 PATRÓN: Real-time Event Pattern
 * CartUpdatedEvent captura cambios en el carrito para sincronización UI
 */
export class CartUpdatedEvent extends BaseDomainEvent {
  public readonly cartId: CartId;
  public readonly items: CartItemSnapshot[];
  public readonly total: Price;
  public readonly itemCount: number;
  public readonly updatedAt: Date;

  constructor(
    cartId: CartId,
    items: CartItemSnapshot[],
    total: Price,
    itemCount: number
  ) {
    super(
      cartId.toString(),
      'CartUpdated',
      {
        cartId: cartId.toString(),
        items: items.map(item => ({
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.getValue(),
          subtotal: item.subtotal.getValue()
        })),
        total: total.getValue(),
        itemCount,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    );
    
    this.cartId = cartId;
    this.items = items;
    this.total = total;
    this.itemCount = itemCount;
    this.updatedAt = new Date();
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para sincronización UI
   */
  public getPayload(): CartUpdatedEventPayload {
    return {
      cartId: this.cartId.toString(),
      items: this.items.map(item => ({
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.getValue(),
        subtotal: item.subtotal.getValue()
      })),
      total: this.total.getValue(),
      totalFormatted: this.total.toUSDString(),
      itemCount: this.itemCount,
      totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
      isEmpty: this.items.length === 0,
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * 🔍 PATRÓN: Event Identification Pattern
   * Identificar el agregado afectado
   */
  public getAggregateId(): string {
    return this.cartId.toString();
  }

  /**
   * 🎯 PATRÓN: Event Description Pattern
   * Descripción legible del evento
   */
  public getDescription(): string {
    const itemText = this.itemCount === 1 ? 'item' : 'items';
    return `Cart ${this.cartId.toString()} updated with ${this.itemCount} ${itemText}, total: ${this.total.toUSDString()}`;
  }

  /**
   * 📊 PATRÓN: Change Analysis Pattern
   * Analizar tipo de cambio en el carrito
   */
  public getChangeType(): CartChangeType {
    if (this.items.length === 0) {
      return 'CLEARED';
    } else if (this.itemCount === 1 && this.items[0].quantity === 1) {
      return 'ITEM_ADDED';
    } else {
      return 'ITEM_UPDATED';
    }
  }

  /**
   * 📊 PATRÓN: UI Update Hint Pattern
   * Obtener sugerencias para actualización de UI
   */
  public getUIUpdateHints(): UIUpdateHints {
    return {
      shouldUpdateCarousel: this.items.length > 0,
      shouldShowNotification: true,
      shouldUpdateTotal: true,
      shouldAnimateCart: this.getChangeType() === 'ITEM_ADDED',
      focusedItem: this.items.length > 0 ? this.items[this.items.length - 1].menuItemName : undefined
    };
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface CartUpdatedEventPayload {
  cartId: string;
  items: {
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  total: number;
  totalFormatted: string;
  itemCount: number;
  totalQuantity: number;
  isEmpty: boolean;
  updatedAt: string;
}

/**
 * 📊 PATRÓN: Change Classification Pattern
 * Tipos de cambio en el carrito
 */
export type CartChangeType = 'ITEM_ADDED' | 'ITEM_UPDATED' | 'ITEM_REMOVED' | 'CLEARED';

/**
 * 🎨 PATRÓN: UI Hint Pattern
 * Sugerencias para actualización de interfaz
 */
export interface UIUpdateHints {
  shouldUpdateCarousel: boolean;
  shouldShowNotification: boolean;
  shouldUpdateTotal: boolean;
  shouldAnimateCart: boolean;
  focusedItem?: string;
}
