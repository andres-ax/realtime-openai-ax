/**
 * 🏗️ PATRÓN: Entity Pattern (DDD) + Aggregate Root
 * 🎯 PRINCIPIO: Single Responsibility + Real-time Synchronization
 * 
 * Cart - Entidad carrito de compras con sincronización en tiempo real
 * Maneja items, cálculos y eventos para UI reactiva
 */

import { BaseEntity } from './BaseEntity';
import { CartId } from '../valueObjects/CartId';
import { CustomerId } from '../valueObjects/CustomerId';
import { Price } from '../valueObjects/Price';
import { CartItem } from './CartItem';
import { CartUpdatedEvent } from '../events/CartUpdatedEvent';

/**
 * 🛒 PATRÓN: Shopping Cart Pattern
 * Cart representa el carrito de compras con sincronización en tiempo real
 */
export class Cart extends BaseEntity<CartId> {
  private _customerId?: CustomerId;
  private _items: CartItem[] = [];
  private _isActive: boolean;
  private _sessionId?: string;
  private _lastActivity: Date;
  private _discountPercentage: number;
  private _taxPercentage: number;

  constructor(id: CartId, customerId?: CustomerId) {
    super(id);
    
    this._customerId = customerId;
    this._isActive = true;
    this._lastActivity = new Date();
    this._discountPercentage = 0;
    this._taxPercentage = 8.25; // Default tax rate
    
    this.validate();
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear carrito para cliente
   */
  public static createForCustomer(customerId: CustomerId): Cart {
    const id = CartId.generate();
    return new Cart(id, customerId);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear carrito de invitado
   */
  public static createGuest(sessionId: string): Cart {
    const id = CartId.generate();
    const cart = new Cart(id);
    cart._sessionId = sessionId;
    return cart;
  }

  /**
   * 🛒 PATRÓN: Item Management Pattern
   * Agregar item al carrito
   */
  public addItem(menuItemName: string, quantity: number, unitPrice: Price): void {
    this.validateActiveCart();
    
    const existingItem = this._items.find(item => 
      item.getMenuItemName() === menuItemName
    );

    if (existingItem) {
      existingItem.updateQuantity(existingItem.getQuantity() + quantity);
    } else {
      const cartItem = new CartItem(menuItemName, quantity, unitPrice);
      this._items.push(cartItem);
    }

    this.updateActivity();
    this.emitCartUpdatedEvent();
  }

  /**
   * 🛒 PATRÓN: Item Management Pattern
   * Actualizar cantidad de item específico
   */
  public updateItemQuantity(menuItemName: string, newQuantity: number): void {
    this.validateActiveCart();
    
    if (newQuantity <= 0) {
      this.removeItem(menuItemName);
      return;
    }

    const item = this._items.find(item => 
      item.getMenuItemName() === menuItemName
    );

    if (item) {
      item.updateQuantity(newQuantity);
      this.updateActivity();
      this.emitCartUpdatedEvent();
    }
  }

  /**
   * 🛒 PATRÓN: Item Management Pattern
   * Remover item del carrito
   */
  public removeItem(menuItemName: string): void {
    this.validateActiveCart();
    
    const index = this._items.findIndex(item => 
      item.getMenuItemName() === menuItemName
    );

    if (index !== -1) {
      this._items.splice(index, 1);
      this.updateActivity();
      this.emitCartUpdatedEvent();
    }
  }

  /**
   * 🧹 PATRÓN: Clear Pattern
   * Limpiar carrito completamente
   */
  public clear(): void {
    this.validateActiveCart();
    
    this._items = [];
    this.updateActivity();
    this.emitCartUpdatedEvent();
  }

  /**
   * 💰 PATRÓN: Discount Management Pattern
   * Aplicar descuento al carrito
   */
  public applyDiscount(percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    this._discountPercentage = percentage;
    this.updateActivity();
    this.emitCartUpdatedEvent();
  }

  /**
   * 🧮 PATRÓN: Calculation Pattern
   * Calcular subtotal (sin descuentos ni impuestos)
   */
  public calculateSubtotal(): Price {
    return this._items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      Price.zero()
    );
  }

  /**
   * 🧮 PATRÓN: Calculation Pattern
   * Calcular descuento en dinero
   */
  public calculateDiscount(): Price {
    const subtotal = this.calculateSubtotal();
    return subtotal.multiply(this._discountPercentage / 100);
  }

  /**
   * 🧮 PATRÓN: Calculation Pattern
   * Calcular impuestos
   */
  public calculateTax(): Price {
    const subtotalAfterDiscount = this.calculateSubtotal().subtract(this.calculateDiscount());
    return subtotalAfterDiscount.multiply(this._taxPercentage / 100);
  }

  /**
   * 🧮 PATRÓN: Calculation Pattern
   * Calcular total final
   */
  public calculateTotal(): Price {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateDiscount();
    const tax = this.calculateTax();
    
    return subtotal.subtract(discount).add(tax);
  }

  /**
   * 📊 PATRÓN: Summary Pattern
   * Obtener resumen completo del carrito
   */
  public getSummary(): CartSummary {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateDiscount();
    const tax = this.calculateTax();
    const total = this.calculateTotal();

    return {
      items: this._items.map(item => item.toSnapshot()),
      itemCount: this._items.length,
      totalQuantity: this._items.reduce((sum, item) => sum + item.getQuantity(), 0),
      subtotal,
      discountPercentage: this._discountPercentage,
      discount,
      taxPercentage: this._taxPercentage,
      tax,
      total,
      isEmpty: this._items.length === 0,
      isActive: this._isActive,
      lastActivity: this._lastActivity
    };
  }

  /**
   * 🔍 PATRÓN: Search Pattern
   * Buscar item en el carrito
   */
  public findItem(menuItemName: string): CartItem | undefined {
    return this._items.find(item => 
      item.getMenuItemName() === menuItemName
    );
  }

  /**
   * 📊 PATRÓN: Query Pattern
   * Verificar si contiene item específico
   */
  public hasItem(menuItemName: string): boolean {
    return this._items.some(item => 
      item.getMenuItemName() === menuItemName
    );
  }

  /**
   * 📊 PATRÓN: Query Pattern
   * Obtener cantidad de item específico
   */
  public getItemQuantity(menuItemName: string): number {
    const item = this.findItem(menuItemName);
    return item ? item.getQuantity() : 0;
  }

  /**
   * ⏰ PATRÓN: Session Management Pattern
   * Verificar si el carrito ha expirado
   */
  public isExpired(timeoutMinutes: number = 30): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - this._lastActivity.getTime()) / (1000 * 60);
    return diffMinutes > timeoutMinutes;
  }

  /**
   * 🔄 PATRÓN: State Management Pattern
   * Activar/desactivar carrito
   */
  public setActive(isActive: boolean): void {
    this._isActive = isActive;
    this.updateActivity();
    
    if (!isActive) {
      this.emitCartUpdatedEvent();
    }
  }

  /**
   * 🔄 PATRÓN: Merge Pattern
   * Fusionar con otro carrito (útil para login de invitados)
   */
  public mergeWith(otherCart: Cart): void {
    this.validateActiveCart();
    
    for (const otherItem of otherCart._items) {
      this.addItem(
        otherItem.getMenuItemName(),
        otherItem.getQuantity(),
        otherItem.getUnitPrice()
      );
    }
  }

  /**
   * 📡 PATRÓN: Event Emission Pattern
   * Emitir evento de carrito actualizado
   */
  private emitCartUpdatedEvent(): void {
    const summary = this.getSummary();
    this.addDomainEvent(new CartUpdatedEvent(
      this.id,
      summary.items,
      summary.total,
      summary.itemCount
    ));
  }

  /**
   * ⏰ PATRÓN: Activity Tracking Pattern
   * Actualizar timestamp de actividad
   */
  private updateActivity(): void {
    this._lastActivity = new Date();
    this.updateTimestamp();
  }

  /**
   * 🛡️ PATRÓN: Guard Clause Pattern
   * Validar que el carrito esté activo
   */
  private validateActiveCart(): void {
    if (!this._isActive) {
      throw new Error('Cannot modify inactive cart');
    }
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Validación específica de Cart
   */
  protected validate(): void {
    if (this._discountPercentage < 0 || this._discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    if (this._taxPercentage < 0 || this._taxPercentage > 50) {
      throw new Error('Tax percentage must be between 0 and 50');
    }

    if (this._items.some(item => item.getQuantity() <= 0)) {
      throw new Error('All cart items must have positive quantity');
    }
  }

  // Getters públicos (solo lectura)
  public getCustomerId(): CustomerId | undefined {
    return this._customerId;
  }

  public getItems(): readonly CartItem[] {
    return [...this._items];
  }

  public isActive(): boolean {
    return this._isActive;
  }

  public getSessionId(): string | undefined {
    return this._sessionId;
  }

  public getLastActivity(): Date {
    return this._lastActivity;
  }

  public getDiscountPercentage(): number {
    return this._discountPercentage;
  }

  public getTaxPercentage(): number {
    return this._taxPercentage;
  }

  public isEmpty(): boolean {
    return this._items.length === 0;
  }

  public getItemCount(): number {
    return this._items.length;
  }

  public getTotalQuantity(): number {
    return this._items.reduce((sum, item) => sum + item.getQuantity(), 0);
  }
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Resumen completo del carrito
 */
export interface CartSummary {
  items: CartItemSnapshot[];
  itemCount: number;
  totalQuantity: number;
  subtotal: Price;
  discountPercentage: number;
  discount: Price;
  taxPercentage: number;
  tax: Price;
  total: Price;
  isEmpty: boolean;
  isActive: boolean;
  lastActivity: Date;
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Snapshot de item del carrito
 */
export interface CartItemSnapshot {
  menuItemName: string;
  quantity: number;
  unitPrice: Price;
  subtotal: Price;
}
