/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Agent Management
 * 
 * AgentSwitchedEvent - Evento emitido cuando se cambia de agente
 * Permite transiciones fluidas entre agentes especializados
 */

import { BaseDomainEvent } from './DomainEvent';
import { AgentId } from '../valueObjects/AgentId';
import { AgentType } from '../valueObjects/AgentType';
import { CustomerId } from '../valueObjects/CustomerId';

/**
 * 📡 PATRÓN: Agent Transition Event Pattern
 * AgentSwitchedEvent captura transiciones entre agentes
 */
export class AgentSwitchedEvent extends BaseDomainEvent {
  public readonly customerId?: CustomerId;
  public readonly sessionId: string;
  public readonly fromAgentId?: AgentId;
  public readonly fromAgentType?: AgentType;
  public readonly toAgentId: AgentId;
  public readonly toAgentType: AgentType;
  public readonly reason: string;
  public readonly context: AgentSwitchContext;
  public readonly switchedAt: Date;

  constructor(
    sessionId: string,
    toAgentId: AgentId,
    toAgentType: AgentType,
    reason: string,
    context: AgentSwitchContext,
    customerId?: CustomerId,
    fromAgentId?: AgentId,
    fromAgentType?: AgentType
  ) {
    super(
      sessionId,
      'AgentSwitched',
      {
        sessionId,
        customerId: customerId?.toString(),
        fromAgentId: fromAgentId?.toString(),
        fromAgentType: fromAgentType?.getValue(),
        toAgentId: toAgentId.toString(),
        toAgentType: toAgentType.getValue(),
        reason,
        context,
        switchedAt: new Date().toISOString()
      }
    );
    
    this.customerId = customerId;
    this.sessionId = sessionId;
    this.fromAgentId = fromAgentId;
    this.fromAgentType = fromAgentType;
    this.toAgentId = toAgentId;
    this.toAgentType = toAgentType;
    this.reason = reason;
    this.context = context;
    this.switchedAt = new Date();
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para procesamiento
   */
  public getPayload(): AgentSwitchedEventPayload {
    return {
      sessionId: this.sessionId,
      customerId: this.customerId?.toString(),
      fromAgent: this.fromAgentId ? {
        id: this.fromAgentId.toString(),
        type: this.fromAgentType!.getValue(),
        displayName: this.fromAgentType!.getDisplayName()
      } : undefined,
      toAgent: {
        id: this.toAgentId.toString(),
        type: this.toAgentType.getValue(),
        displayName: this.toAgentType.getDisplayName()
      },
      reason: this.reason,
      context: this.context,
      switchedAt: this.switchedAt.toISOString()
    };
  }

  /**
   * 🔍 PATRÓN: Event Identification Pattern
   * Identificar la sesión afectada
   */
  public getAggregateId(): string {
    return this.sessionId;
  }

  /**
   * 🎯 PATRÓN: Event Description Pattern
   * Descripción legible del evento
   */
  public getDescription(): string {
    const fromText = this.fromAgentType 
      ? ` from ${this.fromAgentType.getDisplayName()}`
      : '';
    
    return `Session ${this.sessionId} switched${fromText} to ${this.toAgentType.getDisplayName()}: ${this.reason}`;
  }

  /**
   * 📊 PATRÓN: Transition Analysis Pattern
   * Analizar tipo de transición
   */
  public getTransitionType(): AgentTransitionType {
    if (!this.fromAgentType) {
      return 'INITIAL_ASSIGNMENT';
    }

    const from = this.fromAgentType.getValue();
    const to = this.toAgentType.getValue();

    if (from === 'sales' && to === 'payment') {
      return 'SALES_TO_PAYMENT';
    } else if (from === 'payment' && to === 'sales') {
      return 'PAYMENT_TO_SALES';
    } else if (to === 'support') {
      return 'ESCALATION_TO_SUPPORT';
    } else if (to === 'manager') {
      return 'ESCALATION_TO_MANAGER';
    } else {
      return 'OTHER';
    }
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es escalación
   */
  public isEscalation(): boolean {
    const transitionType = this.getTransitionType();
    return transitionType === 'ESCALATION_TO_SUPPORT' || 
           transitionType === 'ESCALATION_TO_MANAGER';
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es transición normal del flujo
   */
  public isNormalFlow(): boolean {
    const transitionType = this.getTransitionType();
    return transitionType === 'SALES_TO_PAYMENT' || 
           transitionType === 'PAYMENT_TO_SALES' ||
           transitionType === 'INITIAL_ASSIGNMENT';
  }

  /**
   * 🎨 PATRÓN: UI Configuration Pattern
   * Obtener configuración de UI para el nuevo agente
   */
  public getUIConfiguration(): AgentUIConfiguration {
    return {
      agentName: this.getAgentDisplayName(),
      agentColor: this.toAgentType.getColor(),
      agentIcon: this.toAgentType.getIcon(),
      voiceSettings: {
        voice: this.toAgentType.getDefaultVoice(),
        temperature: this.toAgentType.getDefaultTemperature()
      },
      capabilities: this.toAgentType.getCapabilities(),
      shouldShowTransition: true,
      transitionMessage: this.getTransitionMessage()
    };
  }

  /**
   * 🎯 PATRÓN: Display Name Pattern
   * Obtener nombre del agente para mostrar
   */
  private getAgentDisplayName(): string {
    // Nombres específicos para agentes conocidos
    const agentNames: Record<string, string> = {
      'sales': 'Luxora',
      'payment': 'Karol'
    };

    return agentNames[this.toAgentType.getValue()] || this.toAgentType.getDisplayName();
  }

  /**
   * 💬 PATRÓN: Message Generation Pattern
   * Generar mensaje de transición
   */
  private getTransitionMessage(): string {
    const agentName = this.getAgentDisplayName();
    const transitionType = this.getTransitionType();

    const messages: Record<AgentTransitionType, string> = {
      'INITIAL_ASSIGNMENT': `Hi! I'm ${agentName}, I'll be helping you today.`,
      'SALES_TO_PAYMENT': `Great! Let me transfer you to ${agentName} to complete your order.`,
      'PAYMENT_TO_SALES': `I'm transferring you back to ${agentName} to modify your order.`,
      'ESCALATION_TO_SUPPORT': `Let me connect you with ${agentName} from our support team.`,
      'ESCALATION_TO_MANAGER': `I'm connecting you with ${agentName}, our manager, for assistance.`,
      'OTHER': `You're now speaking with ${agentName}.`
    };

    return messages[transitionType];
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface AgentSwitchedEventPayload {
  sessionId: string;
  customerId?: string;
  fromAgent?: {
    id: string;
    type: string;
    displayName: string;
  };
  toAgent: {
    id: string;
    type: string;
    displayName: string;
  };
  reason: string;
  context: AgentSwitchContext;
  switchedAt: string;
}

/**
 * 📊 PATRÓN: Context Information Pattern
 * Contexto del cambio de agente
 */
export interface AgentSwitchContext {
  currentOrderId?: string;
  cartItemCount?: number;
  cartTotal?: number;
  customerPhase: 'browsing' | 'ordering' | 'checkout' | 'payment' | 'support';
  lastInteraction?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 📊 PATRÓN: Transition Classification Pattern
 * Tipos de transición entre agentes
 */
export type AgentTransitionType = 
  | 'INITIAL_ASSIGNMENT'
  | 'SALES_TO_PAYMENT'
  | 'PAYMENT_TO_SALES'
  | 'ESCALATION_TO_SUPPORT'
  | 'ESCALATION_TO_MANAGER'
  | 'OTHER';

/**
 * 🎨 PATRÓN: UI Configuration Pattern
 * Configuración de UI para el agente
 */
export interface AgentUIConfiguration {
  agentName: string;
  agentColor: string;
  agentIcon: string;
  voiceSettings: {
    voice: string;
    temperature: number;
  };
  capabilities: string[];
  shouldShowTransition: boolean;
  transitionMessage: string;
}
