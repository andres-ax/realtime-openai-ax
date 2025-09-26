/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Precision + Type Safety
 * 
 * Price - Objeto valor monetario con aritmética precisa
 * Evita problemas de precisión con números decimales
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 💰 PATRÓN: Money Pattern
 * Price maneja valores monetarios con precisión decimal
 */
export class Price extends BaseValueObject<number> {
  private static readonly DECIMAL_PLACES = 2;
  private static readonly MULTIPLIER = Math.pow(10, Price.DECIMAL_PLACES);

  constructor(value: number) {
    super(Price.roundToCents(value));
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear precio desde dólares
   */
  public static fromDollars(dollars: number): Price {
    return new Price(dollars);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear precio desde centavos
   */
  public static fromCents(cents: number): Price {
    return new Price(cents / Price.MULTIPLIER);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear precio cero
   */
  public static zero(): Price {
    return new Price(0);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear precio desde string con validación
   */
  public static fromString(value: string): Price {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      throw new Error('Invalid price format');
    }
    return new Price(numericValue);
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Sumar precios con precisión
   */
  public add(other: Price): Price {
    const thisInCents = Math.round(this._value * Price.MULTIPLIER);
    const otherInCents = Math.round(other._value * Price.MULTIPLIER);
    const resultInCents = thisInCents + otherInCents;
    return Price.fromCents(resultInCents);
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Restar precios con precisión
   */
  public subtract(other: Price): Price {
    const thisInCents = Math.round(this._value * Price.MULTIPLIER);
    const otherInCents = Math.round(other._value * Price.MULTIPLIER);
    const resultInCents = thisInCents - otherInCents;
    
    if (resultInCents < 0) {
      throw new Error('Price cannot be negative');
    }
    
    return Price.fromCents(resultInCents);
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Multiplicar precio por cantidad
   */
  public multiply(multiplier: number): Price {
    if (multiplier < 0) {
      throw new Error('Multiplier cannot be negative');
    }
    
    const thisInCents = Math.round(this._value * Price.MULTIPLIER);
    const resultInCents = Math.round(thisInCents * multiplier);
    return Price.fromCents(resultInCents);
  }

  /**
   * 🧮 PATRÓN: Arithmetic Operations Pattern
   * Dividir precio
   */
  public divide(divisor: number): Price {
    if (divisor <= 0) {
      throw new Error('Divisor must be positive');
    }
    
    const thisInCents = Math.round(this._value * Price.MULTIPLIER);
    const resultInCents = Math.round(thisInCents / divisor);
    return Price.fromCents(resultInCents);
  }

  /**
   * 📊 PATRÓN: Comparison Pattern
   * Comparar precios
   */
  public isGreaterThan(other: Price): boolean {
    return this._value > other._value;
  }

  public isLessThan(other: Price): boolean {
    return this._value < other._value;
  }

  public isEqualTo(other: Price): boolean {
    return Math.abs(this._value - other._value) < 0.001; // Tolerancia para decimales
  }

  public isZero(): boolean {
    return this._value === 0;
  }

  public isPositive(): boolean {
    return this._value > 0;
  }

  /**
   * 💰 PATRÓN: Currency Formatting Pattern
   * Formatear como moneda USD
   */
  public toUSDString(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(this._value);
  }

  /**
   * 💰 PATRÓN: Currency Formatting Pattern
   * Formatear con símbolo personalizado
   */
  public toFormattedString(currencySymbol: string = '$'): string {
    return `${currencySymbol}${this._value.toFixed(Price.DECIMAL_PLACES)}`;
  }

  /**
   * 🔢 PATRÓN: Conversion Pattern
   * Obtener valor en centavos
   */
  public toCents(): number {
    return Math.round(this._value * Price.MULTIPLIER);
  }

  /**
   * 🔢 PATRÓN: Conversion Pattern
   * Obtener valor numérico
   */
  public getValue(): number {
    return this._value;
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar valor del precio
   */
  protected validate(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Price must be a valid number');
    }

    if (value < 0) {
      throw new Error('Price cannot be negative');
    }

    if (value > 9999.99) {
      throw new Error('Price cannot exceed $9,999.99');
    }

    // Validar precisión decimal
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    if (decimalPlaces > Price.DECIMAL_PLACES) {
      throw new Error(`Price cannot have more than ${Price.DECIMAL_PLACES} decimal places`);
    }
  }

  /**
   * 🔧 PATRÓN: Utility Method Pattern
   * Redondear a centavos para evitar problemas de precisión
   */
  private static roundToCents(value: number): number {
    return Math.round(value * Price.MULTIPLIER) / Price.MULTIPLIER;
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this.toFormattedString();
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): number {
    return this._value;
  }
}
