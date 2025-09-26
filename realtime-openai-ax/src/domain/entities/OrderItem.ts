/**
 * 🏗️ PATRÓN: Entity Pattern (DDD)
 * 🎯 PRINCIPIO: Single Responsibility + Encapsulation
 * 
 * Entidad OrderItem - Representa un item dentro de un pedido
 * con cantidad, precio y cálculos de subtotal
 */

import { Price } from '../valueObjects/Price';
import { OrderItemSnapshot } from './Order';

/**
 * 🛒 PATRÓN: Entity Pattern
 * OrderItem encapsula la lógica de un item individual del pedido
 */
export class OrderItem {
  private _menuItemName: string;
  private _quantity: number;
  private _unitPrice: Price;

  constructor(menuItemName: string, quantity: number, unitPrice: Price) {
    this.validateInput(menuItemName, quantity, unitPrice);
    
    this._menuItemName = menuItemName;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
  }

  /**
   * 🔄 PATRÓN: Business Logic Encapsulation
   * Actualizar cantidad con validaciones
   */
  public updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    if (newQuantity > 99) {
      throw new Error('Quantity cannot exceed 99 units');
    }

    this._quantity = newQuantity;
  }

  /**
   * 🧮 PATRÓN: Calculation Encapsulation
   * Calcular subtotal del item
   */
  public getSubtotal(): Price {
    return this._unitPrice.multiply(this._quantity);
  }

  /**
   * 🎯 PATRÓN: Data Transfer Object
   * Crear snapshot para transferencia de datos
   */
  public toSnapshot(): OrderItemSnapshot {
    return {
      menuItem: this._menuItemName,
      quantity: this._quantity,
      unitPrice: this._unitPrice,
      subtotal: this.getSubtotal()
    };
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar datos de entrada
   */
  private validateInput(menuItemName: string, quantity: number, unitPrice: Price): void {
    if (!menuItemName || menuItemName.trim().length === 0) {
      throw new Error('Menu item name is required');
    }
    
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    if (quantity > 99) {
      throw new Error('Quantity cannot exceed 99 units');
    }
    
    if (!unitPrice || unitPrice.getValue() <= 0) {
      throw new Error('Unit price must be positive');
    }
  }

  // Getters públicos (solo lectura)
  public getMenuItemName(): string {
    return this._menuItemName;
  }

  public getQuantity(): number {
    return this._quantity;
  }

  public getUnitPrice(): Price {
    return this._unitPrice;
  }

  /**
   * 🛡️ PATRÓN: Equality Pattern
   * Comparar items por nombre de menú
   */
  public equals(other: OrderItem): boolean {
    return this._menuItemName === other._menuItemName;
  }
}
