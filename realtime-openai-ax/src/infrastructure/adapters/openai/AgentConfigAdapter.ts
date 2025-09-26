/**
 * 🏗️ PATRÓN: Adapter Pattern + Configuration Management
 * 🎯 PRINCIPIO: Agent Configuration + Dynamic Tool Loading
 * 
 * AgentConfigAdapter - Adaptador para configuración de agentes
 * Maneja la configuración dinámica de agentes Sales y Payment
 */

import { AgentType } from '../../../domain/valueObjects/AgentType';
import { AgentId } from '../../../domain/valueObjects/AgentId';
import { CustomerId } from '../../../domain/valueObjects/CustomerId';

/**
 * 🎯 PATRÓN: Configuration Adapter Pattern
 * AgentConfigAdapter gestiona configuraciones específicas por agente
 */
export class AgentConfigAdapter {
  private configCache: Map<string, AgentConfig> = new Map();
  private toolsRegistry: Map<string, AgentTool[]> = new Map();

  /**
   * 🔧 PATRÓN: Factory Pattern
   * Constructor con configuración inicial
   */
  constructor() {
    this.initializeDefaultConfigurations();
    this.registerAgentTools();
  }

  /**
   * 🤖 PATRÓN: Agent Configuration Pattern
   * Obtener configuración completa de agente
   */
  public async getAgentConfiguration(
    agentType: AgentType,
    agentId?: AgentId,
    customerId?: CustomerId
  ): Promise<AgentConfigurationResult> {
    try {
      const cacheKey = this.buildCacheKey(agentType, agentId, customerId);
      
      // Verificar cache primero
      if (this.configCache.has(cacheKey)) {
        return {
          success: true,
          configuration: this.configCache.get(cacheKey)!
        };
      }

      // Generar nueva configuración
      const config = await this.buildAgentConfiguration(agentType, agentId, customerId);
      
      // Guardar en cache
      this.configCache.set(cacheKey, config);

      return {
        success: true,
        configuration: config
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent configuration'
      };
    }
  }

  /**
   * 🛠️ PATRÓN: Tools Registry Pattern
   * Obtener herramientas específicas de agente
   */
  public getAgentTools(agentType: AgentType): AgentTool[] {
    const tools = this.toolsRegistry.get(agentType.getValue()) || [];
    return [...tools]; // Retornar copia para inmutabilidad
  }

  /**
   * 🔄 PATRÓN: Dynamic Configuration Pattern
   * Actualizar configuración de agente en tiempo real
   */
  public async updateAgentConfiguration(
    agentType: AgentType,
    updates: Partial<AgentConfig>,
    agentId?: AgentId
  ): Promise<ConfigUpdateResult> {
    try {
      const cacheKey = this.buildCacheKey(agentType, agentId);
      const existingConfig = this.configCache.get(cacheKey);

      if (!existingConfig) {
        return {
          success: false,
          error: 'Agent configuration not found'
        };
      }

      // Merge updates con configuración existente
      const updatedConfig: AgentConfig = {
        ...existingConfig,
        ...updates,
        updatedAt: new Date(),
        version: existingConfig.version + 1
      };

      // Validar configuración actualizada
      const validation = this.validateConfiguration(updatedConfig);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Actualizar cache
      this.configCache.set(cacheKey, updatedConfig);

      return {
        success: true,
        configuration: updatedConfig,
        previousVersion: existingConfig.version
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent configuration'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Personalization Pattern
   * Personalizar configuración basada en customer
   */
  public async personalizeForCustomer(
    agentType: AgentType,
    customerId: CustomerId,
    customerData: CustomerPersonalizationData
  ): Promise<PersonalizationResult> {
    try {
      const baseConfig = await this.getAgentConfiguration(agentType);
      
      if (!baseConfig.success) {
        return {
          success: false,
          error: baseConfig.error
        };
      }

      const personalizedConfig = this.applyPersonalization(
        baseConfig.configuration!,
        customerData
      );

      // Guardar configuración personalizada
      const personalizedKey = this.buildCacheKey(agentType, undefined, customerId);
      this.configCache.set(personalizedKey, personalizedConfig);

      return {
        success: true,
        configuration: personalizedConfig,
        personalizationApplied: this.getAppliedPersonalizations(customerData)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to personalize configuration'
      };
    }
  }

  /**
   * 📊 PATRÓN: Metrics Collection Pattern
   * Obtener métricas de configuración de agente
   */
  public getConfigurationMetrics(agentType: AgentType): ConfigurationMetrics {
    const tools = this.getAgentTools(agentType);
    const configs = Array.from(this.configCache.values())
      .filter(config => config.agentType === agentType.getValue());

    return {
      agentType: agentType.getValue(),
      totalConfigurations: configs.length,
      averageResponseTime: this.calculateAverageResponseTime(configs),
      toolsCount: tools.length,
      activeTools: tools.filter(tool => tool.isActive).length,
      lastConfigUpdate: this.getLastConfigUpdate(configs),
      configurationVersions: configs.map(c => c.version),
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  /**
   * 🧹 PATRÓN: Cache Management Pattern
   * Limpiar cache de configuraciones
   */
  public clearConfigurationCache(agentType?: AgentType): CacheClearResult {
    const initialSize = this.configCache.size;

    if (agentType) {
      // Limpiar solo configuraciones de un tipo específico
      const keysToDelete: string[] = [];
      for (const [key, config] of this.configCache.entries()) {
        if (config.agentType === agentType.getValue()) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.configCache.delete(key));
    } else {
      // Limpiar todo el cache
      this.configCache.clear();
    }

    const finalSize = this.configCache.size;
    const clearedCount = initialSize - finalSize;

    return {
      success: true,
      clearedConfigurations: clearedCount,
      remainingConfigurations: finalSize
    };
  }

  /**
   * 🏗️ PATRÓN: Configuration Builder Pattern
   * Construir configuración específica de agente
   */
  private async buildAgentConfiguration(
    agentType: AgentType,
    agentId?: AgentId,
    customerId?: CustomerId
  ): Promise<AgentConfig> {
    const baseConfig = this.getBaseConfiguration(agentType);
    const tools = this.getAgentTools(agentType);
    
    return {
      ...baseConfig,
      agentId: agentId?.toString(),
      customerId: customerId?.toString(),
      tools: tools,
      capabilities: this.buildCapabilities(agentType, tools),
      personality: this.buildPersonality(agentType),
      constraints: this.buildConstraints(agentType),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };
  }

  /**
   * 🎭 PATRÓN: Base Configuration Pattern
   * Configuración base por tipo de agente
   */
  private getBaseConfiguration(agentType: AgentType): BaseAgentConfig {
    switch (agentType.getValue()) {
      case 'SALES':
        return {
          agentType: 'SALES',
          name: 'Luxora',
          description: 'Friendly sales assistant specialized in menu recommendations',
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'nova',
          temperature: 0.9,
          maxTokens: 4096,
          responseStyle: 'enthusiastic',
          primaryGoal: 'maximize_sales',
          secondaryGoals: ['customer_satisfaction', 'upselling'],
          communicationStyle: 'friendly_persuasive'
        };

      case 'PAYMENT':
        return {
          agentType: 'PAYMENT',
          name: 'Karol',
          description: 'Professional payment specialist for secure transactions',
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'shimmer',
          temperature: 0.6,
          maxTokens: 2048,
          responseStyle: 'professional',
          primaryGoal: 'secure_payment',
          secondaryGoals: ['data_accuracy', 'customer_trust'],
          communicationStyle: 'professional_reassuring'
        };

      default:
        return {
          agentType: 'GENERAL',
          name: 'Assistant',
          description: 'General purpose assistant',
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy',
          temperature: 0.7,
          maxTokens: 2048,
          responseStyle: 'neutral',
          primaryGoal: 'help_customer',
          secondaryGoals: ['provide_information'],
          communicationStyle: 'helpful_neutral'
        };
    }
  }

  /**
   * 🛠️ PATRÓN: Capabilities Builder Pattern
   * Construir capacidades específicas del agente
   */
  private buildCapabilities(agentType: AgentType, tools: AgentTool[]): AgentCapabilities {
    const baseCapabilities: AgentCapabilities = {
      canProcessVoice: true,
      canGenerateText: true,
      canAccessMemory: true,
      canLearnFromInteractions: false,
      maxConcurrentSessions: 1,
      supportedLanguages: ['en', 'es'],
      responseTimeTarget: 2000, // ms
      confidenceThreshold: 0.8
    };

    switch (agentType.getValue()) {
      case 'SALES':
        return {
          ...baseCapabilities,
          canControlUI: true,
          canAccessInventory: true,
          canCalculatePricing: true,
          canMakeRecommendations: true,
          canTransferToOtherAgents: true,
          specializedIn: ['menu_navigation', 'product_recommendations', 'upselling'],
          maxConcurrentSessions: 5,
          responseTimeTarget: 1500
        };

      case 'PAYMENT':
        return {
          ...baseCapabilities,
          canProcessPayments: true,
          canValidateData: true,
          canAccessCustomerData: true,
          canUpdateOrderData: true,
          canTransferToOtherAgents: true,
          specializedIn: ['payment_processing', 'data_validation', 'order_completion'],
          maxConcurrentSessions: 3,
          responseTimeTarget: 1000,
          confidenceThreshold: 0.95 // Mayor precisión para pagos
        };

      default:
        return baseCapabilities;
    }
  }

  /**
   * 🎭 PATRÓN: Personality Builder Pattern
   * Construir personalidad del agente
   */
  private buildPersonality(agentType: AgentType): AgentPersonality {
    switch (agentType.getValue()) {
      case 'SALES':
        return {
          traits: ['enthusiastic', 'helpful', 'persuasive', 'knowledgeable'],
          communicationStyle: 'friendly_energetic',
          emotionalTone: 'positive_upbeat',
          responsePatterns: {
            greeting: 'warm_welcoming',
            recommendation: 'confident_enthusiastic',
            objectionHandling: 'understanding_persistent',
            closing: 'encouraging_supportive'
          },
          adaptability: 'high',
          empathyLevel: 'high',
          assertivenessLevel: 'medium_high'
        };

      case 'PAYMENT':
        return {
          traits: ['professional', 'trustworthy', 'detail_oriented', 'security_conscious'],
          communicationStyle: 'professional_reassuring',
          emotionalTone: 'calm_confident',
          responsePatterns: {
            greeting: 'professional_welcoming',
            dataCollection: 'methodical_thorough',
            validation: 'careful_precise',
            completion: 'confirming_appreciative'
          },
          adaptability: 'medium',
          empathyLevel: 'medium',
          assertivenessLevel: 'medium'
        };

      default:
        return {
          traits: ['helpful', 'neutral', 'informative'],
          communicationStyle: 'balanced_neutral',
          emotionalTone: 'neutral_supportive',
          responsePatterns: {
            greeting: 'polite_standard',
            information: 'clear_concise',
            assistance: 'helpful_direct'
          },
          adaptability: 'medium',
          empathyLevel: 'medium',
          assertivenessLevel: 'medium'
        };
    }
  }

  /**
   * 🚧 PATRÓN: Constraints Builder Pattern
   * Construir restricciones del agente
   */
  private buildConstraints(agentType: AgentType): AgentConstraints {
    const baseConstraints: AgentConstraints = {
      maxResponseLength: 500,
      prohibitedTopics: ['politics', 'religion', 'personal_medical_advice'],
      requiredDisclosures: ['ai_assistant'],
      dataRetentionPolicy: '24_hours',
      privacyLevel: 'standard'
    };

    switch (agentType.getValue()) {
      case 'SALES':
        return {
          ...baseConstraints,
          maxResponseLength: 300,
          canAccessPricing: true,
          canModifyOrders: true,
          canOfferDiscounts: false, // Requiere aprobación
          mustTransferFor: ['payment_processing', 'refunds', 'complaints'],
          responseTimeLimit: 3000,
          confidenceRequirement: 0.7
        };

      case 'PAYMENT':
        return {
          ...baseConstraints,
          maxResponseLength: 200,
          canAccessPaymentData: true,
          canProcessRefunds: false, // Requiere escalación
          mustValidateAll: ['customer_data', 'payment_info', 'delivery_address'],
          mustTransferFor: ['order_modifications', 'menu_questions'],
          responseTimeLimit: 2000,
          confidenceRequirement: 0.9,
          privacyLevel: 'high',
          dataRetentionPolicy: '1_hour' // Datos sensibles
        };

      default:
        return baseConstraints;
    }
  }

  /**
   * 🎯 PATRÓN: Personalization Application Pattern
   * Aplicar personalización basada en datos del customer
   */
  private applyPersonalization(
    baseConfig: AgentConfig,
    customerData: CustomerPersonalizationData
  ): AgentConfig {
    const personalizedConfig = { ...baseConfig };

    // Personalizar basado en historial de pedidos
    if (customerData.orderHistory && customerData.orderHistory.length > 0) {
      personalizedConfig.personality = {
        ...personalizedConfig.personality,
        traits: [...personalizedConfig.personality.traits, 'familiar', 'remembering']
      };
    }

    // Personalizar basado en preferencias
    if (customerData.preferences) {
      if (customerData.preferences.communicationStyle) {
        personalizedConfig.personality.communicationStyle = customerData.preferences.communicationStyle;
      }
      
      if (customerData.preferences.responseSpeed) {
        personalizedConfig.capabilities.responseTimeTarget = 
          customerData.preferences.responseSpeed === 'fast' ? 1000 : 2500;
      }
    }

    // Personalizar basado en demografía
    if (customerData.demographics) {
      if (customerData.demographics.preferredLanguage) {
        personalizedConfig.capabilities.supportedLanguages = [customerData.demographics.preferredLanguage];
      }
    }

    return personalizedConfig;
  }

  /**
   * 📊 PATRÓN: Personalization Tracking Pattern
   * Obtener personalizaciones aplicadas
   */
  private getAppliedPersonalizations(customerData: CustomerPersonalizationData): string[] {
    const applied: string[] = [];

    if (customerData.orderHistory?.length) {
      applied.push('order_history_integration');
    }
    
    if (customerData.preferences?.communicationStyle) {
      applied.push('communication_style_adaptation');
    }
    
    if (customerData.preferences?.responseSpeed) {
      applied.push('response_speed_optimization');
    }
    
    if (customerData.demographics?.preferredLanguage) {
      applied.push('language_localization');
    }

    return applied;
  }

  /**
   * 🔧 PATRÓN: Initialization Pattern
   * Inicializar configuraciones por defecto
   */
  private initializeDefaultConfigurations(): void {
    // Las configuraciones se generan dinámicamente cuando se solicitan
    // Este método puede ser usado para pre-cargar configuraciones frecuentes
  }

  /**
   * 🛠️ PATRÓN: Tools Registration Pattern
   * Registrar herramientas por tipo de agente
   */
  private registerAgentTools(): void {
    // Sales Agent Tools
    this.toolsRegistry.set('SALES', [
      {
        name: 'focus_menu_item',
        description: 'Focus on a specific menu item in the 3D carousel',
        category: 'ui_control',
        isActive: true,
        permissions: ['read_menu', 'control_ui'],
        responseTimeMs: 500,
        confidenceRequired: 0.8
      },
      {
        name: 'order',
        description: 'Add or modify items in the customer cart',
        category: 'order_management',
        isActive: true,
        permissions: ['modify_cart', 'read_pricing'],
        responseTimeMs: 300,
        confidenceRequired: 0.9
      },
      {
        name: 'transfer_to_payment_agent',
        description: 'Transfer customer to payment specialist',
        category: 'agent_transfer',
        isActive: true,
        permissions: ['agent_transfer'],
        responseTimeMs: 200,
        confidenceRequired: 0.95
      }
    ]);

    // Payment Agent Tools
    this.toolsRegistry.set('PAYMENT', [
      {
        name: 'update_order_data',
        description: 'Update customer and delivery information',
        category: 'data_management',
        isActive: true,
        permissions: ['modify_customer_data', 'update_delivery_info'],
        responseTimeMs: 400,
        confidenceRequired: 0.95
      },
      {
        name: 'transfer_to_sales_agent',
        description: 'Transfer back to sales agent for order modifications',
        category: 'agent_transfer',
        isActive: true,
        permissions: ['agent_transfer'],
        responseTimeMs: 200,
        confidenceRequired: 0.9
      }
    ]);
  }

  /**
   * 🔑 PATRÓN: Cache Key Generation Pattern
   * Generar clave de cache
   */
  private buildCacheKey(agentType: AgentType, agentId?: AgentId, customerId?: CustomerId): string {
    const parts = [agentType.getValue()];
    
    if (agentId) parts.push(agentId.toString());
    if (customerId) parts.push(customerId.toString());
    
    return parts.join(':');
  }

  /**
   * ✅ PATRÓN: Configuration Validation Pattern
   * Validar configuración de agente
   */
  private validateConfiguration(config: AgentConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.agentType) errors.push('Agent type is required');
    if (!config.name) errors.push('Agent name is required');
    if (!config.model) errors.push('Model is required');
    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }
    if (config.maxTokens < 1 || config.maxTokens > 8192) {
      errors.push('Max tokens must be between 1 and 8192');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Metrics Calculation Pattern
   * Calcular métricas de configuración
   */
  private calculateAverageResponseTime(configs: AgentConfig[]): number {
    if (configs.length === 0) return 0;
    
    const totalTime = configs.reduce((sum, config) => 
      sum + (config.capabilities.responseTimeTarget || 2000), 0
    );
    
    return totalTime / configs.length;
  }

  private getLastConfigUpdate(configs: AgentConfig[]): Date | null {
    if (configs.length === 0) return null;
    
    return configs.reduce((latest, config) => 
      config.updatedAt > latest ? config.updatedAt : latest, 
      configs[0].updatedAt
    );
  }

  private calculateMemoryUsage(): number {
    // Estimación simple del uso de memoria
    return this.configCache.size * 1024; // bytes aproximados por configuración
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para configuración de agentes
 */
export interface AgentConfig extends BaseAgentConfig {
  agentId?: string;
  customerId?: string;
  tools: AgentTool[];
  capabilities: AgentCapabilities;
  personality: AgentPersonality;
  constraints: AgentConstraints;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface BaseAgentConfig {
  agentType: string;
  name: string;
  description: string;
  model: string;
  voice: string;
  temperature: number;
  maxTokens: number;
  responseStyle: string;
  primaryGoal: string;
  secondaryGoals: string[];
  communicationStyle: string;
}

export interface AgentTool {
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  permissions: string[];
  responseTimeMs: number;
  confidenceRequired: number;
}

export interface AgentCapabilities {
  canProcessVoice: boolean;
  canGenerateText: boolean;
  canAccessMemory: boolean;
  canLearnFromInteractions: boolean;
  maxConcurrentSessions: number;
  supportedLanguages: string[];
  responseTimeTarget: number;
  confidenceThreshold: number;
  canControlUI?: boolean;
  canAccessInventory?: boolean;
  canCalculatePricing?: boolean;
  canMakeRecommendations?: boolean;
  canTransferToOtherAgents?: boolean;
  canProcessPayments?: boolean;
  canValidateData?: boolean;
  canAccessCustomerData?: boolean;
  canUpdateOrderData?: boolean;
  specializedIn?: string[];
}

export interface AgentPersonality {
  traits: string[];
  communicationStyle: string;
  emotionalTone: string;
  responsePatterns: Record<string, string>;
  adaptability: 'low' | 'medium' | 'high';
  empathyLevel: 'low' | 'medium' | 'high';
  assertivenessLevel: 'low' | 'medium' | 'medium_high' | 'high';
}

export interface AgentConstraints {
  maxResponseLength: number;
  prohibitedTopics: string[];
  requiredDisclosures: string[];
  dataRetentionPolicy: string;
  privacyLevel: 'standard' | 'high' | 'maximum';
  canAccessPricing?: boolean;
  canModifyOrders?: boolean;
  canOfferDiscounts?: boolean;
  canAccessPaymentData?: boolean;
  canProcessRefunds?: boolean;
  mustTransferFor?: string[];
  mustValidateAll?: string[];
  responseTimeLimit?: number;
  confidenceRequirement?: number;
}

export interface CustomerPersonalizationData {
  orderHistory?: Array<{
    orderId: string;
    items: string[];
    total: number;
    date: Date;
  }>;
  preferences?: {
    communicationStyle?: string;
    responseSpeed?: 'fast' | 'normal' | 'detailed';
    preferredAgent?: string;
  };
  demographics?: {
    preferredLanguage?: string;
    timeZone?: string;
    region?: string;
  };
}

export interface AgentConfigurationResult {
  success: boolean;
  configuration?: AgentConfig;
  error?: string;
}

export interface ConfigUpdateResult {
  success: boolean;
  configuration?: AgentConfig;
  previousVersion?: number;
  error?: string;
}

export interface PersonalizationResult {
  success: boolean;
  configuration?: AgentConfig;
  personalizationApplied?: string[];
  error?: string;
}

export interface ConfigurationMetrics {
  agentType: string;
  totalConfigurations: number;
  averageResponseTime: number;
  toolsCount: number;
  activeTools: number;
  lastConfigUpdate: Date | null;
  configurationVersions: number[];
  memoryUsage: number;
}

export interface CacheClearResult {
  success: boolean;
  clearedConfigurations: number;
  remainingConfigurations: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
