/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Type Safety
 * 
 * CustomerId - Identificador único para clientes
 * Garantiza formato válido y unicidad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🎯 PATRÓN: Strongly Typed ID Pattern
 * CustomerId encapsula la lógica de identificadores de cliente
 */
export class CustomerId extends BaseValueObject<string> {
  
  constructor(value: string) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Generar nuevo ID único para cliente
   */
  public static generate(): CustomerId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new CustomerId(`customer-${timestamp}-${random}`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): CustomerId {
    return new CustomerId(value);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato del ID de cliente
   */
  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Customer ID must be a non-empty string');
    }

    if (value.length < 10 || value.length > 50) {
      throw new Error('Customer ID must be between 10 and 50 characters');
    }

    // Validar formato básico
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(value)) {
      throw new Error('Customer ID contains invalid characters');
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
