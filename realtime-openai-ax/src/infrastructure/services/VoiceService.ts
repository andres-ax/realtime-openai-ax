/**
 * 🏗️ PATRÓN: Voice Recognition Service Pattern
 * 🎯 PRINCIPIO: Speech-to-Text + Voice Activity Detection
 * 
 * VoiceService - Servicio de reconocimiento de voz con integración OpenAI
 * Maneja detección de actividad de voz, transcripción y comandos de voz
 */

import type { AgentType } from '../../domain/valueObjects/AgentType';

/**
 * 🎯 PATRÓN: Voice Recognition Service Pattern
 * VoiceService maneja todo el procesamiento de voz
 */
export class VoiceService {
  private isListening = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private vadThreshold = 0.01; // Voice Activity Detection threshold
  private silenceTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de voz
   */
  constructor(private readonly config: VoiceServiceConfig) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      vadEnabled: true,
      silenceThreshold: 2000, // 2 seconds
      maxRecordingTime: 30000, // 30 seconds
      enableNoiseSuppression: true,
      enableEchoCancellation: true,
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar servicio de voz
   */
  public async initialize(): Promise<VoiceInitResult> {
    try {
      // 1. Verificar soporte del navegador
      if (!this.isBrowserSupported()) {
        return {
          success: false,
          error: 'Browser does not support required audio features'
        };
      }

      // 2. Solicitar permisos de micrófono
      const permissionResult = await this.requestMicrophonePermission();
      if (!permissionResult.success) {
        return permissionResult;
      }

      // 3. Inicializar contexto de audio
      await this.initializeAudioContext();

      this.emitEvent('voice.initialized', {
        sampleRate: this.config.sampleRate,
        vadEnabled: this.config.vadEnabled,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Voice service initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize voice service'
      };
    }
  }

  /**
   * 🎙️ PATRÓN: Voice Recording Pattern
   * Iniciar grabación de voz
   */
  public async startListening(agentType?: AgentType): Promise<VoiceListeningResult> {
    try {
      if (this.isListening) {
        return {
          success: false,
          error: 'Already listening'
        };
      }

      // 1. Obtener stream de audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          noiseSuppression: this.config.enableNoiseSuppression,
          echoCancellation: this.config.enableEchoCancellation
        }
      });

      // 2. Configurar MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });

      // 3. Configurar event listeners
      this.setupMediaRecorderEvents();

      // 4. Inicializar VAD si está habilitado
      if (this.config.vadEnabled) {
        await this.initializeVAD(stream);
      }

      // 5. Iniciar grabación
      this.mediaRecorder.start();
      this.isListening = true;

      // 6. Configurar timeout máximo
      setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, this.config.maxRecordingTime);

      this.emitEvent('voice.listening.started', {
        agentType: agentType?.getValue(),
        vadEnabled: this.config.vadEnabled,
        timestamp: Date.now()
      });

      return {
        success: true,
        isListening: true,
        vadEnabled: this.config.vadEnabled
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start listening'
      };
    }
  }

  /**
   * 🛑 PATRÓN: Voice Recording Pattern
   * Detener grabación de voz
   */
  public async stopListening(): Promise<VoiceStopResult> {
    try {
      if (!this.isListening || !this.mediaRecorder) {
        return {
          success: false,
          error: 'Not currently listening'
        };
      }

      // 1. Detener MediaRecorder
      this.mediaRecorder.stop();
      this.isListening = false;

      // 2. Limpiar VAD
      this.cleanupVAD();

      // 3. Limpiar timeouts
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }

      this.emitEvent('voice.listening.stopped', {
        timestamp: Date.now()
      });

      return {
        success: true,
        isListening: false
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop listening'
      };
    }
  }

  /**
   * 🔍 PATRÓN: Voice Activity Detection Pattern
   * Detectar actividad de voz en tiempo real
   */
  public getVoiceActivity(): VoiceActivityData {
    if (!this.analyser) {
      return {
        isActive: false,
        volume: 0,
        confidence: 0
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calcular volumen promedio
    const sum = dataArray.reduce((acc, value) => acc + value, 0);
    const average = sum / bufferLength;
    const volume = average / 255; // Normalizar a 0-1

    // Detectar actividad de voz
    const isActive = volume > this.vadThreshold;
    const confidence = Math.min(volume / this.vadThreshold, 1);

    return {
      isActive,
      volume,
      confidence,
      timestamp: Date.now()
    };
  }

  /**
   * 🎯 PATRÓN: Command Processing Pattern
   * Procesar comando de voz transcrito
   */
  public async processVoiceCommand(transcript: string, agentType: AgentType): Promise<VoiceCommandResult> {
    try {
      // 1. Limpiar y normalizar transcript
      const cleanTranscript = this.cleanTranscript(transcript);
      
      if (!cleanTranscript || cleanTranscript.length < 2) {
        return {
          success: false,
          error: 'Transcript too short or empty'
        };
      }

      // 2. Detectar intención del comando
      const intent = this.detectIntent(cleanTranscript, agentType);

      // 3. Extraer entidades del comando
      const entities = this.extractEntities(cleanTranscript);

      // 4. Validar comando según el agente
      const validation = this.validateCommandForAgent(intent, entities, agentType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      this.emitEvent('voice.command.processed', {
        transcript: cleanTranscript,
        intent: intent.name,
        confidence: intent.confidence,
        agentType: agentType.getValue(),
        entities,
        timestamp: Date.now()
      });

      return {
        success: true,
        transcript: cleanTranscript,
        intent,
        entities,
        confidence: intent.confidence
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process voice command'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Event Listener Pattern
   * Agregar event listener
   */
  public addEventListener(eventType: string, listener: (data: unknown) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 🗑️ PATRÓN: Event Listener Pattern
   * Remover event listener
   */
  public removeEventListener(eventType: string, listener: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 🧹 PATRÓN: Cleanup Pattern
   * Limpiar recursos del servicio
   */
  public cleanup(): void {
    if (this.isListening) {
      this.stopListening();
    }

    this.cleanupVAD();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.eventListeners.clear();
  }

  /**
   * 🔧 PATRÓN: Browser Support Detection Pattern
   * Verificar soporte del navegador
   */
  private isBrowserSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.MediaRecorder &&
      (typeof window.AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined')
    );
  }

  /**
   * 🎤 PATRÓN: Permission Request Pattern
   * Solicitar permisos de micrófono
   */
  private async requestMicrophonePermission(): Promise<VoiceInitResult> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Liberar stream temporal
      
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Microphone permission denied'
        };
      }
      return {
        success: false,
        error: 'Failed to access microphone'
      };
    }
  }

  /**
   * 🎵 PATRÓN: Audio Context Initialization Pattern
   * Inicializar contexto de audio
   */
  private async initializeAudioContext(): Promise<void> {
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate
    });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * 📊 PATRÓN: Voice Activity Detection Setup Pattern
   * Inicializar detección de actividad de voz
   */
  private async initializeVAD(stream: MediaStream): Promise<void> {
    if (!this.audioContext) return;

    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.microphone.connect(this.analyser);

    // Iniciar monitoreo de VAD
    this.startVADMonitoring();
  }

  /**
   * 📊 PATRÓN: Voice Activity Monitoring Pattern
   * Monitorear actividad de voz
   */
  private startVADMonitoring(): void {
    const checkVAD = () => {
      if (!this.isListening) return;

      const activity = this.getVoiceActivity();
      
      if (activity.isActive) {
        // Voz detectada - cancelar timeout de silencio
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
        
        this.emitEvent('voice.activity.detected', activity);
      } else {
        // Silencio detectado - iniciar timeout si no existe
        if (!this.silenceTimeout) {
          this.silenceTimeout = setTimeout(() => {
            this.emitEvent('voice.silence.detected', {
              duration: this.config.silenceThreshold,
              timestamp: Date.now()
            });
            
            // Auto-stop si está configurado
            if (this.config.autoStopOnSilence) {
              this.stopListening();
            }
          }, this.config.silenceThreshold);
        }
      }

      // Continuar monitoreo
      requestAnimationFrame(checkVAD);
    };

    checkVAD();
  }

  /**
   * 🧹 PATRÓN: VAD Cleanup Pattern
   * Limpiar recursos de VAD
   */
  private cleanupVAD(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }

  /**
   * 🎙️ PATRÓN: MediaRecorder Setup Pattern
   * Configurar eventos de MediaRecorder
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.emitEvent('voice.data.available', {
          audioBlob: event.data,
          size: event.data.size,
          timestamp: Date.now()
        });
      }
    };

    this.mediaRecorder.onstop = () => {
      this.emitEvent('voice.recording.stopped', {
        timestamp: Date.now()
      });
    };

    this.mediaRecorder.onerror = (event) => {
      this.emitEvent('voice.error', {
        error: event.error,
        timestamp: Date.now()
      });
    };
  }

  /**
   * 🎵 PATRÓN: MIME Type Detection Pattern
   * Obtener MIME type soportado
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * 🧹 PATRÓN: Text Cleaning Pattern
   * Limpiar transcript de voz
   */
  private cleanTranscript(transcript: string): string {
    return transcript
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remover puntuación
      .replace(/\s+/g, ' '); // Normalizar espacios
  }

  /**
   * 🎯 PATRÓN: Intent Detection Pattern
   * Detectar intención del comando
   */
  private detectIntent(transcript: string, agentType: AgentType): VoiceIntent {
    const intents = this.getIntentsForAgent(agentType);
    
    let bestMatch: VoiceIntent = {
      name: 'unknown',
      confidence: 0,
      keywords: []
    };

    for (const intent of intents) {
      const matches = intent.keywords.filter(keyword => 
        transcript.includes(keyword.toLowerCase())
      );
      
      if (matches.length > 0) {
        const confidence = matches.length / intent.keywords.length;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            ...intent,
            confidence
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * 🤖 PATRÓN: Agent-Specific Intents Pattern
   * Obtener intenciones por agente
   */
  private getIntentsForAgent(agentType: AgentType): VoiceIntent[] {
    const commonIntents: VoiceIntent[] = [
      {
        name: 'greeting',
        confidence: 0,
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon']
      },
      {
        name: 'help',
        confidence: 0,
        keywords: ['help', 'assist', 'support', 'what can you do']
      }
    ];

    switch (agentType.getValue()) {
      case 'sales':
        return [
          ...commonIntents,
          {
            name: 'order_item',
            confidence: 0,
            keywords: ['order', 'add', 'want', 'get', 'buy', 'purchase']
          },
          {
            name: 'show_menu',
            confidence: 0,
            keywords: ['menu', 'show', 'display', 'what do you have', 'options']
          },
          {
            name: 'focus_item',
            confidence: 0,
            keywords: ['focus', 'show me', 'look at', 'highlight']
          }
        ];

      case 'payment':
        return [
          ...commonIntents,
          {
            name: 'process_payment',
            confidence: 0,
            keywords: ['pay', 'payment', 'checkout', 'complete order']
          },
          {
            name: 'update_info',
            confidence: 0,
            keywords: ['update', 'change', 'modify', 'edit']
          }
        ];

      default:
        return commonIntents;
    }
  }

  /**
   * 🔍 PATRÓN: Entity Extraction Pattern
   * Extraer entidades del comando
   */
  private extractEntities(transcript: string): VoiceEntity[] {
    const entities: VoiceEntity[] = [];

    // Extraer números
    const numbers = transcript.match(/\b\d+\b/g);
    if (numbers) {
      numbers.forEach(num => {
        entities.push({
          type: 'number',
          value: parseInt(num),
          confidence: 0.9
        });
      });
    }

    // Extraer items de menú (simplificado)
    const menuItems = ['pizza', 'burger', 'salad', 'pasta', 'drink', 'dessert'];
    menuItems.forEach(item => {
      if (transcript.includes(item)) {
        entities.push({
          type: 'menu_item',
          value: item,
          confidence: 0.8
        });
      }
    });

    return entities;
  }

  /**
   * ✅ PATRÓN: Command Validation Pattern
   * Validar comando para agente específico
   */
  private validateCommandForAgent(
    intent: VoiceIntent, 
    entities: VoiceEntity[], 
    agentType: AgentType
  ): CommandValidation {
    // Validaciones básicas
    if (intent.confidence < 0.3) {
      return {
        isValid: false,
        error: 'Command intent not clear enough'
      };
    }

    // Validaciones específicas por agente
    switch (agentType.getValue()) {
      case 'sales':
        if (intent.name === 'process_payment') {
          return {
            isValid: false,
            error: 'Sales agent cannot process payments'
          };
        }
        break;

      case 'payment':
        if (intent.name === 'order_item') {
          return {
            isValid: false,
            error: 'Payment agent cannot add items to order'
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * 📡 PATRÓN: Event Emission Pattern
   * Emitir evento a listeners
   */
  private emitEvent(eventType: string, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in voice event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para Voice Service
 */
export interface VoiceServiceConfig {
  sampleRate?: number;
  channels?: number;
  vadEnabled?: boolean;
  silenceThreshold?: number;
  maxRecordingTime?: number;
  enableNoiseSuppression?: boolean;
  enableEchoCancellation?: boolean;
  autoStopOnSilence?: boolean;
}

export interface VoiceInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VoiceListeningResult {
  success: boolean;
  isListening?: boolean;
  vadEnabled?: boolean;
  error?: string;
}

export interface VoiceStopResult {
  success: boolean;
  isListening?: boolean;
  error?: string;
}

export interface VoiceActivityData {
  isActive: boolean;
  volume: number;
  confidence: number;
  timestamp?: number;
}

export interface VoiceIntent {
  name: string;
  confidence: number;
  keywords: string[];
}

export interface VoiceEntity {
  type: string;
  value: string | number;
  confidence: number;
}

export interface VoiceCommandResult {
  success: boolean;
  transcript?: string;
  intent?: VoiceIntent;
  entities?: VoiceEntity[];
  confidence?: number;
  error?: string;
}

export interface CommandValidation {
  isValid: boolean;
  error?: string;
}
