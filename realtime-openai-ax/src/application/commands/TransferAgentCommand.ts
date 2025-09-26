/**
 * 🏗️ PATRÓN: Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Query Responsibility Segregation + Agent Transitions
 * 
 * TransferAgentCommand - Comando para transferir entre agentes
 * Encapsula la intención de cambiar el agente activo en una sesión
 */

import { BaseCommand, CommandValidationResult, CommandMetadata, SerializedCommand } from './BaseCommand';

/**
 * 🎯 PATRÓN: Command Pattern
 * TransferAgentCommand representa la intención de transferir control entre agentes
 */
export class TransferAgentCommand extends BaseCommand {
  
  /**
   * 🔧 PATRÓN: Immutable Command Pattern
   * Constructor que crea comando inmutable
   */
  constructor(
    public readonly sessionId: string,
    public readonly fromAgentId: string | undefined,
    public readonly toAgentType: AgentType,
    public readonly transferReason: TransferReason,
    public readonly customerId?: string,
    public readonly cartId?: string,
    public readonly orderId?: string,
    public readonly contextData?: TransferContextData,
    public readonly priority?: TransferPriority,
    commandId?: string
  ) {
    super(commandId);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar comando antes de procesamiento
   */
  public validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.sessionId?.trim()) {
      errors.push('Session ID is required');
    }

    if (!this.toAgentType) {
      errors.push('Target agent type is required');
    }

    if (!this.transferReason) {
      errors.push('Transfer reason is required');
    }

    // Validar que no se transfiera al mismo agente
    if (this.fromAgentId && this.fromAgentId === this.toAgentType) {
      errors.push('Cannot transfer to the same agent');
    }

    // Validaciones específicas por razón de transferencia
    switch (this.transferReason) {
      case 'PAYMENT_REQUIRED':
        if (this.toAgentType !== 'PAYMENT') {
          errors.push('Payment transfers must target payment agent');
        }
        if (!this.cartId && !this.orderId) {
          errors.push('Cart ID or Order ID required for payment transfers');
        }
        break;

      case 'MENU_ASSISTANCE':
        if (this.toAgentType !== 'SALES') {
          errors.push('Menu assistance transfers must target sales agent');
        }
        break;

      case 'TECHNICAL_ISSUE':
        if (this.toAgentType !== 'SUPPORT') {
          errors.push('Technical issues must be transferred to support agent');
        }
        break;

      case 'ESCALATION':
        if (!this.contextData?.escalationLevel) {
          errors.push('Escalation level required for escalation transfers');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Command Metadata Pattern
   * Obtener metadatos del comando
   */
  public getMetadata(): CommandMetadata {
    return {
      commandType: 'TransferAgentCommand',
      commandId: this.commandId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      agentId: this.fromAgentId,
      targetResource: this.toAgentType,
      priority: this.getPriorityLevel(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresUIUpdate: true,
      affectedSystems: ['agent-service', 'session-service', 'ui-service']
    };
  }

  /**
   * 🔄 PATRÓN: Command Serialization Pattern
   * Serializar comando para persistencia o transmisión
   */
  public serialize(): SerializedCommand {
    return {
      commandType: 'TransferAgentCommand',
      commandId: this.commandId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        sessionId: this.sessionId,
        fromAgentId: this.fromAgentId,
        toAgentType: this.toAgentType,
        transferReason: this.transferReason,
        customerId: this.customerId,
        cartId: this.cartId,
        orderId: this.orderId,
        contextData: this.contextData,
        priority: this.priority
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear comando desde datos serializados
   */
  public static fromSerialized(data: SerializedCommand): TransferAgentCommand {
    if (data.commandType !== 'TransferAgentCommand') {
      throw new Error('Invalid command type for TransferAgentCommand');
    }

    const payload = data.payload as {
      sessionId: string;
      fromAgentId?: string;
      toAgentType: AgentType;
      transferReason: TransferReason;
      customerId?: string;
      cartId?: string;
      orderId?: string;
      contextData?: TransferContextData;
      priority?: TransferPriority;
    };
    return new TransferAgentCommand(
      payload.sessionId,
      payload.fromAgentId,
      payload.toAgentType,
      payload.transferReason,
      payload.customerId,
      payload.cartId,
      payload.orderId,
      payload.contextData,
      payload.priority,
      data.commandId
    );
  }

  /**
   * 🎯 PATRÓN: Command Builder Pattern
   * Builder para construcción fluida de comandos
   */
  public static builder(): TransferAgentCommandBuilder {
    return new TransferAgentCommandBuilder();
  }

  /**
   * 🔍 PATRÓN: Command Inspection Pattern
   * Verificar si el comando afecta un recurso específico
   */
  public affectsResource(resourceType: string, resourceId?: string): boolean {
    switch (resourceType) {
      case 'session':
        return resourceId ? this.sessionId === resourceId : true;
      case 'agent':
        if (resourceId) {
          return this.fromAgentId === resourceId || this.toAgentType === resourceId;
        }
        return true;
      case 'customer':
        return this.customerId ? (resourceId ? this.customerId === resourceId : true) : false;
      case 'cart':
        return this.cartId ? (resourceId ? this.cartId === resourceId : true) : false;
      case 'order':
        return this.orderId ? (resourceId ? this.orderId === resourceId : true) : false;
      default:
        return false;
    }
  }

  /**
   * 📊 PATRÓN: Priority Calculation Pattern
   * Calcular prioridad basada en razón de transferencia
   */
  private getPriorityLevel(): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    if (this.priority) {
      switch (this.priority) {
        case 'URGENT': return 'CRITICAL';
        case 'HIGH': return 'HIGH';
        case 'NORMAL': return 'NORMAL';
        case 'LOW': return 'LOW';
      }
    }

    // Prioridad automática basada en razón
    switch (this.transferReason) {
      case 'TECHNICAL_ISSUE':
      case 'ESCALATION':
        return 'HIGH';
      case 'PAYMENT_REQUIRED':
        return 'NORMAL';
      case 'MENU_ASSISTANCE':
      case 'USER_REQUEST':
        return 'NORMAL';
      case 'AUTOMATIC':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de transferencia
   */
  private getEstimatedDuration(): number {
    switch (this.transferReason) {
      case 'TECHNICAL_ISSUE':
        return 5000; // 5 segundos - requiere diagnóstico
      case 'ESCALATION':
        return 3000; // 3 segundos - requiere contexto
      case 'PAYMENT_REQUIRED':
        return 2000; // 2 segundos - cambio directo
      case 'MENU_ASSISTANCE':
        return 1500; // 1.5 segundos - cambio simple
      case 'USER_REQUEST':
        return 1000; // 1 segundo - cambio inmediato
      case 'AUTOMATIC':
        return 500;  // 0.5 segundos - cambio automático
      default:
        return 2000;
    }
  }

  /**
   * 🎨 PATRÓN: Command Decoration Pattern
   * Crear variantes del comando
   */
  public withPriority(priority: TransferPriority): TransferAgentCommand {
    return new TransferAgentCommand(
      this.sessionId,
      this.fromAgentId,
      this.toAgentType,
      this.transferReason,
      this.customerId,
      this.cartId,
      this.orderId,
      this.contextData,
      priority,
      this.commandId
    );
  }

  public withContext(contextData: TransferContextData): TransferAgentCommand {
    return new TransferAgentCommand(
      this.sessionId,
      this.fromAgentId,
      this.toAgentType,
      this.transferReason,
      this.customerId,
      this.cartId,
      this.orderId,
      { ...this.contextData, ...contextData },
      this.priority,
      this.commandId
    );
  }

  public forCustomer(customerId: string): TransferAgentCommand {
    return new TransferAgentCommand(
      this.sessionId,
      this.fromAgentId,
      this.toAgentType,
      this.transferReason,
      customerId,
      this.cartId,
      this.orderId,
      this.contextData,
      this.priority,
      this.commandId
    );
  }

  /**
   * 🔍 PATRÓN: Transfer Analysis Pattern
   * Analizar características de la transferencia
   */
  public getTransferAnalysis(): TransferAnalysis {
    return {
      isEscalation: this.transferReason === 'ESCALATION',
      isAutomated: this.transferReason === 'AUTOMATIC',
      requiresContext: this.contextData !== undefined,
      hasCustomerData: this.customerId !== undefined,
      hasOrderData: this.orderId !== undefined || this.cartId !== undefined,
      estimatedImpact: this.getEstimatedImpact(),
      riskLevel: this.getRiskLevel()
    };
  }

  /**
   * 📊 PATRÓN: Impact Assessment Pattern
   * Evaluar impacto estimado de la transferencia
   */
  private getEstimatedImpact(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.transferReason === 'ESCALATION' || this.transferReason === 'TECHNICAL_ISSUE') {
      return 'HIGH';
    }
    if (this.transferReason === 'PAYMENT_REQUIRED') {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * ⚠️ PATRÓN: Risk Assessment Pattern
   * Evaluar nivel de riesgo de la transferencia
   */
  private getRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.transferReason === 'TECHNICAL_ISSUE') {
      return 'HIGH';
    }
    if (this.transferReason === 'ESCALATION' || this.transferReason === 'PAYMENT_REQUIRED') {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de TransferAgentCommand
 */
export class TransferAgentCommandBuilder {
  private sessionId?: string;
  private fromAgentId?: string;
  private toAgentType?: AgentType;
  private transferReason?: TransferReason;
  private customerId?: string;
  private cartId?: string;
  private orderId?: string;
  private contextData?: TransferContextData;
  private priority?: TransferPriority;

  public forSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public fromAgent(agentId: string): this {
    this.fromAgentId = agentId;
    return this;
  }

  public toAgent(agentType: AgentType): this {
    this.toAgentType = agentType;
    return this;
  }

  public withReason(reason: TransferReason): this {
    this.transferReason = reason;
    return this;
  }

  public forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public withCart(cartId: string): this {
    this.cartId = cartId;
    return this;
  }

  public withOrder(orderId: string): this {
    this.orderId = orderId;
    return this;
  }

  public withContext(contextData: TransferContextData): this {
    this.contextData = contextData;
    return this;
  }

  public withPriority(priority: TransferPriority): this {
    this.priority = priority;
    return this;
  }

  public build(): TransferAgentCommand {
    if (!this.sessionId) throw new Error('Session ID is required');
    if (!this.toAgentType) throw new Error('Target agent type is required');
    if (!this.transferReason) throw new Error('Transfer reason is required');

    return new TransferAgentCommand(
      this.sessionId,
      this.fromAgentId,
      this.toAgentType,
      this.transferReason,
      this.customerId,
      this.cartId,
      this.orderId,
      this.contextData,
      this.priority
    );
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para transferencias de agente
 */
export type AgentType = 'SALES' | 'PAYMENT' | 'SUPPORT';

export type TransferReason = 
  | 'PAYMENT_REQUIRED'
  | 'MENU_ASSISTANCE'
  | 'TECHNICAL_ISSUE'
  | 'ESCALATION'
  | 'USER_REQUEST'
  | 'AUTOMATIC';

export type TransferPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * 📊 PATRÓN: Context Data Pattern
 * Datos de contexto para la transferencia
 */
export interface TransferContextData {
  previousInteractions?: string[];
  escalationLevel?: number;
  issueDescription?: string;
  customerSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sessionDuration?: number;
  lastAgentAction?: string;
  transferCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 📊 PATRÓN: Analysis Result Pattern
 * Resultado del análisis de transferencia
 */
export interface TransferAnalysis {
  isEscalation: boolean;
  isAutomated: boolean;
  requiresContext: boolean;
  hasCustomerData: boolean;
  hasOrderData: boolean;
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}
