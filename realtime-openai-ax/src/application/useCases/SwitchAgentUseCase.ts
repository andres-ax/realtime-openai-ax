/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + Agent Management + Real-time Transitions
 * 
 * SwitchAgentUseCase - Caso de uso para cambios de agente
 * Maneja transiciones inteligentes entre agentes con contexto completo
 */

import { Agent } from '../../domain/entities/Agent';
import { Customer } from '../../domain/entities/Customer';
import { Cart } from '../../domain/entities/Cart';
import { Order } from '../../domain/entities/Order';
import { AgentService } from '../../domain/services/AgentService';
import { ValidationService } from '../../domain/services/ValidationService';
import { AgentType } from '../../domain/valueObjects/AgentType';
import { AgentId } from '../../domain/valueObjects/AgentId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { CartId } from '../../domain/valueObjects/CartId';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { AgentSwitchedEvent } from '../../domain/events/AgentSwitchedEvent';
import { ValidationResult } from '../../domain/services/ValidationService';

/**
 * 🎯 PATRÓN: Use Case Pattern
 * SwitchAgentUseCase encapsula la lógica de aplicación para cambios de agente
 */
export class SwitchAgentUseCase {
  
  /**
   * 🔧 PATRÓN: Dependency Injection Pattern
   * Constructor con dependencias inyectadas
   */
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly cartRepository: CartRepository,
    private readonly orderRepository: OrderRepository,
    private readonly sessionRepository: SessionRepository
  ) {}

  /**
   * 🔄 PATRÓN: Command Handler Pattern
   * Cambiar a agente específico por tipo
   */
  public async switchToAgentType(command: SwitchToAgentTypeCommand): Promise<SwitchAgentResult> {
    try {
      // 1. Validar entrada
      const inputValidation = this.validateSwitchInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          error: inputValidation.error!
        };
      }

      // 2. Cargar contexto actual
      const context = await this.loadSessionContext(command.sessionId);
      if (!context.success) {
        return {
          success: false,
          error: context.error!
        };
      }

      // 3. Obtener agente actual
      const currentAgent = context.currentAgent;

      // 4. Crear tipo de agente destino
      const targetAgentType = AgentType.fromString(command.targetAgentType);

      // 5. Validar si el cambio es necesario
      if (currentAgent && currentAgent.getType().equals(targetAgentType)) {
        return {
          success: true,
          message: 'Already using requested agent type',
          currentAgent,
          switchEvent: undefined,
          uiConfiguration: {} // UI configuration placeholder
        };
      }

      // 6. Preparar contexto de transición
      const transitionContext = this.buildTransitionContext(context, command);

      // 7. Ejecutar cambio de agente usando Domain Service
      const switchResult = AgentService.switchAgent(
        command.sessionId,
        currentAgent,
        targetAgentType,
        command.reason || 'User requested agent switch',
        transitionContext
      );

      if (!switchResult.success) {
        return {
          success: false,
          error: switchResult.error!
        };
      }

      // 8. Validar configuración del nuevo agente
      const agentValidation = ValidationService.validateAgentConfiguration(switchResult.toAgent!);
      if (!agentValidation.canProceed) {
        return {
          success: false,
          error: 'New agent configuration is invalid',
          validationErrors: agentValidation.errors.map(e => e.message)
        };
      }

      // 9. Persistir nuevo agente si es necesario
      if (switchResult.toAgent && !await this.agentRepository.exists(switchResult.toAgent.id)) {
        await this.agentRepository.save(switchResult.toAgent);
      }

      // 10. Actualizar sesión con nuevo agente
      await this.sessionRepository.updateCurrentAgent(
        command.sessionId,
        switchResult.toAgent!.id
      );

      // 11. Registrar métricas del agente anterior
      if (currentAgent && command.sessionDuration) {
        currentAgent.recordSession(command.sessionDuration, true);
        await this.agentRepository.save(currentAgent);
      }

      return {
        success: true,
        message: `Successfully switched to ${targetAgentType.getDisplayName()}`,
        previousAgent: currentAgent,
        currentAgent: switchResult.toAgent!,
        switchEvent: switchResult.switchEvent!,
        transitionType: switchResult.transitionType!,
        uiConfiguration: switchResult.uiConfiguration as AgentUIConfiguration,
        validationWarnings: agentValidation.warnings.map(w => w.message)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch agent'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Smart Agent Selection Pattern
   * Seleccionar mejor agente automáticamente basado en contexto
   */
  public async selectBestAgent(command: SelectBestAgentCommand): Promise<SwitchAgentResult> {
    try {
      // 1. Cargar contexto de sesión
      const context = await this.loadSessionContext(command.sessionId);
      if (!context.success) {
        return {
          success: false,
          error: context.error!
        };
      }

      // 2. Preparar contexto de selección
      const selectionContext = {
        customer: context.customer,
        cart: context.cart,
        order: context.order,
        hasIssues: command.hasIssues || false,
        preferredAgentType: command.preferredAgentType ? 
          AgentType.fromString(command.preferredAgentType) : undefined
      };

      // 3. Obtener recomendación de agente
      const recommendation = AgentService.selectBestAgent(selectionContext);

      // 4. Ejecutar cambio al agente recomendado
      const switchCommand: SwitchToAgentTypeCommand = {
        sessionId: command.sessionId,
        targetAgentType: recommendation.agentType.getValue(),
        reason: `Auto-selected: ${recommendation.reason}`,
        sessionDuration: command.sessionDuration
      };

      const result = await this.switchToAgentType(switchCommand);

      if (result.success) {
        result.recommendation = {
          confidence: recommendation.confidence,
          reason: recommendation.reason,
          wasAutoSelected: true
        };
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select best agent'
      };
    }
  }

  /**
   * 📊 PATRÓN: Query Handler Pattern
   * Obtener agente actual de la sesión
   */
  public async getCurrentAgent(command: GetCurrentAgentCommand): Promise<GetAgentResult> {
    try {
      // 1. Cargar contexto de sesión
      const context = await this.loadSessionContext(command.sessionId);
      if (!context.success) {
        return {
          success: false,
          error: context.error!
        };
      }

      const currentAgent = context.currentAgent;
      if (!currentAgent) {
        return {
          success: false,
          error: 'No agent currently assigned to session'
        };
      }

      // 2. Validar estado del agente
      const agentValidation = ValidationService.validateAgentConfiguration(currentAgent);

      return {
        success: true,
        agent: currentAgent,
        agentType: currentAgent.getType().getValue(),
        isActive: currentAgent.isActive(),
        capabilities: [...currentAgent.getTools()].map(tool => tool.name), // Convert to string array
        uiConfiguration: {}, // UI configuration placeholder
        validationStatus: agentValidation,
        sessionMetrics: {
          sessionCount: currentAgent.getSessionCount(),
          successRate: currentAgent.getSuccessfulTransfers() / Math.max(currentAgent.getSessionCount(), 1) * 100,
          averageSessionDuration: currentAgent.getAverageSessionDuration()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get current agent'
      };
    }
  }

  /**
   * 📊 PATRÓN: Query Handler Pattern
   * Obtener agentes disponibles para cambio
   */
  public async getAvailableAgents(command: GetAvailableAgentsCommand): Promise<GetAvailableAgentsResult> {
    try {
      // 1. Cargar contexto de sesión
      const context = await this.loadSessionContext(command.sessionId);
      if (!context.success) {
        return {
          success: false,
          error: context.error!
        };
      }

      // 2. Obtener tipos de agente disponibles
      const availableTypes = [
        AgentType.sales(),
        AgentType.payment()
      ];

      // 3. Evaluar cada tipo de agente
      const agentOptions: AgentOption[] = [];

      for (const agentType of availableTypes) {
        // Validar si la transición es posible
        const transitionContext = this.buildTransitionContext(context, {
          sessionId: command.sessionId,
          targetAgentType: agentType.getValue()
        });

        const validationResult = AgentService.validateAgentTransition(
          context.currentAgent?.getType(),
          agentType,
          transitionContext
        );

        // Crear agente temporal para obtener capacidades
        const tempAgent = AgentService.createAgentByType(agentType);

        agentOptions.push({
          agentType: agentType.getValue(),
          displayName: agentType.getDisplayName(),
          description: `${agentType.getDisplayName()} agent for specialized assistance`,
          isAvailable: validationResult.isValid,
          unavailableReason: validationResult.error,
          capabilities: [...tempAgent.getTools()].map(tool => tool.name),
          isCurrent: context.currentAgent?.getType().equals(agentType) || false
        });
      }

      return {
        success: true,
        availableAgents: agentOptions,
        currentAgentType: context.currentAgent?.getType().getValue(),
        recommendations: context.cart && !context.cart.isEmpty() ? 
          ['Consider payment agent for checkout'] : 
          ['Sales agent recommended for menu assistance']
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get available agents'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar entrada para cambio de agente
   */
  private validateSwitchInput(command: SwitchToAgentTypeCommand): InputValidationResult {
    const errors: string[] = [];

    if (!command.sessionId) errors.push('Session ID is required');
    if (!command.targetAgentType) errors.push('Target agent type is required');

    // Validar que el tipo de agente sea válido
    try {
      AgentType.fromString(command.targetAgentType);
    } catch {
      errors.push(`Invalid agent type: ${command.targetAgentType}`);
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Context Loading Pattern
   * Cargar contexto completo de la sesión
   */
  private async loadSessionContext(sessionId: string): Promise<SessionContextResult> {
    try {
      // 1. Cargar información de sesión
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // 2. Cargar agente actual
      let currentAgent: Agent | undefined;
      if (session.currentAgentId) {
        const agentResult = await this.agentRepository.findById(
          AgentId.fromString(session.currentAgentId)
        );
        currentAgent = agentResult || undefined;
      }

      // 3. Cargar customer
      let customer: Customer | undefined;
      if (session.customerId) {
        const customerResult = await this.customerRepository.findById(
          CustomerId.fromString(session.customerId)
        );
        customer = customerResult || undefined;
      }

      // 4. Cargar carrito
      let cart: Cart | undefined;
      if (session.cartId) {
        const cartResult = await this.cartRepository.findById(
          CartId.fromString(session.cartId)
        );
        cart = cartResult || undefined;
      }

      // 5. Cargar pedido actual
      let order: Order | undefined;
      if (session.currentOrderId) {
        const orderResult = await this.orderRepository.findById(
          OrderId.fromString(session.currentOrderId)
        );
        order = orderResult || undefined;
      }

      return {
        success: true,
        session,
        currentAgent,
        customer,
        cart,
        order
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load session context'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Context Builder Pattern
   * Construir contexto de transición
   */
  private buildTransitionContext(
    context: SessionContextResult,
    command: Partial<SwitchToAgentTypeCommand>
  ): AgentTransitionContext {
    return {
      customer: context.customer,
      order: context.order,
      cart: context.cart,
      sessionDuration: command.sessionDuration,
      lastInteraction: context.session?.lastInteraction,
      supportReason: command.reason?.includes('support') ? command.reason : undefined,
      metadata: {
        sessionId: context.session?.id,
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * 📊 PATRÓN: Command Pattern
 * Comandos para operaciones de agente
 */
export interface SwitchToAgentTypeCommand {
  sessionId: string;
  targetAgentType: string;
  reason?: string;
  sessionDuration?: number;
}

export interface SelectBestAgentCommand {
  sessionId: string;
  hasIssues?: boolean;
  preferredAgentType?: string;
  sessionDuration?: number;
}

export interface GetCurrentAgentCommand {
  sessionId: string;
}

export interface GetAvailableAgentsCommand {
  sessionId: string;
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultados de operaciones de agente
 */
export interface SwitchAgentResult {
  success: boolean;
  message?: string;
  previousAgent?: Agent;
  currentAgent?: Agent;
  switchEvent?: AgentSwitchedEvent;
  transitionType?: string;
  uiConfiguration?: AgentUIConfiguration;
  error?: string;
  validationErrors?: string[];
  validationWarnings?: string[];
  recommendation?: {
    confidence: number;
    reason: string;
    wasAutoSelected: boolean;
  };
}

export interface GetAgentResult {
  success: boolean;
  agent?: Agent;
  agentType?: string;
  isActive?: boolean;
  capabilities?: string[];
  uiConfiguration?: AgentUIConfiguration;
  validationStatus?: ValidationResult;
  sessionMetrics?: {
    sessionCount: number;
    successRate: number;
    averageSessionDuration: number;
  };
  error?: string;
}

export interface GetAvailableAgentsResult {
  success: boolean;
  availableAgents?: AgentOption[];
  currentAgentType?: string;
  recommendations?: string[];
  error?: string;
}

/**
 * 🤖 PATRÓN: Agent Option Pattern
 * Opción de agente disponible
 */
export interface AgentOption {
  agentType: string;
  displayName: string;
  description: string;
  isAvailable: boolean;
  unavailableReason?: string;
  capabilities: string[];
  isCurrent: boolean;
}

/**
 * 🛡️ PATRÓN: Validation Result Pattern
 * Resultado de validación de entrada
 */
interface InputValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 📊 PATRÓN: Session Context Pattern
 * Contexto completo de sesión
 */
interface SessionContextResult {
  success: boolean;
  error?: string;
  session?: SessionData;
  currentAgent?: Agent;
  customer?: Customer;
  cart?: Cart;
  order?: Order;
}

/**
 * 🏪 PATRÓN: Repository Pattern (Interfaces)
 * Interfaces de repositorios para agentes
 */
export interface AgentRepository {
  save(agent: Agent): Promise<Agent>;
  findById(id: AgentId): Promise<Agent | null>;
  exists(id: AgentId): Promise<boolean>;
  findByType(type: AgentType): Promise<Agent[]>;
}

export interface SessionRepository {
  findById(sessionId: string): Promise<SessionData | null>;
  updateCurrentAgent(sessionId: string, agentId: AgentId): Promise<void>;
}

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
}

export interface CartRepository {
  findById(id: CartId): Promise<Cart | null>;
}

export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para contexto de agentes
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

export interface AgentUIConfiguration {
  theme?: string;
  layout?: string;
  tools?: string[];
  permissions?: string[];
}

export interface SessionData {
  id: string;
  currentAgentId?: string;
  customerId?: string;
  cartId?: string;
  currentOrderId?: string;
  lastInteraction?: string;
  createdAt: Date;
  updatedAt: Date;
}
