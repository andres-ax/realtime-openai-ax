/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Type Safety
 * 
 * AgentId - Identificador único para agentes
 * Garantiza formato válido y unicidad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🎯 PATRÓN: Strongly Typed ID Pattern
 * AgentId encapsula la lógica de identificadores de agente
 */
export class AgentId extends BaseValueObject<string> {
  
  constructor(value: string) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Generar nuevo ID único para agente
   */
  public static generate(): AgentId {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return new AgentId(`agent-${timestamp}-${random}`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): AgentId {
    return new AgentId(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde tipo de agente (para agentes predefinidos)
   */
  public static fromType(agentType: 'sales' | 'payment'): AgentId {
    return new AgentId(`agent-${agentType}`);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato del ID de agente
   */
  protected validate(value: string): void {
    if (!value || typeof value !== 'string') {
      throw new Error('Agent ID must be a non-empty string');
    }

    if (value.length < 5 || value.length > 50) {
      throw new Error('Agent ID must be between 5 and 50 characters');
    }

    // Validar formato básico
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(value)) {
      throw new Error('Agent ID contains invalid characters');
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
