/**
 * 🏗️ PATRÓN: Event Handler Pattern (Event-Driven Architecture)
 * 🎯 PRINCIPIO: Agent Switch Handling + Real-time Transitions + OpenAI Demo
 * 
 * AgentSwitchedEventHandler - Manejador para eventos de cambio de agente
 * Optimizado para transiciones fluidas entre agentes Sales y Payment
 */

import { BaseEventHandler, EventHandlerResult, SideEffect } from './BaseEventHandler';
import { AgentSwitchedEvent } from '../../domain/events/AgentSwitchedEvent';
import { DomainEvent } from '../../domain/events/DomainEvent';
// AgentType imported in domain events

/**
 * 🎯 PATRÓN: Specific Event Handler Pattern
 * AgentSwitchedEventHandler maneja específicamente eventos de cambio de agente
 */
export class AgentSwitchedEventHandler extends BaseEventHandler<AgentSwitchedEvent> {
  
  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor específico para eventos de agentes
   */
  constructor(handlerId?: string) {
    super('AgentSwitchedEvent', handlerId);
  }

  /**
   * 🛡️ PATRÓN: Event Type Validation Pattern
   * Verificar si puede manejar el evento
   */
  public canHandle(event: DomainEvent): boolean {
    return event.eventType === 'AgentSwitchedEvent' && 
           event instanceof AgentSwitchedEvent;
  }

  /**
   * 📊 PATRÓN: Event Handler Implementation Pattern
   * Implementación principal del manejo de eventos
   */
  public async handle(event: AgentSwitchedEvent): Promise<EventHandlerResult> {
    try {
      this.log('info', 'Processing AgentSwitchedEvent', {
        eventId: event.eventId,
        sessionId: event.sessionId,
        fromAgent: event.fromAgentType,
        toAgent: event.toAgentType,
        reason: event.reason
      });

      const sideEffects: SideEffect[] = [];

      // 1. Actualizar sesión con nuevo agente
      const sessionResult = await this.updateSessionAgent(event);
      sideEffects.push(sessionResult);

      // 2. Actualizar configuración de UI para el nuevo agente
      const uiConfigResult = await this.updateUIConfiguration(event);
      sideEffects.push(uiConfigResult);

      // 3. Emitir evento de cambio de agente para UI
      const uiEventResult = this.emitAgentSwitchEvent(event);
      sideEffects.push(uiEventResult);

      // 4. Actualizar métricas de agentes
      const metricsResult = await this.updateAgentMetrics(event);
      sideEffects.push(metricsResult);

      // 5. Procesar transición específica
      const transitionResult = await this.processAgentTransition(event);
      if (transitionResult) {
        sideEffects.push(transitionResult);
      }

      // 6. Configurar herramientas del nuevo agente
      const toolsResult = await this.configureAgentTools(event);
      sideEffects.push(toolsResult);

      // 7. Actualizar contexto de conversación
      const contextResult = await this.updateConversationContext(event);
      sideEffects.push(contextResult);

      const successfulSideEffects = sideEffects.filter(se => se.success);
      const failedSideEffects = sideEffects.filter(se => !se.success);

      return {
        success: failedSideEffects.length === 0,
        message: `Agent switched successfully from ${event.fromAgentType} to ${event.toAgentType}. ${successfulSideEffects.length} side effects completed.`,
        sideEffects,
        error: failedSideEffects.length > 0 ? 
          `${failedSideEffects.length} side effects failed` : undefined
      };

    } catch (error) {
      this.log('error', 'Failed to handle AgentSwitchedEvent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 🎮 PATRÓN: Session Update Pattern
   * Actualizar información de agente en la sesión
   */
  private async updateSessionAgent(event: AgentSwitchedEvent): Promise<SideEffect> {
    try {
      const sessionKey = this.getStorageKey('session', event.sessionId);
      const sessionData = this.getBrowserStorage(sessionKey) as Record<string, unknown> || {};

      // Actualizar información del agente
      sessionData.currentAgentId = event.toAgentId;
      sessionData.currentAgentType = event.toAgentType;
      sessionData.previousAgentId = event.fromAgentId;
      sessionData.previousAgentType = event.fromAgentType;
      sessionData.lastAgentSwitch = event.switchedAt;
      sessionData.agentSwitchReason = event.reason;

      // Mantener historial de cambios de agente
      const agentHistory = (sessionData.agentHistory as Array<Record<string, unknown>>) || [];
      agentHistory.push({
        fromAgent: event.fromAgentType,
        toAgent: event.toAgentType,
        timestamp: event.switchedAt,
        reason: event.reason,
        transitionType: event.getTransitionType()
      });
      sessionData.agentHistory = agentHistory;

      this.setBrowserStorage(sessionKey, sessionData);

      return {
        type: 'STORAGE_UPDATE',
        description: `Session ${event.sessionId} updated with new agent`,
        success: true,
        data: {
          sessionId: event.sessionId,
          newAgent: event.toAgentType,
          previousAgent: event.fromAgentType
        }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update session with new agent',
        success: false,
        error: error instanceof Error ? error.message : 'Session update failed'
      };
    }
  }

  /**
   * 🎨 PATRÓN: UI Configuration Update Pattern
   * Actualizar configuración de UI para el nuevo agente
   */
  private async updateUIConfiguration(event: AgentSwitchedEvent): Promise<SideEffect> {
    try {
      const uiConfig = this.generateUIConfiguration(event.toAgentType.getValue());
      const uiConfigKey = this.getStorageKey('ui-config', event.sessionId);
      
      this.setBrowserStorage(uiConfigKey, uiConfig);

      return {
        type: 'STORAGE_UPDATE',
        description: `UI configuration updated for ${event.toAgentType} agent`,
        success: true,
        data: uiConfig
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update UI configuration',
        success: false,
        error: error instanceof Error ? error.message : 'UI config update failed'
      };
    }
  }

  /**
   * 🎨 PATRÓN: UI Configuration Generation Pattern
   * Generar configuración de UI específica por agente
   */
  private generateUIConfiguration(agentType: string): AgentUIConfig {
    const baseConfig = {
      timestamp: new Date().toISOString(),
      agentType
    };

    switch (agentType.toLowerCase()) {
      case 'sales':
        return {
          ...baseConfig,
          theme: {
            primaryColor: '#4CAF50',
            secondaryColor: '#81C784',
            accentColor: '#2E7D32'
          },
          layout: {
            showCarousel: true,
            showMenuCategories: true,
            showRecommendations: true,
            showCart: true
          },
          features: {
            voiceEnabled: true,
            menuFocus: true,
            itemRecommendations: true,
            nutritionInfo: true
          },
          personality: {
            greeting: "Hi! I'm Luxora, your sales assistant. I'm here to help you explore our delicious menu!",
            tone: 'friendly',
            enthusiasm: 'high'
          }
        };

      case 'payment':
        return {
          ...baseConfig,
          theme: {
            primaryColor: '#2196F3',
            secondaryColor: '#64B5F6',
            accentColor: '#1976D2'
          },
          layout: {
            showCarousel: false,
            showMenuCategories: false,
            showRecommendations: false,
            showCart: true,
            showPaymentForm: true,
            showOrderSummary: true
          },
          features: {
            voiceEnabled: true,
            menuFocus: false,
            itemRecommendations: false,
            nutritionInfo: false,
            paymentProcessing: true,
            addressCollection: true
          },
          personality: {
            greeting: "Hello! I'm Karol, your payment specialist. Let's complete your order securely.",
            tone: 'professional',
            enthusiasm: 'moderate'
          }
        };

      default:
        return {
          ...baseConfig,
          theme: {
            primaryColor: '#757575',
            secondaryColor: '#BDBDBD',
            accentColor: '#424242'
          },
          layout: {
            showCarousel: true,
            showMenuCategories: true,
            showRecommendations: false,
            showCart: true
          },
          features: {
            voiceEnabled: true,
            menuFocus: false,
            itemRecommendations: false,
            nutritionInfo: false
          },
          personality: {
            greeting: "Hello! I'm here to assist you.",
            tone: 'neutral',
            enthusiasm: 'low'
          }
        };
    }
  }

  /**
   * 📡 PATRÓN: Agent Switch Event Broadcasting Pattern
   * Emitir evento de cambio de agente para UI
   */
  private emitAgentSwitchEvent(event: AgentSwitchedEvent): SideEffect {
    try {
      const switchEventData = {
        type: 'AGENT_SWITCHED',
        sessionId: event.sessionId,
        fromAgent: {
          id: event.fromAgentId,
          type: event.fromAgentType,
          name: this.getAgentName(event.fromAgentType?.getValue() || '')
        },
        toAgent: {
          id: event.toAgentId,
          type: event.toAgentType,
          name: this.getAgentName(event.toAgentType.getValue())
        },
        reason: event.reason,
        transitionType: event.getTransitionType(),
        timestamp: event.switchedAt
      };

      this.emitBrowserEvent('realtime-agent-switch', switchEventData);

      return {
        type: 'BROWSER_EVENT',
        description: 'Agent switch event emitted to UI',
        success: true,
        data: switchEventData
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to emit agent switch event',
        success: false,
        error: error instanceof Error ? error.message : 'Event emission failed'
      };
    }
  }

  /**
   * 📊 PATRÓN: Agent Metrics Update Pattern
   * Actualizar métricas de rendimiento de agentes
   */
  private async updateAgentMetrics(event: AgentSwitchedEvent): Promise<SideEffect> {
    try {
      // Actualizar métricas del agente anterior
      if (event.fromAgentId && event.fromAgentType) {
        await this.updateAgentSessionMetrics(event.fromAgentId.toString(), event.fromAgentType.getValue(), false);
      }

      // Actualizar métricas del nuevo agente
      if (event.toAgentId && event.toAgentType) {
        await this.updateAgentSessionMetrics(event.toAgentId.toString(), event.toAgentType.getValue(), true);
      }

      // Actualizar métricas globales de cambios de agente
      const globalMetricsKey = this.getStorageKey('agent-switch-metrics');
      const globalMetrics = this.getBrowserStorage(globalMetricsKey) as Record<string, unknown> || {
        totalSwitches: 0,
        switchesByType: {},
        switchesByReason: {},
        lastSwitch: null
      };

      (globalMetrics.totalSwitches as number)++;
      
      const switchType = `${event.fromAgentType?.getValue() || 'none'}_to_${event.toAgentType.getValue()}`;
      (globalMetrics.switchesByType as Record<string, number>)[switchType] = ((globalMetrics.switchesByType as Record<string, number>)[switchType] || 0) + 1;
      (globalMetrics.switchesByReason as Record<string, number>)[event.reason] = ((globalMetrics.switchesByReason as Record<string, number>)[event.reason] || 0) + 1;
      globalMetrics.lastSwitch = event.switchedAt;

      this.setBrowserStorage(globalMetricsKey, globalMetrics);

      return {
        type: 'STORAGE_UPDATE',
        description: 'Agent metrics updated',
        success: true,
        data: globalMetrics
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update agent metrics',
        success: false,
        error: error instanceof Error ? error.message : 'Metrics update failed'
      };
    }
  }

  /**
   * 📊 PATRÓN: Individual Agent Metrics Pattern
   * Actualizar métricas de un agente específico
   */
  private async updateAgentSessionMetrics(agentId: string, agentType: string, isNewSession: boolean): Promise<void> {
    const metricsKey = this.getStorageKey('agent-metrics', agentId);
    const metrics = this.getBrowserStorage(metricsKey) as Record<string, unknown> || {
      agentId,
      agentType,
      totalSessions: 0,
      activeSessions: 0,
      successfulTransfers: 0,
      lastActivity: null
    };

    if (isNewSession) {
      (metrics.totalSessions as number)++;
      (metrics.activeSessions as number)++;
    } else {
      metrics.activeSessions = Math.max(0, (metrics.activeSessions as number) - 1);
      (metrics.successfulTransfers as number)++;
    }

    metrics.lastActivity = new Date().toISOString();

    this.setBrowserStorage(metricsKey, metrics);
  }

  /**
   * 🔄 PATRÓN: Agent Transition Processing Pattern
   * Procesar transición específica entre tipos de agente
   */
  private async processAgentTransition(event: AgentSwitchedEvent): Promise<SideEffect | null> {
    const transitionKey = `${event.fromAgentType}_to_${event.toAgentType}`;

    switch (transitionKey.toLowerCase()) {
      case 'sales_to_payment':
        return this.processSalesToPaymentTransition(event);
      
      case 'payment_to_sales':
        return this.processPaymentToSalesTransition(event);
      
      default:
        return null;
    }
  }

  /**
   * 💳 PATRÓN: Sales to Payment Transition Pattern
   * Procesar transición de ventas a pago
   */
  private processSalesToPaymentTransition(event: AgentSwitchedEvent): SideEffect {
    try {
      // Preparar datos para el agente de pago
      const paymentContextKey = this.getStorageKey('payment-context', event.sessionId);
      const paymentContext = {
        sessionId: event.sessionId,
        transitionReason: event.reason,
        cartReady: true,
        customerInfo: event.context?.metadata?.customerInfo,
        orderSummary: event.context?.metadata?.orderSummary,
        preparedAt: event.switchedAt
      };

      this.setBrowserStorage(paymentContextKey, paymentContext);

      // Emitir evento específico para UI de pago
      this.emitBrowserEvent('realtime-payment-mode-activated', {
        sessionId: event.sessionId,
        context: paymentContext
      });

      return {
        type: 'BROWSER_EVENT',
        description: 'Sales to payment transition processed',
        success: true,
        data: paymentContext
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process sales to payment transition',
        success: false,
        error: error instanceof Error ? error.message : 'Transition failed'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Payment to Sales Transition Pattern
   * Procesar transición de pago a ventas
   */
  private processPaymentToSalesTransition(event: AgentSwitchedEvent): SideEffect {
    try {
      // Limpiar contexto de pago
      const paymentContextKey = this.getStorageKey('payment-context', event.sessionId);
      this.setBrowserStorage(paymentContextKey, null);

      // Preparar contexto para ventas
      const salesContextKey = this.getStorageKey('sales-context', event.sessionId);
      const salesContext = {
        sessionId: event.sessionId,
        transitionReason: event.reason,
        returnFromPayment: true,
        previousPaymentAttempt: event.context?.metadata?.paymentAttempt,
        preparedAt: event.switchedAt
      };

      this.setBrowserStorage(salesContextKey, salesContext);

      // Emitir evento específico para UI de ventas
      this.emitBrowserEvent('realtime-sales-mode-activated', {
        sessionId: event.sessionId,
        context: salesContext
      });

      return {
        type: 'BROWSER_EVENT',
        description: 'Payment to sales transition processed',
        success: true,
        data: salesContext
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process payment to sales transition',
        success: false,
        error: error instanceof Error ? error.message : 'Transition failed'
      };
    }
  }

  /**
   * 🛠️ PATRÓN: Agent Tools Configuration Pattern
   * Configurar herramientas específicas del nuevo agente
   */
  private async configureAgentTools(event: AgentSwitchedEvent): Promise<SideEffect> {
    try {
      const toolsConfig = this.generateToolsConfiguration(event.toAgentType.getValue());
      const toolsKey = this.getStorageKey('agent-tools', event.sessionId);
      
      this.setBrowserStorage(toolsKey, toolsConfig);

      // Emitir evento de configuración de herramientas
      this.emitBrowserEvent('realtime-agent-tools-configured', {
        sessionId: event.sessionId,
        agentType: event.toAgentType,
        tools: toolsConfig.availableTools
      });

      return {
        type: 'STORAGE_UPDATE',
        description: `Tools configured for ${event.toAgentType} agent`,
        success: true,
        data: toolsConfig
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to configure agent tools',
        success: false,
        error: error instanceof Error ? error.message : 'Tools configuration failed'
      };
    }
  }

  /**
   * 🛠️ PATRÓN: Tools Configuration Generation Pattern
   * Generar configuración de herramientas por tipo de agente
   */
  private generateToolsConfiguration(agentType: string): AgentToolsConfig {
    const baseConfig = {
      agentType,
      configuredAt: new Date().toISOString()
    };

    switch (agentType.toLowerCase()) {
      case 'sales':
        return {
          ...baseConfig,
          availableTools: [
            'focus_menu_item',
            'add_to_cart',
            'get_menu_info',
            'transfer_to_payment'
          ],
          toolPermissions: {
            canModifyCart: true,
            canAccessMenu: true,
            canTransferToPayment: true,
            canProcessPayment: false
          }
        };

      case 'payment':
        return {
          ...baseConfig,
          availableTools: [
            'process_payment',
            'generate_receipt',
            'update_order',
            'transfer_to_sales'
          ],
          toolPermissions: {
            canModifyCart: false,
            canAccessMenu: false,
            canTransferToPayment: false,
            canProcessPayment: true
          }
        };

      default:
        return {
          ...baseConfig,
          availableTools: [],
          toolPermissions: {}
        };
    }
  }

  /**
   * 💬 PATRÓN: Conversation Context Update Pattern
   * Actualizar contexto de conversación para el nuevo agente
   */
  private async updateConversationContext(event: AgentSwitchedEvent): Promise<SideEffect> {
    try {
      const contextKey = this.getStorageKey('conversation-context', event.sessionId);
      const context = this.getBrowserStorage(contextKey) as Record<string, unknown> || {
        sessionId: event.sessionId,
        messages: [],
        currentTopic: null
      };

      // Agregar mensaje de transición
      const transitionMessage = {
        id: `transition-${Date.now()}`,
        type: 'AGENT_TRANSITION',
        fromAgent: event.fromAgentType,
        toAgent: event.toAgentType,
        reason: event.reason,
        timestamp: event.switchedAt,
        message: this.generateTransitionMessage(event)
      };

      (context.messages as Array<Record<string, unknown>>).push(transitionMessage);
      context.currentAgent = event.toAgentType;
      context.lastTransition = event.switchedAt;

      this.setBrowserStorage(contextKey, context);

      return {
        type: 'STORAGE_UPDATE',
        description: 'Conversation context updated with agent transition',
        success: true,
        data: { transitionMessage }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update conversation context',
        success: false,
        error: error instanceof Error ? error.message : 'Context update failed'
      };
    }
  }

  /**
   * 💬 PATRÓN: Transition Message Generation Pattern
   * Generar mensaje de transición apropiado
   */
  private generateTransitionMessage(event: AgentSwitchedEvent): string {
    const fromAgentName = this.getAgentName(event.fromAgentType?.getValue() || '');
    const toAgentName = this.getAgentName(event.toAgentType.getValue());

    switch (event.getTransitionType()?.toLowerCase()) {
      case 'checkout':
        return `${fromAgentName} is transferring you to ${toAgentName} to complete your order. ${toAgentName} will help you with payment and delivery details.`;
      
      case 'modify_order':
        return `${fromAgentName} is transferring you back to ${toAgentName} to modify your order. ${toAgentName} can help you add or remove items.`;
      
      case 'support':
        return `${fromAgentName} is connecting you with ${toAgentName} for specialized assistance.`;
      
      default:
        return `You're now speaking with ${toAgentName}. They'll be happy to assist you!`;
    }
  }

  /**
   * 🏷️ PATRÓN: Agent Name Resolution Pattern
   * Obtener nombre amigable del agente
   */
  private getAgentName(agentType: string): string {
    switch (agentType?.toLowerCase()) {
      case 'sales':
        return 'Luxora';
      case 'payment':
        return 'Karol';
      default:
        return 'Assistant';
    }
  }
}

/**
 * 📊 PATRÓN: Configuration Interfaces
 * Interfaces para configuración de agentes
 */
export interface AgentUIConfig {
  timestamp: string;
  agentType: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  layout: {
    showCarousel: boolean;
    showMenuCategories: boolean;
    showRecommendations: boolean;
    showCart: boolean;
    showPaymentForm?: boolean;
    showOrderSummary?: boolean;
  };
  features: {
    voiceEnabled: boolean;
    menuFocus: boolean;
    itemRecommendations: boolean;
    nutritionInfo: boolean;
    paymentProcessing?: boolean;
    addressCollection?: boolean;
  };
  personality: {
    greeting: string;
    tone: string;
    enthusiasm: string;
  };
}

export interface AgentToolsConfig {
  agentType: string;
  configuredAt: string;
  availableTools: string[];
  toolPermissions: Record<string, boolean>;
}
