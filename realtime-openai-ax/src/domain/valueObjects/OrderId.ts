/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Type Safety
 * 
 * OrderId - Identificador único para pedidos
 * Garantiza formato válido y unicidad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🎯 PATRÓN: Strongly Typed ID Pattern
 * OrderId encapsula la lógica de identificadores de pedido
 */
export class OrderId extends BaseValueObject<string> {
  
  constructor(value: string) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Generar nuevo ID único para pedido
   */
  public static generate(): OrderId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new OrderId(`order-${timestamp}-${random}`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): OrderId {
    return new OrderId(value);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato del ID de pedido
   */
  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    if (value.length < 10 || value.length > 50) {
      throw new Error('Order ID must be between 10 and 50 characters');
    }

    // Validar formato básico (opcional)
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(value)) {
      throw new Error('Order ID contains invalid characters');
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
