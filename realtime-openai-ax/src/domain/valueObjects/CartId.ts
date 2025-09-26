/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Type Safety
 * 
 * CartId - Identificador único para carritos
 * Garantiza formato válido y unicidad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🎯 PATRÓN: Strongly Typed ID Pattern
 * CartId encapsula la lógica de identificadores de carrito
 */
export class CartId extends BaseValueObject<string> {
  
  constructor(value: string) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Generar nuevo ID único para carrito
   */
  public static generate(): CartId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new CartId(`cart-${timestamp}-${random}`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): CartId {
    return new CartId(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear ID de sesión temporal
   */
  public static fromSession(sessionId: string): CartId {
    return new CartId(`cart-session-${sessionId}`);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato del ID de carrito
   */
  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Cart ID must be a non-empty string');
    }

    if (value.length < 8 || value.length > 50) {
      throw new Error('Cart ID must be between 8 and 50 characters');
    }

    // Validar formato básico
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(value)) {
      throw new Error('Cart ID contains invalid characters');
    }
  }

  /**
   * 🎯 PATRÓN: String Conversion Pattern
   * Obtener representación como string
   */
  public toString(): string {
    return this._value;
  }
}
