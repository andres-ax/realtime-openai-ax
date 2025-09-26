/**
 * 🏗️ PATRÓN: Entity Pattern (DDD)
 * 🎯 PRINCIPIO: Single Responsibility + Strategy Pattern + Configuration
 * 
 * Agent - Entidad agente especializado (Sales/Payment)
 * Maneja configuración, herramientas y comportamiento específico
 */

import { BaseEntity } from './BaseEntity';
import { AgentId } from '../valueObjects/AgentId';
import { AgentType } from '../valueObjects/AgentType';

/**
 * 🤖 PATRÓN: Agent Pattern
 * Agent representa un agente especializado con herramientas específicas
 */
export class Agent extends BaseEntity<AgentId> {
  private _name: string;
  private _type: AgentType;
  private _instructions: string;
  private _voice: VoiceSettings;
  private _tools: AgentTool[];
  private _isActive: boolean;
  private _sessionCount: number;
  private _successfulTransfers: number;
  private _averageSessionDuration: number;

  constructor(
    id: AgentId,
    name: string,
    type: AgentType,
    instructions: string,
    voice: VoiceSettings
  ) {
    super(id);
    
    this._name = name;
    this._type = type;
    this._instructions = instructions;
    this._voice = voice;
    this._tools = [];
    this._isActive = true;
    this._sessionCount = 0;
    this._successfulTransfers = 0;
    this._averageSessionDuration = 0;
    
    this.validate();
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear agente de ventas (Luxora)
   */
  public static createSalesAgent(): Agent {
    const id = AgentId.generate();
    const type = AgentType.sales();
    const name = 'Luxora';
    
    const instructions = `You are Luxora, a friendly and knowledgeable sales assistant for our restaurant. 
Your role is to help customers explore our menu, make recommendations, and take their orders.

Key responsibilities:
- Greet customers warmly and introduce yourself
- Help customers navigate our menu and make recommendations
- Answer questions about ingredients, preparation time, and pricing
- Take complete orders including quantities and special requests
- Use the focus_menu_item tool to highlight items in the 3D carousel
- Use the order tool to add items to the customer's cart
- Transfer to payment agent when customer is ready to checkout

Communication style:
- Friendly, enthusiastic, and helpful
- Use natural conversation flow
- Ask clarifying questions when needed
- Provide detailed descriptions of menu items
- Suggest popular combinations and deals`;

    const voice: VoiceSettings = {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      temperature: 0.7,
      max_response_output_tokens: 4096,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    };

    const agent = new Agent(id, name, type, instructions, voice);
    
    // Agregar herramientas específicas
    agent.addTool({
      type: 'function',
      name: 'focus_menu_item',
      description: 'Focus on a specific menu item in the 3D carousel',
      parameters: {
        type: 'object',
        properties: {
          item_name: {
            type: 'string',
            description: 'Name of the menu item to focus on'
          }
        },
        required: ['item_name']
      }
    });

    agent.addTool({
      type: 'function',
      name: 'order',
      description: 'Add items to the customer order',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                special_requests: { type: 'string' }
              },
              required: ['name', 'quantity']
            }
          }
        },
        required: ['items']
      }
    });

    return agent;
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear agente de pagos (Karol)
   */
  public static createPaymentAgent(): Agent {
    const id = AgentId.generate();
    const type = AgentType.payment();
    const name = 'Karol';
    
    const instructions = `You are Karol, a professional and efficient payment processing assistant. 
Your role is to handle the checkout process and collect customer information for order completion.

Key responsibilities:
- Review the customer's order and confirm details
- Collect delivery address information
- Collect contact information (phone and email)
- Process payment information securely
- Provide order confirmation and estimated delivery time
- Use update_order_data tool to save customer information
- Transfer back to menu agent if customer wants to modify order

Communication style:
- Professional, clear, and reassuring
- Focus on accuracy and security
- Explain each step of the checkout process
- Confirm information before proceeding
- Handle payment concerns with empathy`;

    const voice: VoiceSettings = {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'echo',
      temperature: 0.3,
      max_response_output_tokens: 4096,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    };

    const agent = new Agent(id, name, type, instructions, voice);
    
    // Agregar herramientas específicas
    agent.addTool({
      type: 'function',
      name: 'update_order_data',
      description: 'Update order with customer information',
      parameters: {
        type: 'object',
        properties: {
          customer_info: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
              email: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  zip: { type: 'string' }
                },
                required: ['street', 'city', 'state', 'zip']
              }
            },
            required: ['name', 'phone', 'address']
          }
        },
        required: ['customer_info']
      }
    });

    agent.addTool({
      type: 'function',
      name: 'transfer_to_menu_agent',
      description: 'Transfer back to menu agent for order modifications',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for transferring back to menu agent'
          }
        },
        required: ['reason']
      }
    });

    return agent;
  }

  /**
   * 🔧 PATRÓN: Tool Management Pattern
   * Agregar herramienta al agente
   */
  public addTool(tool: AgentTool): void {
    // Evitar duplicados
    const exists = this._tools.some(t => t.name === tool.name);
    if (!exists) {
      this._tools.push(tool);
      this.updateTimestamp();
    }
  }

  /**
   * 🔧 PATRÓN: Tool Management Pattern
   * Remover herramienta del agente
   */
  public removeTool(toolName: string): void {
    const index = this._tools.findIndex(t => t.name === toolName);
    if (index !== -1) {
      this._tools.splice(index, 1);
      this.updateTimestamp();
    }
  }

  /**
   * ⚙️ PATRÓN: Configuration Update Pattern
   * Actualizar configuración de voz
   */
  public updateVoiceSettings(voice: Partial<VoiceSettings>): void {
    this._voice = {
      ...this._voice,
      ...voice
    };
    this.updateTimestamp();
  }

  /**
   * 📝 PATRÓN: Instructions Update Pattern
   * Actualizar instrucciones del agente
   */
  public updateInstructions(instructions: string): void {
    if (!instructions || instructions.trim().length === 0) {
      throw new Error('Agent instructions cannot be empty');
    }

    this._instructions = instructions.trim();
    this.updateTimestamp();
  }

  /**
   * 🔄 PATRÓN: Status Management Pattern
   * Activar/desactivar agente
   */
  public setActiveStatus(isActive: boolean): void {
    this._isActive = isActive;
    this.updateTimestamp();
  }

  /**
   * 📊 PATRÓN: Analytics Pattern
   * Registrar sesión completada
   */
  public recordSession(durationMs: number, wasSuccessful: boolean): void {
    this._sessionCount += 1;
    
    if (wasSuccessful) {
      this._successfulTransfers += 1;
    }
    
    // Calcular promedio de duración
    const durationSeconds = durationMs / 1000;
    this._averageSessionDuration = 
      (this._averageSessionDuration * (this._sessionCount - 1) + durationSeconds) / this._sessionCount;
    
    this.updateTimestamp();
  }

  /**
   * 📊 PATRÓN: Performance Metrics Pattern
   * Obtener métricas de rendimiento
   */
  public getPerformanceMetrics(): AgentPerformanceMetrics {
    const successRate = this._sessionCount > 0 
      ? (this._successfulTransfers / this._sessionCount) * 100 
      : 0;

    return {
      sessionCount: this._sessionCount,
      successfulTransfers: this._successfulTransfers,
      successRate: Math.round(successRate * 100) / 100,
      averageSessionDuration: Math.round(this._averageSessionDuration * 100) / 100,
      isActive: this._isActive
    };
  }

  /**
   * 🎯 PATRÓN: OpenAI Configuration Pattern
   * Obtener configuración para OpenAI Realtime API
   */
  public getOpenAIConfig(): OpenAIAgentConfig {
    return {
      model: this._voice.model,
      instructions: this._instructions,
      voice: this._voice.voice,
      temperature: this._voice.temperature,
      max_response_output_tokens: this._voice.max_response_output_tokens,
      turn_detection: this._voice.turn_detection,
      tools: this._tools,
      tool_choice: 'auto'
    };
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener información para mostrar en UI
   */
  public getDisplayInfo(): AgentDisplayInfo {
    const metrics = this.getPerformanceMetrics();
    
    return {
      id: this.id.toString(),
      name: this._name,
      type: this._type.getDisplayName(),
      typeValue: this._type.getValue(),
      isActive: this._isActive,
      toolCount: this._tools.length,
      tools: this._tools.map(t => t.name),
      voice: this._voice.voice,
      sessionCount: metrics.sessionCount,
      successRate: metrics.successRate,
      averageSessionDuration: metrics.averageSessionDuration
    };
  }

  /**
   * 🔍 PATRÓN: Tool Query Pattern
   * Verificar si tiene herramienta específica
   */
  public hasTool(toolName: string): boolean {
    return this._tools.some(t => t.name === toolName);
  }

  /**
   * 🔍 PATRÓN: Capability Query Pattern
   * Verificar capacidades del agente
   */
  public canHandleOrderModification(): boolean {
    return this.hasTool('order') || this.hasTool('transfer_to_menu_agent');
  }

  public canProcessPayment(): boolean {
    return this.hasTool('update_order_data');
  }

  public canFocusMenuItems(): boolean {
    return this.hasTool('focus_menu_item');
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Validación específica de Agent
   */
  protected validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    if (this._name.length > 50) {
      throw new Error('Agent name cannot exceed 50 characters');
    }

    if (!this._instructions || this._instructions.trim().length === 0) {
      throw new Error('Agent instructions are required');
    }

    if (this._instructions.length > 5000) {
      throw new Error('Agent instructions cannot exceed 5000 characters');
    }

    if (this._sessionCount < 0) {
      throw new Error('Session count cannot be negative');
    }

    if (this._successfulTransfers < 0) {
      throw new Error('Successful transfers cannot be negative');
    }

    if (this._averageSessionDuration < 0) {
      throw new Error('Average session duration cannot be negative');
    }
  }

  // Getters públicos (solo lectura)
  public getName(): string {
    return this._name;
  }

  public getType(): AgentType {
    return this._type;
  }

  public getInstructions(): string {
    return this._instructions;
  }

  public getVoiceSettings(): VoiceSettings {
    return { ...this._voice };
  }

  public getTools(): readonly AgentTool[] {
    return [...this._tools];
  }

  public isActive(): boolean {
    return this._isActive;
  }

  public getSessionCount(): number {
    return this._sessionCount;
  }

  public getSuccessfulTransfers(): number {
    return this._successfulTransfers;
  }

  public getAverageSessionDuration(): number {
    return this._averageSessionDuration;
  }
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Información para mostrar en UI
 */
export interface AgentDisplayInfo {
  id: string;
  name: string;
  type: string;
  typeValue: string;
  isActive: boolean;
  toolCount: number;
  tools: string[];
  voice: string;
  sessionCount: number;
  successRate: number;
  averageSessionDuration: number;
}

/**
 * 📊 PATRÓN: Performance Metrics Pattern
 * Métricas de rendimiento del agente
 */
export interface AgentPerformanceMetrics {
  sessionCount: number;
  successfulTransfers: number;
  successRate: number;
  averageSessionDuration: number;
  isActive: boolean;
}

/**
 * 🎙️ PATRÓN: Voice Configuration Pattern
 * Configuración de voz para OpenAI
 */
export interface VoiceSettings {
  model: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  temperature: number;
  max_response_output_tokens: number;
  turn_detection: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

/**
 * 🔧 PATRÓN: Tool Definition Pattern
 * Definición de herramienta del agente
 */
export interface AgentTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * 🎯 PATRÓN: OpenAI Integration Pattern
 * Configuración completa para OpenAI Realtime API
 */
export interface OpenAIAgentConfig {
  model: string;
  instructions: string;
  voice: string;
  temperature: number;
  max_response_output_tokens: number;
  turn_detection: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
  tools: AgentTool[];
  tool_choice: 'auto' | 'none' | { type: 'function'; name: string };
}
