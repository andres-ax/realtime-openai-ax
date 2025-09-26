/**
 * 🏗️ PATRÓN: Domain Service Pattern (DDD)
 * 🎯 PRINCIPIO: Agent Management + Business Rules + State Transitions
 * 
 * AgentService - Servicio de dominio para gestión de agentes
 * Coordina transiciones entre agentes y aplica reglas de negocio
 */

import { Agent } from '../entities/Agent';
import { Customer } from '../entities/Customer';
import { Order } from '../entities/Order';
import { Cart } from '../entities/Cart';
import { AgentType } from '../valueObjects/AgentType';
import { AgentSwitchedEvent, AgentSwitchContext, AgentUIConfiguration } from '../events/AgentSwitchedEvent';

/**
 * 🎯 PATRÓN: Agent Management Service Pattern
 * AgentService encapsula lógica compleja de gestión y transición de agentes
 */
export class AgentService {

  /**
   * 🔄 PATRÓN: Agent Transition Pattern
   * Cambiar de agente con validaciones y contexto
   */
  public static switchAgent(
    sessionId: string,
    fromAgent: Agent | undefined,
    toAgentType: AgentType,
    reason: string,
    context: AgentTransitionContext
  ): AgentSwitchResult {
    try {
      // Validar transición
      const validationResult = AgentService.validateAgentTransition(
        fromAgent?.getType(),
        toAgentType,
        context
      );

      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error!,
          fromAgent,
          toAgent: undefined
        };
      }

      // Crear nuevo agente del tipo solicitado
      const toAgent = AgentService.createAgentByType(toAgentType);

      // Preparar contexto del switch
      const switchContext: AgentSwitchContext = {
        currentOrderId: context.order?.id.toString(),
        cartItemCount: context.cart?.getItemCount(),
        cartTotal: context.cart?.calculateTotal().getValue(),
        customerPhase: AgentService.determineCustomerPhase(context),
        lastInteraction: context.lastInteraction,
        metadata: context.metadata
      };

      // Crear evento de cambio de agente
      const switchEvent = new AgentSwitchedEvent(
        sessionId,
        toAgent.id,
        toAgent.getType(),
        reason,
        switchContext,
        context.customer?.id,
        fromAgent?.id,
        fromAgent?.getType()
      );

      // Registrar métricas en el agente anterior (si existe)
      if (fromAgent && context.sessionDuration) {
        const wasSuccessful = AgentService.wasTransitionSuccessful(
          fromAgent.getType(),
          toAgentType
        );
        fromAgent.recordSession(context.sessionDuration, wasSuccessful);
      }

      return {
        success: true,
        fromAgent,
        toAgent,
        switchEvent,
        transitionType: switchEvent.getTransitionType(),
        uiConfiguration: switchEvent.getUIConfiguration()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fromAgent,
        toAgent: undefined
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar transición entre agentes
   */
  public static validateAgentTransition(
    fromType: AgentType | undefined,
    toType: AgentType,
    context: AgentTransitionContext
  ): AgentTransitionValidation {
    // Validar que el tipo de destino sea válido
    if (!toType) {
      return {
        isValid: false,
        error: 'Target agent type is required'
      };
    }

    // Si no hay agente origen, es asignación inicial (siempre válida)
    if (!fromType) {
      return { isValid: true };
    }

    // Validar transiciones permitidas
    if (!fromType.canTransferTo(toType)) {
      return {
        isValid: false,
        error: `Cannot transfer from ${fromType.getDisplayName()} to ${toType.getDisplayName()}`
      };
    }

    // Validaciones específicas por contexto
    if (toType.getValue() === 'payment') {
      if (!context.cart || context.cart.isEmpty()) {
        return {
          isValid: false,
          error: 'Cannot transfer to payment agent with empty cart'
        };
      }

      if (!context.customer?.hasCompleteContactInfo()) {
        return {
          isValid: false,
          error: 'Customer contact information required for payment'
        };
      }
    }

    if (toType.getValue() === 'sales') {
      // Sales agent siempre puede recibir transferencias
      return { isValid: true };
    }

    if (toType.getValue() === 'support') {
      // Support requiere un problema específico
      if (!context.supportReason) {
        return {
          isValid: false,
          error: 'Support reason required for support agent transfer'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear agente por tipo
   */
  public static createAgentByType(agentType: AgentType): Agent {
    switch (agentType.getValue()) {
      case 'sales':
        return Agent.createSalesAgent();
      
      case 'payment':
        return Agent.createPaymentAgent();
      
      default:
        throw new Error(`Unsupported agent type: ${agentType.getValue()}`);
    }
  }

  /**
   * 📊 PATRÓN: State Analysis Pattern
   * Determinar fase del cliente
   */
  private static determineCustomerPhase(
    context: AgentTransitionContext
  ): 'browsing' | 'ordering' | 'checkout' | 'payment' | 'support' {
    if (context.supportReason) {
      return 'support';
    }

    if (context.order && context.order.getStatus().isConfirmed()) {
      return 'payment';
    }

    if (context.cart && !context.cart.isEmpty()) {
      if (context.customer?.hasCompleteContactInfo()) {
        return 'checkout';
      }
      return 'ordering';
    }

    return 'browsing';
  }

  /**
   * 📊 PATRÓN: Success Metrics Pattern
   * Determinar si la transición fue exitosa
   */
  private static wasTransitionSuccessful(
    fromType: AgentType,
    toType: AgentType
  ): boolean {
    // Transiciones normales del flujo son exitosas
    const normalTransitions = [
      { from: 'sales', to: 'payment' },
      { from: 'payment', to: 'sales' }
    ];

    return normalTransitions.some(transition =>
      fromType.getValue() === transition.from && 
      toType.getValue() === transition.to
    );
  }

  /**
   * 🎯 PATRÓN: Agent Selection Pattern
   * Seleccionar mejor agente para contexto
   */
  public static selectBestAgent(context: AgentSelectionContext): AgentRecommendation {
    const recommendations: AgentRecommendation[] = [];

    // Analizar contexto para recomendar agente
    if (context.cart && !context.cart.isEmpty()) {
      if (context.customer?.hasCompleteContactInfo() && 
          context.customer?.hasDeliveryAddress()) {
        // Listo para pago
        recommendations.push({
          agentType: AgentType.payment(),
          confidence: 90,
          reason: 'Customer ready for checkout with complete information'
        });
      } else {
        // Necesita completar información
        recommendations.push({
          agentType: AgentType.sales(),
          confidence: 85,
          reason: 'Customer needs to complete order information'
        });
      }
    } else {
      // Carrito vacío, necesita ayuda con menú
      recommendations.push({
        agentType: AgentType.sales(),
        confidence: 95,
        reason: 'Customer needs menu assistance'
      });
    }

    // Si hay problemas, recomendar soporte
    if (context.hasIssues) {
      recommendations.push({
        agentType: AgentType.support(),
        confidence: 100,
        reason: 'Customer has reported issues'
      });
    }

    // Retornar la recomendación con mayor confianza
    return recommendations.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * 📊 PATRÓN: Performance Analytics Pattern
   * Analizar rendimiento de agentes
   */
  public static analyzeAgentPerformance(agents: Agent[]): AgentPerformanceReport {
    const salesAgents = agents.filter(a => a.getType().getValue() === 'sales');
    const paymentAgents = agents.filter(a => a.getType().getValue() === 'payment');

    const salesMetrics = AgentService.calculateAggregateMetrics(salesAgents);
    const paymentMetrics = AgentService.calculateAggregateMetrics(paymentAgents);

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.isActive()).length,
      salesAgents: {
        count: salesAgents.length,
        metrics: salesMetrics
      },
      paymentAgents: {
        count: paymentAgents.length,
        metrics: paymentMetrics
      },
      overallMetrics: AgentService.calculateAggregateMetrics(agents),
      recommendations: AgentService.generatePerformanceRecommendations(agents)
    };
  }

  /**
   * 📊 PATRÓN: Metrics Aggregation Pattern
   * Calcular métricas agregadas
   */
  private static calculateAggregateMetrics(agents: Agent[]): AggregateMetrics {
    if (agents.length === 0) {
      return {
        averageSessionCount: 0,
        averageSuccessRate: 0,
        averageSessionDuration: 0,
        totalSessions: 0
      };
    }

    const totalSessions = agents.reduce((sum, agent) => 
      sum + agent.getSessionCount(), 0
    );

    const totalSuccessfulTransfers = agents.reduce((sum, agent) => 
      sum + agent.getSuccessfulTransfers(), 0
    );

    const totalSessionDuration = agents.reduce((sum, agent) => 
      sum + (agent.getSessionCount() * agent.getAverageSessionDuration()), 0
    );

    return {
      averageSessionCount: totalSessions / agents.length,
      averageSuccessRate: totalSessions > 0 ? 
        (totalSuccessfulTransfers / totalSessions) * 100 : 0,
      averageSessionDuration: totalSessions > 0 ? 
        totalSessionDuration / totalSessions : 0,
      totalSessions
    };
  }

  /**
   * 💡 PATRÓN: Recommendation Engine Pattern
   * Generar recomendaciones de rendimiento
   */
  private static generatePerformanceRecommendations(agents: Agent[]): string[] {
    const recommendations: string[] = [];
    const activeAgents = agents.filter(a => a.isActive());

    if (activeAgents.length === 0) {
      recommendations.push('No active agents - activate at least one agent');
      return recommendations;
    }

    const avgSuccessRate = AgentService.calculateAggregateMetrics(activeAgents)
      .averageSuccessRate;

    if (avgSuccessRate < 70) {
      recommendations.push('Low success rate - review agent configurations');
    }

    const longSessionAgents = activeAgents.filter(a => 
      a.getAverageSessionDuration() > 300 // 5 minutos
    );

    if (longSessionAgents.length > 0) {
      recommendations.push('Some agents have long session durations - optimize workflows');
    }

    if (activeAgents.length < 2) {
      recommendations.push('Consider activating more agents for better coverage');
    }

    return recommendations;
  }
}

/**
 * 📊 PATRÓN: Context Object Pattern
 * Contexto para transición de agente
 */
export interface AgentTransitionContext {
  customer?: Customer;
  order?: Order;
  cart?: Cart;
  sessionDuration?: number;
  lastInteraction?: string;
  supportReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 📊 PATRÓN: Result Object Pattern
 * Resultado de cambio de agente
 */
export interface AgentSwitchResult {
  success: boolean;
  error?: string;
  fromAgent?: Agent;
  toAgent?: Agent;
  switchEvent?: AgentSwitchedEvent;
  transitionType?: string;
  uiConfiguration?: AgentUIConfiguration;
}

/**
 * 🛡️ PATRÓN: Validation Result Pattern
 * Resultado de validación de transición
 */
export interface AgentTransitionValidation {
  isValid: boolean;
  error?: string;
}

/**
 * 🎯 PATRÓN: Selection Context Pattern
 * Contexto para selección de agente
 */
export interface AgentSelectionContext {
  customer?: Customer;
  cart?: Cart;
  order?: Order;
  hasIssues?: boolean;
  preferredAgentType?: AgentType;
}

/**
 * 💡 PATRÓN: Recommendation Pattern
 * Recomendación de agente
 */
export interface AgentRecommendation {
  agentType: AgentType;
  confidence: number;
  reason: string;
}

/**
 * 📊 PATRÓN: Performance Report Pattern
 * Reporte de rendimiento de agentes
 */
export interface AgentPerformanceReport {
  totalAgents: number;
  activeAgents: number;
  salesAgents: {
    count: number;
    metrics: AggregateMetrics;
  };
  paymentAgents: {
    count: number;
    metrics: AggregateMetrics;
  };
  overallMetrics: AggregateMetrics;
  recommendations: string[];
}

/**
 * 📊 PATRÓN: Metrics Pattern
 * Métricas agregadas
 */
export interface AggregateMetrics {
  averageSessionCount: number;
  averageSuccessRate: number;
  averageSessionDuration: number;
  totalSessions: number;
}
