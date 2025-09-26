/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Validation + Business Rules
 * 
 * Quantity - Cantidad de items con límites y validaciones
 * Encapsula reglas de negocio para cantidades
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🔢 PATRÓN: Quantity Pattern
 * Quantity encapsula lógica de cantidades con límites de negocio
 */
export class Quantity extends BaseValueObject<number> {
  private static readonly MIN_QUANTITY = 1;
  private static readonly MAX_QUANTITY = 99;

  constructor(value: number) {
    super(Math.floor(value)); // Asegurar que sea entero
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cantidad desde número
   */
  public static fromNumber(value: number): Quantity {
    return new Quantity(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cantidad desde string
   */
  public static fromString(value: string): Quantity {
    const numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) {
      throw new Error('Invalid quantity format');
    }
    return new Quantity(numericValue);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cantidad mínima
   */
  public static min(): Quantity {
    return new Quantity(Quantity.MIN_QUANTITY);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cantidad máxima
   */
  public static max(): Quantity {
    return new Quantity(Quantity.MAX_QUANTITY);
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Sumar cantidades
   */
  public add(other: Quantity): Quantity {
    const result = this._value + other._value;
    return new Quantity(Math.min(result, Quantity.MAX_QUANTITY));
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Restar cantidades
   */
  public subtract(other: Quantity): Quantity {
    const result = this._value - other._value;
    return new Quantity(Math.max(result, Quantity.MIN_QUANTITY));
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Multiplicar cantidad
   */
  public multiply(multiplier: number): Quantity {
    if (multiplier <= 0) {
      throw new Error('Multiplier must be positive');
    }
    
    const result = Math.floor(this._value * multiplier);
    return new Quantity(Math.min(result, Quantity.MAX_QUANTITY));
  }

  /**
   * 📊 PATRÓN: Comparison Pattern
   * Comparar cantidades
   */
  public isGreaterThan(other: Quantity): boolean {
    return this._value > other._value;
  }

  public isLessThan(other: Quantity): boolean {
    return this._value < other._value;
  }

  public isEqualTo(other: Quantity): boolean {
    return this._value === other._value;
  }

  public isMinimum(): boolean {
    return this._value === Quantity.MIN_QUANTITY;
  }

  public isMaximum(): boolean {
    return this._value === Quantity.MAX_QUANTITY;
  }

  /**
   * 📊 PATRÓN: Business Rules Pattern
   * Verificar si se puede incrementar
   */
  public canIncrement(): boolean {
    return this._value < Quantity.MAX_QUANTITY;
  }

  /**
   * 📊 PATRÓN: Business Rules Pattern
   * Verificar si se puede decrementar
   */
  public canDecrement(): boolean {
    return this._value > Quantity.MIN_QUANTITY;
  }

  /**
   * 🔄 PATRÓN: Increment Pattern
   * Incrementar cantidad de forma segura
   */
  public increment(): Quantity {
    if (!this.canIncrement()) {
      return this; // Retornar la misma instancia si no se puede incrementar
    }
    return new Quantity(this._value + 1);
  }

  /**
   * 🔄 PATRÓN: Decrement Pattern
   * Decrementar cantidad de forma segura
   */
  public decrement(): Quantity {
    if (!this.canDecrement()) {
      return this; // Retornar la misma instancia si no se puede decrementar
    }
    return new Quantity(this._value - 1);
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener representación para mostrar
   */
  public toDisplayString(): string {
    if (this._value === 1) {
      return '1 item';
    }
    return `${this._value} items`;
  }

  /**
   * 📊 PATRÓN: Range Validation Pattern
   * Verificar si está en rango válido
   */
  public isInValidRange(): boolean {
    return this._value >= Quantity.MIN_QUANTITY && this._value <= Quantity.MAX_QUANTITY;
  }

  /**
   * 📊 PATRÓN: Bulk Operations Pattern
   * Verificar si es cantidad de mayoreo (ejemplo: >10)
   */
  public isBulkQuantity(): boolean {
    return this._value >= 10;
  }

  /**
   * 💰 PATRÓN: Discount Eligibility Pattern
   * Verificar si califica para descuento por cantidad
   */
  public qualifiesForQuantityDiscount(): boolean {
    return this._value >= 5; // Descuento a partir de 5 items
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar valor de cantidad
   */
  protected validate(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Quantity must be a valid number');
    }

    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be a whole number');
    }

    if (value < Quantity.MIN_QUANTITY) {
      throw new Error(`Quantity cannot be less than ${Quantity.MIN_QUANTITY}`);
    }

    if (value > Quantity.MAX_QUANTITY) {
      throw new Error(`Quantity cannot exceed ${Quantity.MAX_QUANTITY}`);
    }
  }

  /**
   * 🔢 PATRÓN: Conversion Pattern
   * Obtener valor numérico
   */
  public getValue(): number {
    return this._value;
  }

  /**
   * 📊 PATRÓN: Static Information Pattern
   * Obtener límites de cantidad
   */
  public static getLimits(): { min: number; max: number } {
    return {
      min: Quantity.MIN_QUANTITY,
      max: Quantity.MAX_QUANTITY
    };
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this._value.toString();
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): number {
    return this._value;
  }
}
