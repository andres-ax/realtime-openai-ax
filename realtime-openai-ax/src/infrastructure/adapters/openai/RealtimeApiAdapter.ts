/**
 * 🏗️ PATRÓN: Adapter Pattern (Hexagonal Architecture)
 * 🎯 PRINCIPIO: External API Integration + Real-time Communication
 * 
 * RealtimeApiAdapter - Adaptador para OpenAI Realtime API
 * Maneja la comunicación WebRTC con OpenAI para voice ordering
 */

import { AgentType } from '../../../domain/valueObjects/AgentType';
import { CustomerId } from '../../../domain/valueObjects/CustomerId';

/**
 * 🎯 PATRÓN: Adapter Pattern
 * RealtimeApiAdapter adapta la API externa de OpenAI al dominio interno
 */
export class RealtimeApiAdapter {
  private connection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioContext: AudioContext | null = null;
  private currentSession: RealtimeSession | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  /**
   * 🔧 PATRÓN: Singleton Pattern
   * Constructor privado para instancia única
   */
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = 'https://api.openai.com/v1/realtime'
  ) {}

  /**
   * 🔄 PATRÓN: Connection Management Pattern
   * Establecer conexión con OpenAI Realtime API
   */
  public async connect(config: RealtimeConnectionConfig): Promise<RealtimeConnectionResult> {
    try {
      // 1. Crear ephemeral key para la sesión
      const ephemeralKey = await this.createEphemeralKey(config);
      
      // 2. Configurar WebRTC peer connection
      this.connection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // 3. Configurar data channel para function calling
      this.dataChannel = this.connection.createDataChannel('oai-events', {
        ordered: true
      });

      // 4. Configurar audio context
      this.audioContext = new AudioContext();

      // 5. Establecer conexión con OpenAI
      const sessionResult = await this.establishSession(ephemeralKey, config);

      if (!sessionResult.success) {
        throw new Error(sessionResult.error);
      }

      this.currentSession = sessionResult.session!;

      // 6. Configurar event listeners
      this.setupEventListeners();

      return {
        success: true,
        sessionId: this.currentSession.id,
        ephemeralKey: ephemeralKey.key,
        expiresAt: ephemeralKey.expiresAt
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to OpenAI Realtime API'
      };
    }
  }

  /**
   * 🤖 PATRÓN: Agent Configuration Pattern
   * Configurar agente específico (Sales/Payment)
   */
  public async configureAgent(agentType: AgentType, customerId?: CustomerId): Promise<AgentConfigResult> {
    if (!this.currentSession) {
      return { success: false, error: 'No active session' };
    }

    try {
      const agentConfig = this.buildAgentConfiguration(agentType, customerId);
      
      await this.sendEvent({
        type: 'session.update',
        session: agentConfig
      });

      return {
        success: true,
        agentType: agentType.getValue(),
        configuration: agentConfig
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure agent'
      };
    }
  }

  /**
   * 🎙️ PATRÓN: Audio Stream Management Pattern
   * Iniciar streaming de audio
   */
  public async startAudioStream(): Promise<AudioStreamResult> {
    if (!this.audioContext || !this.connection) {
      return { success: false, error: 'No active connection' };
    }

    try {
      // 1. Obtener micrófono del usuario
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // 2. Configurar audio track
      const audioTrack = stream.getAudioTracks()[0];
      this.connection.addTrack(audioTrack, stream);

      // 3. Configurar audio processing
      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        this.processAudioData(event.inputBuffer);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      return {
        success: true,
        streamId: audioTrack.id,
        sampleRate: this.audioContext.sampleRate
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio stream'
      };
    }
  }

  /**
   * 📞 PATRÓN: Function Calling Pattern
   * Enviar function call a OpenAI
   */
  public async sendFunctionCall(functionCall: FunctionCall): Promise<FunctionCallResult> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return { success: false, error: 'Data channel not available' };
    }

    try {
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'function_call',
          name: functionCall.name,
          call_id: functionCall.callId,
          arguments: JSON.stringify(functionCall.arguments)
        }
      };

      this.dataChannel.send(JSON.stringify(event));

      return {
        success: true,
        callId: functionCall.callId,
        sentAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send function call'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Event Listener Pattern
   * Registrar listener para eventos de OpenAI
   */
  public addEventListener(eventType: string, listener: (data: unknown) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 🔌 PATRÓN: Cleanup Pattern
   * Desconectar y limpiar recursos
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      if (this.connection) {
        this.connection.close();
        this.connection = null;
      }

      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.currentSession = null;
      this.eventListeners.clear();

    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * 🔑 PATRÓN: Security Pattern
   * Crear ephemeral key para la sesión
   */
  private async createEphemeralKey(config: RealtimeConnectionConfig): Promise<EphemeralKey> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-realtime-preview-2024-10-01',
        voice: config.voice || 'alloy'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create ephemeral key: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      key: data.client_secret.value,
      expiresAt: new Date(data.client_secret.expires_at * 1000)
    };
  }

  /**
   * 🔗 PATRÓN: Session Management Pattern
   * Establecer sesión con OpenAI
   */
  private async establishSession(
    ephemeralKey: EphemeralKey, 
    config: RealtimeConnectionConfig
  ): Promise<SessionEstablishResult> {
    try {
      const sessionConfig = {
        id: `session_${Date.now()}`,
        model: config.model || 'gpt-4o-realtime-preview-2024-10-01',
        voice: config.voice || 'alloy',
        instructions: config.instructions || this.getDefaultInstructions(),
        tools: config.tools || [],
        temperature: config.temperature || 0.8,
        max_response_output_tokens: config.maxTokens || 4096
      };

      return {
        success: true,
        session: sessionConfig as RealtimeSession
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to establish session'
      };
    }
  }

  /**
   * 🤖 PATRÓN: Agent Configuration Builder Pattern
   * Construir configuración específica por agente
   */
  private buildAgentConfiguration(agentType: AgentType, customerId?: CustomerId): AgentConfiguration {
    const baseConfig = {
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
      temperature: 0.8,
      max_response_output_tokens: 4096
    };

    switch (agentType.getValue()) {
      case 'sales':
        return {
          ...baseConfig,
          instructions: this.getSalesAgentInstructions(),
          tools: this.getSalesAgentTools(),
          voice: 'nova', // Voz más energética para ventas
          temperature: 0.9 // Más creatividad para recomendaciones
        };

      case 'payment':
        return {
          ...baseConfig,
          instructions: this.getPaymentAgentInstructions(customerId),
          tools: this.getPaymentAgentTools(),
          voice: 'shimmer', // Voz más profesional para pagos
          temperature: 0.6 // Menos creatividad, más precisión
        };

      default:
        return {
          ...baseConfig,
          instructions: this.getDefaultInstructions(),
          tools: []
        };
    }
  }

  /**
   * 🎯 PATRÓN: Instructions Template Pattern
   * Instrucciones para agente de ventas
   */
  private getSalesAgentInstructions(): string {
    return `You are Luxora, a friendly and enthusiastic sales assistant for a voice-ordering restaurant app.

Your role:
- Help customers explore the menu and make selections
- Provide detailed information about menu items
- Make personalized recommendations based on preferences
- Use the focus_menu_item function to control the 3D carousel
- Add items to cart using the order function
- Transfer to payment agent when customer is ready to checkout

Personality:
- Friendly and enthusiastic
- Knowledgeable about all menu items
- Patient with questions
- Proactive with recommendations

Available tools:
- focus_menu_item: Control the 3D menu carousel
- order: Add/remove items from cart
- transfer_to_payment_agent: Transfer to payment specialist

Always be helpful and make the ordering experience enjoyable!`;
  }

  /**
   * 💳 PATRÓN: Instructions Template Pattern
   * Instrucciones para agente de pagos
   */
  private getPaymentAgentInstructions(customerId?: CustomerId): string {
    const customerContext = customerId ? `Customer ID: ${customerId.toString()}` : 'New customer';
    
    return `You are Karol, a professional payment specialist for a voice-ordering restaurant app.

Your role:
- Process payment information securely
- Collect delivery address and contact details
- Confirm order details before processing
- Handle payment-related questions
- Transfer back to sales agent if customer wants to modify order

Context: ${customerContext}

Personality:
- Professional and trustworthy
- Detail-oriented
- Security-conscious
- Efficient but thorough

Available tools:
- update_order_data: Update customer and delivery information
- transfer_to_sales_agent: Transfer back to sales for order changes

Always ensure all information is accurate before processing payment!`;
  }

  /**
   * 🛠️ PATRÓN: Tools Configuration Pattern
   * Herramientas para agente de ventas
   */
  private getSalesAgentTools(): OpenAITool[] {
    return [
      {
        type: 'function',
        name: 'focus_menu_item',
        description: 'Focus on a specific menu item in the 3D carousel',
        parameters: {
          type: 'object',
          properties: {
            item_name: {
              type: 'string',
              description: 'Name of the menu item to focus on'
            },
            reason: {
              type: 'string',
              description: 'Reason for focusing on this item'
            }
          },
          required: ['item_name']
        }
      },
      {
        type: 'function',
        name: 'order',
        description: 'Add or remove items from the customer cart',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['add', 'remove', 'update'],
              description: 'Action to perform on the cart'
            },
            item_name: {
              type: 'string',
              description: 'Name of the menu item'
            },
            quantity: {
              type: 'number',
              description: 'Quantity of the item'
            }
          },
          required: ['action', 'item_name']
        }
      },
      {
        type: 'function',
        name: 'transfer_to_payment_agent',
        description: 'Transfer customer to payment specialist',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for transfer'
            }
          },
          required: ['reason']
        }
      }
    ];
  }

  /**
   * 🛠️ PATRÓN: Tools Configuration Pattern
   * Herramientas para agente de pagos
   */
  private getPaymentAgentTools(): OpenAITool[] {
    return [
      {
        type: 'function',
        name: 'update_order_data',
        description: 'Update customer information and delivery details',
        parameters: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'Customer full name'
            },
            phone: {
              type: 'string',
              description: 'Customer phone number'
            },
            email: {
              type: 'string',
              description: 'Customer email address'
            },
            delivery_address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                zipcode: { type: 'string' }
              },
              required: ['street', 'city']
            }
          },
          required: ['customer_name', 'phone']
        }
      },
      {
        type: 'function',
        name: 'transfer_to_sales_agent',
        description: 'Transfer back to sales agent for order modifications',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for transfer back to sales'
            }
          },
          required: ['reason']
        }
      }
    ];
  }

  /**
   * 📝 PATRÓN: Default Configuration Pattern
   * Instrucciones por defecto
   */
  private getDefaultInstructions(): string {
    return `You are a helpful assistant for a voice-ordering restaurant app. 
Help customers with their orders and provide information about menu items.`;
  }

  /**
   * 🎵 PATRÓN: Audio Processing Pattern
   * Procesar datos de audio
   */
  private processAudioData(buffer: AudioBuffer): void {
    // Convertir audio buffer a formato requerido por OpenAI
    const channelData = buffer.getChannelData(0);
    const samples = new Int16Array(channelData.length);
    
    for (let i = 0; i < channelData.length; i++) {
      samples[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32768));
    }

    // Enviar audio a OpenAI si hay conexión activa
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const audioEvent = {
        type: 'input_audio_buffer.append',
        audio: this.arrayBufferToBase64(samples.buffer)
      };
      
      this.dataChannel.send(JSON.stringify(audioEvent));
    }
  }

  /**
   * 🔄 PATRÓN: Event Setup Pattern
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.emitEvent('connection.opened', { timestamp: new Date() });
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleOpenAIEvent(data);
      } catch (error) {
        console.error('Failed to parse OpenAI event:', error);
      }
    };

    this.dataChannel.onclose = () => {
      this.emitEvent('connection.closed', { timestamp: new Date() });
    };

    this.dataChannel.onerror = (error) => {
      this.emitEvent('connection.error', { error, timestamp: new Date() });
    };
  }

  /**
   * 📡 PATRÓN: Event Handling Pattern
   * Manejar eventos de OpenAI
   */
  private handleOpenAIEvent(event: OpenAIEvent): void {
    switch (event.type) {
      case 'response.audio.delta':
        this.emitEvent('audio.received', event);
        break;
      
      case 'response.function_call_delta':
        this.emitEvent('function_call.received', event);
        break;
      
      case 'conversation.item.created':
        this.emitEvent('conversation.updated', event);
        break;
      
      case 'error':
        this.emitEvent('error', event);
        break;
      
      default:
        this.emitEvent('event.received', event);
    }
  }

  /**
   * 📤 PATRÓN: Event Emission Pattern
   * Emitir evento a listeners
   */
  private emitEvent(eventType: string, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * 📤 PATRÓN: Event Sending Pattern
   * Enviar evento a OpenAI
   */
  private async sendEvent(event: OpenAIEvent): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not available');
    }

    this.dataChannel.send(JSON.stringify(event));
  }

  /**
   * 🔄 PATRÓN: Utility Pattern
   * Convertir ArrayBuffer a Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para OpenAI Realtime API
 */
export interface RealtimeConnectionConfig {
  model?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  instructions?: string;
  tools?: OpenAITool[];
  temperature?: number;
  maxTokens?: number;
}

export interface RealtimeConnectionResult {
  success: boolean;
  sessionId?: string;
  ephemeralKey?: string;
  expiresAt?: Date;
  error?: string;
}

export interface AgentConfigResult {
  success: boolean;
  agentType?: string;
  configuration?: AgentConfiguration;
  error?: string;
}

export interface AudioStreamResult {
  success: boolean;
  streamId?: string;
  sampleRate?: number;
  error?: string;
}

export interface FunctionCall {
  name: string;
  callId: string;
  arguments: Record<string, unknown>;
}

export interface FunctionCallResult {
  success: boolean;
  callId?: string;
  sentAt?: Date;
  error?: string;
}

export interface EphemeralKey {
  key: string;
  expiresAt: Date;
}

export interface RealtimeSession {
  id: string;
  model: string;
  voice: string;
  instructions: string;
  tools: OpenAITool[];
  temperature: number;
  max_response_output_tokens: number;
}

export interface SessionEstablishResult {
  success: boolean;
  session?: RealtimeSession;
  error?: string;
}

export interface AgentConfiguration {
  model: string;
  voice: string;
  instructions: string;
  tools: OpenAITool[];
  temperature: number;
  max_response_output_tokens: number;
}

export interface OpenAITool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface OpenAIEvent {
  type: string;
  [key: string]: unknown;
}
