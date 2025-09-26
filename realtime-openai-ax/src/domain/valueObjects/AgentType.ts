/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD) + Enum Pattern
 * 🎯 PRINCIPIO: Immutability + Type Safety + Business Rules
 * 
 * AgentType - Tipo de agente especializado
 * Define tipos válidos y comportamientos asociados
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🔄 PATRÓN: Enumeration Pattern
 * Tipos válidos de agente
 */
export enum AgentTypeEnum {
  SALES = 'sales',
  PAYMENT = 'payment',
  SUPPORT = 'support',
  MANAGER = 'manager'
}

/**
 * 🤖 PATRÓN: Agent Classification Pattern
 * AgentType encapsula lógica de tipos de agente
 */
export class AgentType extends BaseValueObject<AgentTypeEnum> {

  constructor(value: AgentTypeEnum) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Tipos predefinidos para creación segura
   */
  public static sales(): AgentType {
    return new AgentType(AgentTypeEnum.SALES);
  }

  public static payment(): AgentType {
    return new AgentType(AgentTypeEnum.PAYMENT);
  }

  public static support(): AgentType {
    return new AgentType(AgentTypeEnum.SUPPORT);
  }

  public static manager(): AgentType {
    return new AgentType(AgentTypeEnum.MANAGER);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): AgentType {
    const normalizedValue = value.toLowerCase().trim() as AgentTypeEnum;
    
    if (!Object.values(AgentTypeEnum).includes(normalizedValue)) {
      throw new Error(`Invalid agent type: ${value}`);
    }
    
    return new AgentType(normalizedValue);
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener nombre de tipo para mostrar
   */
  public getDisplayName(): string {
    const displayNames: Record<AgentTypeEnum, string> = {
      [AgentTypeEnum.SALES]: 'Sales Agent',
      [AgentTypeEnum.PAYMENT]: 'Payment Agent',
      [AgentTypeEnum.SUPPORT]: 'Support Agent',
      [AgentTypeEnum.MANAGER]: 'Manager Agent'
    };

    return displayNames[this._value];
  }

  /**
   * 🎨 PATRÓN: Icon Pattern
   * Obtener emoji/icono asociado al tipo
   */
  public getIcon(): string {
    const icons: Record<AgentTypeEnum, string> = {
      [AgentTypeEnum.SALES]: '🛒',
      [AgentTypeEnum.PAYMENT]: '💳',
      [AgentTypeEnum.SUPPORT]: '🎧',
      [AgentTypeEnum.MANAGER]: '👔'
    };

    return icons[this._value];
  }

  /**
   * 🎨 PATRÓN: Color Scheme Pattern
   * Obtener color asociado al tipo (para UI)
   */
  public getColor(): string {
    const colors: Record<AgentTypeEnum, string> = {
      [AgentTypeEnum.SALES]: '#2ecc71',      // Verde
      [AgentTypeEnum.PAYMENT]: '#3498db',    // Azul
      [AgentTypeEnum.SUPPORT]: '#f39c12',    // Naranja
      [AgentTypeEnum.MANAGER]: '#9b59b6'     // Púrpura
    };

    return colors[this._value];
  }

  /**
   * 📊 PATRÓN: Priority Pattern
   * Obtener prioridad del agente (para escalación)
   */
  public getPriority(): number {
    const priorities: Record<AgentTypeEnum, number> = {
      [AgentTypeEnum.SALES]: 1,      // Prioridad normal
      [AgentTypeEnum.PAYMENT]: 2,    // Prioridad alta
      [AgentTypeEnum.SUPPORT]: 3,    // Prioridad muy alta
      [AgentTypeEnum.MANAGER]: 4     // Prioridad máxima
    };

    return priorities[this._value];
  }

  /**
   * 📊 PATRÓN: Capability Pattern
   * Obtener capacidades del tipo de agente
   */
  public getCapabilities(): AgentCapability[] {
    const capabilities: Record<AgentTypeEnum, AgentCapability[]> = {
      [AgentTypeEnum.SALES]: [
        'menu_navigation',
        'order_taking',
        'recommendations',
        'product_information',
        'transfer_to_payment'
      ],
      [AgentTypeEnum.PAYMENT]: [
        'payment_processing',
        'address_collection',
        'order_confirmation',
        'customer_information',
        'transfer_to_sales'
      ],
      [AgentTypeEnum.SUPPORT]: [
        'issue_resolution',
        'order_tracking',
        'refund_processing',
        'escalation',
        'transfer_to_manager'
      ],
      [AgentTypeEnum.MANAGER]: [
        'all_capabilities',
        'agent_management',
        'system_override',
        'complex_issues',
        'final_decisions'
      ]
    };

    return capabilities[this._value];
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si puede manejar ventas
   */
  public canHandleSales(): boolean {
    return [AgentTypeEnum.SALES, AgentTypeEnum.MANAGER].includes(this._value);
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si puede procesar pagos
   */
  public canProcessPayments(): boolean {
    return [AgentTypeEnum.PAYMENT, AgentTypeEnum.MANAGER].includes(this._value);
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si puede dar soporte
   */
  public canProvideSupport(): boolean {
    return [AgentTypeEnum.SUPPORT, AgentTypeEnum.MANAGER].includes(this._value);
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si puede transferir a otro agente
   */
  public canTransferTo(targetType: AgentType): boolean {
    // Reglas de transferencia
    const transferRules: Record<AgentTypeEnum, AgentTypeEnum[]> = {
      [AgentTypeEnum.SALES]: [AgentTypeEnum.PAYMENT, AgentTypeEnum.SUPPORT],
      [AgentTypeEnum.PAYMENT]: [AgentTypeEnum.SALES, AgentTypeEnum.SUPPORT],
      [AgentTypeEnum.SUPPORT]: [AgentTypeEnum.MANAGER],
      [AgentTypeEnum.MANAGER]: [] // Manager no transfiere
    };

    return transferRules[this._value].includes(targetType._value);
  }

  /**
   * 🎯 PATRÓN: Default Configuration Pattern
   * Obtener configuración por defecto para el tipo
   */
  public getDefaultVoice(): string {
    const defaultVoices: Record<AgentTypeEnum, string> = {
      [AgentTypeEnum.SALES]: 'alloy',      // Voz amigable para ventas
      [AgentTypeEnum.PAYMENT]: 'echo',     // Voz profesional para pagos
      [AgentTypeEnum.SUPPORT]: 'nova',     // Voz empática para soporte
      [AgentTypeEnum.MANAGER]: 'onyx'      // Voz autoritaria para manager
    };

    return defaultVoices[this._value];
  }

  /**
   * 🎯 PATRÓN: Default Configuration Pattern
   * Obtener temperatura por defecto para el tipo
   */
  public getDefaultTemperature(): number {
    const defaultTemperatures: Record<AgentTypeEnum, number> = {
      [AgentTypeEnum.SALES]: 0.7,      // Más creativo para ventas
      [AgentTypeEnum.PAYMENT]: 0.3,    // Más preciso para pagos
      [AgentTypeEnum.SUPPORT]: 0.5,    // Balance para soporte
      [AgentTypeEnum.MANAGER]: 0.4     // Preciso pero flexible
    };

    return defaultTemperatures[this._value];
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar valor del tipo de agente
   */
  protected validate(value: AgentTypeEnum): void {
    if (!Object.values(AgentTypeEnum).includes(value)) {
      throw new Error(`Invalid agent type: ${value}`);
    }
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Obtener valor del tipo
   */
  public getValue(): AgentTypeEnum {
    return this._value;
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): string {
    return this._value;
  }
}

/**
 * 📊 PATRÓN: Capability System Pattern
 * Capacidades disponibles para agentes
 */
export type AgentCapability = 
  | 'menu_navigation'
  | 'order_taking'
  | 'recommendations'
  | 'product_information'
  | 'transfer_to_payment'
  | 'payment_processing'
  | 'address_collection'
  | 'order_confirmation'
  | 'customer_information'
  | 'transfer_to_sales'
  | 'issue_resolution'
  | 'order_tracking'
  | 'refund_processing'
  | 'escalation'
  | 'transfer_to_manager'
  | 'all_capabilities'
  | 'agent_management'
  | 'system_override'
  | 'complex_issues'
  | 'final_decisions';
