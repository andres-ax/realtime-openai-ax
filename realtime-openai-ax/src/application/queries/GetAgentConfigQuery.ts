/**
 * 🏗️ PATRÓN: Query Pattern (CQRS)
 * 🎯 PRINCIPIO: Query Responsibility + Agent Configuration + Real-time Demo
 * 
 * GetAgentConfigQuery - Query para obtener configuración de agentes
 * Optimizada para demostración con configuraciones OpenAI Realtime
 */

import { BaseQuery, QueryValidationResult, QueryMetadata, SerializedQuery } from './BaseQuery';
// Agent imported in domain events
import { AgentType } from '../../domain/valueObjects/AgentType';

/**
 * 🎯 PATRÓN: Query Pattern
 * GetAgentConfigQuery encapsula la consulta de configuración de agentes
 */
export class GetAgentConfigQuery extends BaseQuery {
  
  /**
   * 🔧 PATRÓN: Immutable Query Pattern
   * Constructor que crea query inmutable
   */
  constructor(
    public readonly agentType?: string,
    public readonly sessionId?: string,
    public readonly includeTools: boolean = true,
    public readonly includeMetrics: boolean = false,
    public readonly includeOpenAIConfig: boolean = true,
    queryId?: string
  ) {
    super(queryId);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar query antes de ejecución
   */
  public validate(): QueryValidationResult {
    const errors: string[] = [];

    if (this.agentType && !this.isValidAgentType(this.agentType)) {
      errors.push(`Invalid agent type: ${this.agentType}. Valid types: sales, payment`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Query Metadata Pattern
   * Obtener metadatos de la query
   */
  public getMetadata(): QueryMetadata {
    return {
      queryType: 'GetAgentConfigQuery',
      queryId: this.queryId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      targetResource: this.agentType || 'agent-configs',
      isCacheable: true,
      cacheKey: this.generateCacheKey(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresRealTimeData: false,
      dataSource: 'MEMORY' // Configuraciones estáticas
    };
  }

  /**
   * 🔄 PATRÓN: Query Serialization Pattern
   * Serializar query para cache o transmisión
   */
  public serialize(): SerializedQuery {
    return {
      queryType: 'GetAgentConfigQuery',
      queryId: this.queryId,
      timestamp: this.timestamp.toISOString(),
      parameters: {
        agentType: this.agentType,
        sessionId: this.sessionId,
        includeTools: this.includeTools,
        includeMetrics: this.includeMetrics,
        includeOpenAIConfig: this.includeOpenAIConfig
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear query desde datos serializados
   */
  public static fromSerialized(data: SerializedQuery): GetAgentConfigQuery {
    if (data.queryType !== 'GetAgentConfigQuery') {
      throw new Error('Invalid query type for GetAgentConfigQuery');
    }

    const params = data.parameters as {
      agentType?: string;
      sessionId?: string;
      includeTools: boolean;
      includeMetrics: boolean;
      includeOpenAIConfig: boolean;
    };
    return new GetAgentConfigQuery(
      params.agentType,
      params.sessionId,
      params.includeTools,
      params.includeMetrics,
      params.includeOpenAIConfig,
      data.queryId
    );
  }

  /**
   * 🎯 PATRÓN: Query Builder Pattern
   * Builder para construcción fluida de queries
   */
  public static builder(): GetAgentConfigQueryBuilder {
    return new GetAgentConfigQueryBuilder();
  }

  /**
   * 📊 PATRÓN: Query Execution Pattern
   * Ejecutar query y obtener configuraciones de agentes
   */
  public async execute(): Promise<GetAgentConfigResult> {
    try {
      // 1. Validar query
      const validation = this.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage!,
          validationErrors: validation.errors
        };
      }

      // 2. Intentar obtener desde cache
      if (this.getMetadata().isCacheable) {
        const cached = this.getCachedResult();
        if (cached) {
          return {
            ...cached,
            fromCache: true,
            cacheAge: this.getAge()
          };
        }
      }

      // 3. Obtener configuraciones
      let result: GetAgentConfigResult;

      if (this.agentType) {
        result = await this.getSpecificAgentConfig();
      } else {
        result = await this.getAllAgentConfigs();
      }

      // 4. Cache del resultado
      if (result.success && this.getMetadata().isCacheable) {
        this.cacheResult(result);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  /**
   * 🤖 PATRÓN: Specific Agent Config Pattern
   * Obtener configuración de un agente específico
   */
  private async getSpecificAgentConfig(): Promise<GetAgentConfigResult> {
    const agentType = AgentType.fromString(this.agentType!);
    const config = this.createAgentConfig(agentType);

    return {
      success: true,
      agentConfig: config,
      agentConfigs: [config],
      totalCount: 1,
      queryMetadata: this.getMetadata()
    };
  }

  /**
   * 🤖 PATRÓN: All Agents Config Pattern
   * Obtener configuraciones de todos los agentes
   */
  private async getAllAgentConfigs(): Promise<GetAgentConfigResult> {
    const agentTypes = [
      AgentType.sales(),
      AgentType.payment()
    ];

    const configs = agentTypes.map(type => this.createAgentConfig(type));

    return {
      success: true,
      agentConfigs: configs,
      totalCount: configs.length,
      queryMetadata: this.getMetadata()
    };
  }

  /**
   * 🏗️ PATRÓN: Agent Config Factory Pattern
   * Crear configuración completa de agente
   */
  private createAgentConfig(agentType: AgentType): AgentConfiguration {
    const baseConfig = this.getBaseAgentConfig(agentType);
    
    return {
      ...baseConfig,
      tools: this.includeTools ? this.getAgentTools(agentType) : undefined,
      metrics: this.includeMetrics ? this.getAgentMetrics(agentType) : undefined,
      openaiConfig: this.includeOpenAIConfig ? this.getOpenAIConfig(agentType) : undefined
    };
  }

  /**
   * 🔧 PATRÓN: Base Configuration Pattern
   * Configuración base del agente
   */
  private getBaseAgentConfig(agentType: AgentType): Partial<AgentConfiguration> {
    const configs = {
      sales: {
        id: 'sales-agent-luxora',
        name: 'Luxora',
        type: 'sales',
        displayName: 'Sales Agent',
        description: 'Specialized in menu assistance and order taking',
        personality: 'Friendly, knowledgeable, and helpful',
        isActive: true,
        capabilities: ['menu_assistance', 'order_taking', 'recommendations', 'carousel_control'],
        language: 'en-US',
        voice: 'alloy'
      },
      payment: {
        id: 'payment-agent-karol',
        name: 'Karol',
        type: 'payment',
        displayName: 'Payment Agent',
        description: 'Specialized in payment processing and order completion',
        personality: 'Professional, secure, and efficient',
        isActive: true,
        capabilities: ['payment_processing', 'order_completion', 'receipt_generation'],
        language: 'en-US',
        voice: 'nova'
      }
    };

    return configs[agentType.getValue() as keyof typeof configs] || configs.sales;
  }

  /**
   * 🛠️ PATRÓN: Agent Tools Pattern
   * Herramientas disponibles para cada agente
   */
  private getAgentTools(agentType: AgentType): AgentTool[] {
    const toolSets = {
      sales: [
        {
          name: 'focus_menu_item',
          description: 'Focus on a specific menu item in the carousel',
          parameters: {
            type: 'object',
            properties: {
              item_name: { type: 'string', description: 'Name of the menu item to focus' },
              emphasize: { type: 'boolean', description: 'Whether to emphasize the item' }
            },
            required: ['item_name']
          }
        },
        {
          name: 'add_to_cart',
          description: 'Add an item to the customer cart',
          parameters: {
            type: 'object',
            properties: {
              item_name: { type: 'string', description: 'Name of the menu item' },
              quantity: { type: 'number', description: 'Quantity to add' },
              special_instructions: { type: 'string', description: 'Special preparation instructions' }
            },
            required: ['item_name', 'quantity']
          }
        },
        {
          name: 'get_menu_info',
          description: 'Get detailed information about menu items',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Menu category to filter' },
              include_nutrition: { type: 'boolean', description: 'Include nutritional information' }
            }
          }
        },
        {
          name: 'transfer_to_payment',
          description: 'Transfer customer to payment agent',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for transfer' }
            }
          }
        }
      ],
      payment: [
        {
          name: 'process_payment',
          description: 'Process customer payment',
          parameters: {
            type: 'object',
            properties: {
              payment_method: { type: 'string', enum: ['credit_card', 'debit_card', 'paypal'] },
              amount: { type: 'number', description: 'Payment amount' }
            },
            required: ['payment_method', 'amount']
          }
        },
        {
          name: 'generate_receipt',
          description: 'Generate order receipt',
          parameters: {
            type: 'object',
            properties: {
              order_id: { type: 'string', description: 'Order identifier' },
              email_receipt: { type: 'boolean', description: 'Send receipt via email' }
            },
            required: ['order_id']
          }
        },
        {
          name: 'update_order',
          description: 'Update order information',
          parameters: {
            type: 'object',
            properties: {
              order_id: { type: 'string', description: 'Order identifier' },
              delivery_address: { type: 'object', description: 'Delivery address information' },
              contact_info: { type: 'object', description: 'Contact information' }
            },
            required: ['order_id']
          }
        },
        {
          name: 'transfer_to_sales',
          description: 'Transfer customer back to sales agent',
          parameters: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for transfer' }
            }
          }
        }
      ]
    };

    return toolSets[agentType.getValue() as keyof typeof toolSets] || toolSets.sales;
  }

  /**
   * 📊 PATRÓN: Agent Metrics Pattern
   * Métricas de rendimiento del agente
   */
  private getAgentMetrics(agentType: AgentType): AgentMetrics {
    // Simular métricas desde browser storage o valores por defecto
    const metricsKey = this.getStorageKey(`agent-metrics-${agentType.getValue()}`);
    const storedMetrics = this.getBrowserStorage(metricsKey) as Record<string, unknown>;

    return storedMetrics || {
      totalSessions: 0,
      successfulTransfers: 0,
      averageSessionDuration: 0,
      customerSatisfactionScore: 4.5,
      lastActiveSession: new Date().toISOString(),
      popularTools: agentType.getValue() === 'sales' ? 
        ['focus_menu_item', 'add_to_cart'] : 
        ['process_payment', 'generate_receipt']
    };
  }

  /**
   * 🤖 PATRÓN: OpenAI Configuration Pattern
   * Configuración específica para OpenAI Realtime API
   */
  private getOpenAIConfig(agentType: AgentType): OpenAIConfiguration {
    const baseConfig = {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      modalities: ['text', 'audio'],
      temperature: 0.7,
      max_response_output_tokens: 4096,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    };

    const agentSpecificConfigs = {
      sales: {
        ...baseConfig,
        voice: 'alloy',
        instructions: `You are Luxora, a friendly and knowledgeable sales agent for a fast-food restaurant. 
        Your role is to help customers navigate the menu, make recommendations, and take orders. 
        You can control a 3D carousel to show menu items and add items to the customer's cart.
        
        Key behaviors:
        - Be enthusiastic about menu items
        - Ask about preferences and dietary restrictions
        - Suggest popular items and combos
        - Use the focus_menu_item tool to highlight items
        - Transfer to payment agent when order is complete
        
        Always be helpful, friendly, and efficient.`,
        temperature: 0.8 // Más creativo para ventas
      },
      payment: {
        ...baseConfig,
        voice: 'nova',
        instructions: `You are Karol, a professional and efficient payment agent for a fast-food restaurant.
        Your role is to process payments, collect delivery information, and complete orders.
        
        Key behaviors:
        - Be professional and security-focused
        - Clearly explain payment options
        - Collect necessary delivery information
        - Process payments securely
        - Generate receipts and confirmations
        - Transfer back to sales if customer wants to modify order
        
        Always prioritize security and accuracy in payment processing.`,
        temperature: 0.6 // Más conservador para pagos
      }
    };

    return agentSpecificConfigs[agentType.getValue() as keyof typeof agentSpecificConfigs] || agentSpecificConfigs.sales;
  }

  /**
   * 🗂️ PATRÓN: Cache Management Pattern
   * Gestión de cache para configuraciones de agente
   */
  private getCachedResult(): GetAgentConfigResult | null {
    const cacheKey = this.generateCacheKey();
    const cached = this.getBrowserStorage(cacheKey, true) as Record<string, unknown>;
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.result;
    }
    
    return null;
  }

  private cacheResult(result: GetAgentConfigResult): void {
    const cacheKey = this.generateCacheKey();
    const cacheData = {
      timestamp: Date.now(),
      result
    };
    
    this.setBrowserStorage(cacheKey, cacheData, true);
  }

  private isCacheExpired(timestamp: number): boolean {
    const maxAge = 600000; // 10 minutos para configuraciones
    return Date.now() - timestamp > maxAge;
  }

  /**
   * 🔑 PATRÓN: Cache Key Generation Pattern
   * Generar clave única para cache
   */
  private generateCacheKey(): string {
    const parts = [
      'query-cache',
      'GetAgentConfigQuery',
      this.agentType || 'all-agents',
      this.includeTools ? 'with-tools' : 'no-tools',
      this.includeMetrics ? 'with-metrics' : 'no-metrics',
      this.includeOpenAIConfig ? 'with-openai' : 'no-openai'
    ];
    
    return this.getStorageKey(parts.join('-'));
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de ejecución
   */
  private getEstimatedDuration(): number {
    let baseDuration = 15; // 15ms base para configuraciones

    if (this.includeTools) baseDuration += 10;
    if (this.includeMetrics) baseDuration += 20; // Puede requerir storage lookup
    if (this.includeOpenAIConfig) baseDuration += 5;

    return baseDuration;
  }

  /**
   * 🛡️ PATRÓN: Agent Type Validation Pattern
   * Validar tipo de agente
   */
  private isValidAgentType(type: string): boolean {
    return ['sales', 'payment'].includes(type.toLowerCase());
  }

  /**
   * 🎨 PATRÓN: Query Decoration Pattern
   * Crear variantes de la query
   */
  public withTools(): GetAgentConfigQuery {
    return new GetAgentConfigQuery(
      this.agentType,
      this.sessionId,
      true,
      this.includeMetrics,
      this.includeOpenAIConfig,
      this.queryId
    );
  }

  public withMetrics(): GetAgentConfigQuery {
    return new GetAgentConfigQuery(
      this.agentType,
      this.sessionId,
      this.includeTools,
      true,
      this.includeOpenAIConfig,
      this.queryId
    );
  }

  public withOpenAIConfig(): GetAgentConfigQuery {
    return new GetAgentConfigQuery(
      this.agentType,
      this.sessionId,
      this.includeTools,
      this.includeMetrics,
      true,
      this.queryId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de GetAgentConfigQuery
 */
export class GetAgentConfigQueryBuilder {
  private agentType?: string;
  private sessionId?: string;
  private includeTools: boolean = true;
  private includeMetrics: boolean = false;
  private includeOpenAIConfig: boolean = true;

  public forAgentType(type: string): this {
    this.agentType = type;
    return this;
  }

  public inSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public withTools(): this {
    this.includeTools = true;
    return this;
  }

  public withMetrics(): this {
    this.includeMetrics = true;
    return this;
  }

  public withOpenAIConfig(): this {
    this.includeOpenAIConfig = true;
    return this;
  }

  public build(): GetAgentConfigQuery {
    return new GetAgentConfigQuery(
      this.agentType,
      this.sessionId,
      this.includeTools,
      this.includeMetrics,
      this.includeOpenAIConfig
    );
  }
}

/**
 * 📊 PATRÓN: Configuration Interfaces
 * Interfaces para configuración de agentes
 */
export interface AgentConfiguration {
  id: string;
  name: string;
  type: string;
  displayName: string;
  description: string;
  personality: string;
  isActive: boolean;
  capabilities: string[];
  language: string;
  voice: string;
  tools?: AgentTool[];
  metrics?: AgentMetrics;
  openaiConfig?: OpenAIConfiguration;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: string;
        properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentMetrics {
  totalSessions: number;
  successfulTransfers: number;
  averageSessionDuration: number;
  customerSatisfactionScore: number;
  lastActiveSession: string;
  popularTools: string[];
}

export interface OpenAIConfiguration {
  model: string;
  modalities: string[];
  voice: string;
  instructions: string;
  temperature: number;
  max_response_output_tokens: number;
  turn_detection: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de la query de configuración de agentes
 */
export interface GetAgentConfigResult {
  success: boolean;
  agentConfig?: AgentConfiguration;
  agentConfigs?: AgentConfiguration[];
  totalCount?: number;
  error?: string;
  validationErrors?: string[];
  queryMetadata?: QueryMetadata;
  fromCache?: boolean;
  cacheAge?: number;
}
