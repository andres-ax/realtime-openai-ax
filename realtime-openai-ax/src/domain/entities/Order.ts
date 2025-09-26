/**
 * 🏗️ PATRÓN: Entity Pattern (DDD) + Aggregate Root
 * 🎯 PRINCIPIO: Single Responsibility + Domain-Driven Design
 * 
 * Entidad Order - Agregado raíz para el contexto de pedidos
 * Maneja items, estado, cálculos y eventos de dominio
 */

import { BaseEntity } from './BaseEntity';
// Domain Events imports
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { OrderUpdatedEvent } from '../events/OrderUpdatedEvent';
import { OrderItem } from './OrderItem';
import { CustomerId } from '../valueObjects/CustomerId';
import { OrderId } from '../valueObjects/OrderId';
import { Price } from '../valueObjects/Price';
import { OrderStatus } from '../valueObjects/OrderStatus';
import { DeliveryAddress } from '../valueObjects/DeliveryAddress';

/**
 * 🎯 PATRÓN: Aggregate Root Pattern
 * Order es el agregado raíz que controla la consistencia
 * de todos los elementos relacionados con el pedido
 */
export class Order extends BaseEntity<OrderId> {
  private _items: OrderItem[] = [];
  private _customerId?: CustomerId;
  private _status: OrderStatus;
  private _deliveryAddress?: DeliveryAddress;
  private _contactPhone?: string;
  private _email?: string;
  private _paymentInfo?: PaymentInfo;

  constructor(id: OrderId, customerId?: CustomerId) {
    super(id);
    this._customerId = customerId;
    this._status = OrderStatus.creating();
    
    // 📡 Event-Driven: Emitir evento de creación
    this.addDomainEvent(new OrderCreatedEvent(
      this.id,
      this._customerId,
      new Date()
    ));
  }

  /**
   * 🛒 PATRÓN: Business Logic Encapsulation
   * Agregar item al pedido con validaciones de negocio
   */
  public addItem(menuItem: string, quantity: number, unitPrice: Price): void {
    this.validateCanModifyOrder();
    
    const existingItem = this._items.find(item => 
      item.getMenuItemName() === menuItem
    );

    if (existingItem) {
      existingItem.updateQuantity(existingItem.getQuantity() + quantity);
    } else {
      const orderItem = new OrderItem(menuItem, quantity, unitPrice);
      this._items.push(orderItem);
    }

    this.updateTimestamp();
    
    // 📡 Event-Driven: Emitir evento de actualización
    this.addDomainEvent(new OrderUpdatedEvent(
      this.id,
      this._items.map(item => item.toSnapshot()),
      this.calculateTotal()
    ));
  }

  /**
   * 🔄 PATRÓN: Business Logic Encapsulation
   * Remover item del pedido
   */
  public removeItem(menuItem: string): void {
    this.validateCanModifyOrder();
    
    const itemIndex = this._items.findIndex(item => 
      item.getMenuItemName() === menuItem
    );

    if (itemIndex !== -1) {
      this._items.splice(itemIndex, 1);
      this.updateTimestamp();
      
      this.addDomainEvent(new OrderUpdatedEvent(
        this.id,
        this._items.map(item => item.toSnapshot()),
        this.calculateTotal()
      ));
    }
  }

  /**
   * 🧮 PATRÓN: Domain Service Integration
   * Calcular total del pedido
   */
  public calculateTotal(): Price {
    return this._items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      Price.zero()
    );
  }

  /**
   * 📊 PATRÓN: Query Method Pattern
   * Obtener resumen del carrito
   */
  public getCartSummary(): CartSummary {
    return {
      items: this._items.map(item => item.toSnapshot()),
      totalItems: this._items.reduce((sum, item) => sum + item.getQuantity(), 0),
      subtotal: this.calculateTotal(),
      isEmpty: this._items.length === 0
    };
  }

  /**
   * 🔄 PATRÓN: State Machine Pattern
   * Cambiar estado del pedido
   */
  public changeStatus(newStatus: OrderStatus): void {
    if (!this._status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this._status.getValue()} to ${newStatus.getValue()}`
      );
    }

    this._status = newStatus;
    this.updateTimestamp();
  }

  /**
   * 📍 PATRÓN: Value Object Integration
   * Establecer dirección de entrega
   */
  public setDeliveryAddress(address: DeliveryAddress): void {
    this.validateCanModifyOrder();
    this._deliveryAddress = address;
    this.updateTimestamp();
  }

  /**
   * 📞 PATRÓN: Value Object Integration
   * Establecer información de contacto
   */
  public setContactInfo(phone: string, email: string): void {
    this.validateCanModifyOrder();
    this._contactPhone = phone;
    this._email = email;
    this.updateTimestamp();
  }

  /**
   * 💳 PATRÓN: Value Object Integration
   * Establecer información de pago
   */
  public setPaymentInfo(paymentInfo: PaymentInfo): void {
    this.validateCanModifyOrder();
    this._paymentInfo = paymentInfo;
    this.updateTimestamp();
  }

  /**
   * ✅ PATRÓN: Domain Validation Pattern
   * Confirmar pedido (transición a confirmado)
   */
  public confirm(): void {
    this.validateOrderCanBeConfirmed();
    this.changeStatus(OrderStatus.confirmed());
    
    this.addDomainEvent(new OrderConfirmedEvent(
      this.id,
      this.calculateTotal(),
      new Date()
    ));
  }

  /**
   * 🛡️ PATRÓN: Guard Clause Pattern
   * Validar si el pedido puede ser modificado
   */
  private validateCanModifyOrder(): void {
    if (this._status.isConfirmed() || this._status.isCompleted()) {
      throw new Error('Cannot modify confirmed or completed order');
    }
  }

  /**
   * 🛡️ PATRÓN: Domain Validation Pattern
   * Validar si el pedido puede ser confirmado
   */
  private validateOrderCanBeConfirmed(): void {
    if (this._items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    
    if (!this._deliveryAddress) {
      throw new Error('Delivery address is required');
    }
    
    if (!this._contactPhone || !this._email) {
      throw new Error('Contact information is required');
    }
    
    if (!this._paymentInfo) {
      throw new Error('Payment information is required');
    }
  }

  /**
   * 🔍 PATRÓN: Template Method Pattern
   * Validación específica de la entidad Order
   */
  protected validate(): void {
    if (this._items.some(item => item.getQuantity() <= 0)) {
      throw new Error('All order items must have positive quantity');
    }
  }

  // Getters públicos (solo lectura)
  public getItems(): readonly OrderItem[] {
    return [...this._items];
  }

  public getCustomerId(): CustomerId | undefined {
    return this._customerId;
  }

  public getStatus(): OrderStatus {
    return this._status;
  }

  public getDeliveryAddress(): DeliveryAddress | undefined {
    return this._deliveryAddress;
  }

  public getContactPhone(): string | undefined {
    return this._contactPhone;
  }

  public getEmail(): string | undefined {
    return this._email;
  }

  public getPaymentInfo(): PaymentInfo | undefined {
    return this._paymentInfo;
  }
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Snapshot del carrito para transferencia de datos
 */
export interface CartSummary {
  items: OrderItemSnapshot[];
  totalItems: number;
  subtotal: Price;
  isEmpty: boolean;
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Snapshot de item para transferencia
 */
export interface OrderItemSnapshot {
  menuItem: string;
  quantity: number;
  unitPrice: Price;
  subtotal: Price;
}

/**
 * 💳 PATRÓN: Value Object (futuro)
 * Información de pago encapsulada
 */
export interface PaymentInfo {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
}

// Importar eventos que aún no existen (se crearán después)
import { OrderConfirmedEvent } from '../events/OrderConfirmedEvent';
