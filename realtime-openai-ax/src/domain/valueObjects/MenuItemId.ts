/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Type Safety
 * 
 * MenuItemId - Identificador único para items del menú
 * Garantiza formato válido y unicidad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🎯 PATRÓN: Strongly Typed ID Pattern
 * MenuItemId encapsula la lógica de identificadores de items del menú
 */
export class MenuItemId extends BaseValueObject<string> {
  
  constructor(value: string) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Generar nuevo ID único para item del menú
   */
  public static generate(): MenuItemId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new MenuItemId(`menu-item-${timestamp}-${random}`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): MenuItemId {
    return new MenuItemId(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde nombre del item (slug format)
   */
  public static fromName(name: string): MenuItemId {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return new MenuItemId(`menu-${slug}`);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato del ID de item del menú
   */
  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Menu item ID must be a non-empty string');
    }

    if (value.length < 3 || value.length > 50) {
      throw new Error('Menu item ID must be between 3 and 50 characters');
    }

    // Validar formato básico (slug-friendly)
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(value)) {
      throw new Error('Menu item ID contains invalid characters');
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
