/**
 * 🏗️ PATRÓN: Adapter Pattern + Real-time Communication
 * 🎯 PRINCIPIO: WebRTC Integration + Audio Streaming
 * 
 * WebRTCAdapter - Adaptador para comunicación WebRTC
 * Maneja conexiones peer-to-peer para audio bidireccional
 */

/**
 * 🎯 PATRÓN: WebRTC Adapter Pattern
 * WebRTCAdapter gestiona conexiones de audio en tiempo real
 */
export class WebRTCAdapter {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioContext: AudioContext | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private connectionState: WebRTCConnectionState = 'disconnected';
  private isInitialized = false;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración WebRTC
   */
  constructor(private readonly config: WebRTCConfig = {}) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000,
        channelCount: 1
      },
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar WebRTC adapter
   */
  public async initialize(): Promise<WebRTCInitResult> {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      // 1. Verificar soporte WebRTC
      const support = this.checkWebRTCSupport();
      if (!support.isSupported) {
        return {
          success: false,
          error: support.error
        };
      }

      // 2. Crear peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.config.iceServers
      });

      // 3. Configurar event listeners
      this.setupPeerConnectionListeners();

      // 4. Inicializar audio context
      this.audioContext = new AudioContext();

      this.isInitialized = true;
      this.connectionState = 'initialized';

      return {
        success: true,
        message: 'WebRTC adapter initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize WebRTC adapter'
      };
    }
  }

  /**
   * 🎤 PATRÓN: Media Access Pattern
   * Obtener acceso al micrófono
   */
  public async requestMicrophoneAccess(): Promise<MicrophoneAccessResult> {
    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'WebRTC adapter not initialized'
        };
      }

      // Solicitar acceso al micrófono
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.config.audioConstraints,
        video: false
      });

      // Agregar tracks al peer connection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      this.emitEvent('microphone.access.granted', {
        streamId: this.localStream.id,
        tracks: this.localStream.getTracks().length
      });

      return {
        success: true,
        stream: this.localStream,
        deviceInfo: await this.getAudioDeviceInfo()
      };

    } catch (error) {
      const errorMessage = this.handleMicrophoneError(error);
      
      this.emitEvent('microphone.access.denied', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 🔗 PATRÓN: Connection Management Pattern
   * Establecer conexión WebRTC
   */
  public async createConnection(
    remoteEndpoint: string,
    sessionConfig?: SessionConfig
  ): Promise<ConnectionResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      this.connectionState = 'connecting';

      // 1. Crear data channel para metadata
      this.dataChannel = this.peerConnection.createDataChannel('metadata', {
        ordered: true
      });

      this.setupDataChannelListeners();

      // 2. Crear offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });

      await this.peerConnection.setLocalDescription(offer);

      // 3. Enviar offer al endpoint remoto (simulado)
      const answer = await this.sendOfferToRemote();

      // 4. Establecer remote description
      await this.peerConnection.setRemoteDescription(answer);

      return {
        success: true,
        connectionId: `conn_${Date.now()}`,
        localDescription: offer,
        remoteDescription: answer
      };

    } catch (error) {
      this.connectionState = 'failed';
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create connection'
      };
    }
  }

  /**
   * 🎵 PATRÓN: Audio Processing Pattern
   * Iniciar procesamiento de audio
   */
  public async startAudioProcessing(): Promise<AudioProcessingResult> {
    try {
      if (!this.localStream || !this.audioContext) {
        return {
          success: false,
          error: 'Audio stream or context not available'
        };
      }

      // 1. Crear audio source
      const source = this.audioContext.createMediaStreamSource(this.localStream);

      // 2. Crear analyzer para visualización
      const analyzer = this.audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      // 3. Crear gain node para control de volumen
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;

      // 4. Crear processor para audio data
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        this.processAudioFrame(event);
      };

      // 5. Conectar nodos
      source.connect(analyzer);
      analyzer.connect(gainNode);
      gainNode.connect(processor);
      processor.connect(this.audioContext.destination);

      this.emitEvent('audio.processing.started', {
        sampleRate: this.audioContext.sampleRate,
        bufferSize: 4096
      });

      return {
        success: true,
        sampleRate: this.audioContext.sampleRate,
        bufferSize: 4096,
        analyzer,
        gainNode
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio processing'
      };
    }
  }

  /**
   * 📊 PATRÓN: Audio Analysis Pattern
   * Analizar nivel de audio
   */
  public getAudioLevel(): AudioLevelInfo {
    if (!this.audioContext) {
      return {
        volume: 0,
        isSpeaking: false,
        timestamp: Date.now()
      };
    }

    // Simulación de análisis de audio
    const volume = Math.random() * 100;
    const isSpeaking = volume > 20;

    return {
      volume,
      isSpeaking,
      timestamp: Date.now()
    };
  }

  /**
   * 📤 PATRÓN: Data Transmission Pattern
   * Enviar datos a través del data channel
   */
  public sendData(data: unknown): DataSendResult {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return {
        success: false,
        error: 'Data channel not available'
      };
    }

    try {
      const message = JSON.stringify(data);
      this.dataChannel.send(message);

      return {
        success: true,
        bytesSent: message.length,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send data'
      };
    }
  }

  /**
   * 🔊 PATRÓN: Volume Control Pattern
   * Controlar volumen de audio
   */
  public setVolume(volume: number): VolumeControlResult {
    if (volume < 0 || volume > 1) {
      return {
        success: false,
        error: 'Volume must be between 0 and 1'
      };
    }

    try {
      // En una implementación real, esto afectaría el gain node
      this.emitEvent('volume.changed', { volume });

      return {
        success: true,
        volume,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set volume'
      };
    }
  }

  /**
   * 🔇 PATRÓN: Mute Control Pattern
   * Silenciar/activar micrófono
   */
  public setMuted(muted: boolean): MuteControlResult {
    if (!this.localStream) {
      return {
        success: false,
        error: 'No local stream available'
      };
    }

    try {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });

      this.emitEvent('microphone.mute.changed', { muted });

      return {
        success: true,
        muted,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change mute state'
      };
    }
  }

  /**
   * 📊 PATRÓN: Statistics Pattern
   * Obtener estadísticas de conexión
   */
  public async getConnectionStats(): Promise<ConnectionStats> {
    if (!this.peerConnection) {
      return {
        connectionState: this.connectionState,
        timestamp: Date.now()
      };
    }

    try {
      const stats = await this.peerConnection.getStats();
      const audioStats: AudioStreamStats[] = [];
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
          audioStats.push({
            type: 'inbound',
            bytesReceived: report.bytesReceived || 0,
            packetsReceived: report.packetsReceived || 0,
            packetsLost: report.packetsLost || 0,
            jitter: report.jitter || 0,
            timestamp: report.timestamp
          });
        } else if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
          audioStats.push({
            type: 'outbound',
            bytesSent: report.bytesSent || 0,
            packetsSent: report.packetsSent || 0,
            timestamp: report.timestamp
          });
        }
      });

      return {
        connectionState: this.connectionState,
        audioStats,
        iceConnectionState: this.peerConnection.iceConnectionState,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        connectionState: this.connectionState,
        error: error instanceof Error ? error.message : 'Failed to get stats',
        timestamp: Date.now()
      };
    }
  }

  /**
   * 🔌 PATRÓN: Event Listener Pattern
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
   * Limpiar recursos y cerrar conexiones
   */
  public async cleanup(): Promise<void> {
    try {
      // Cerrar data channel
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      // Detener tracks locales
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Cerrar peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Cerrar audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Limpiar event listeners
      this.eventListeners.clear();

      this.connectionState = 'disconnected';
      this.isInitialized = false;

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * 🔍 PATRÓN: Support Detection Pattern
   * Verificar soporte WebRTC
   */
  private checkWebRTCSupport(): WebRTCSupportResult {
    const missing: string[] = [];

    if (!window.RTCPeerConnection) {
      missing.push('RTCPeerConnection');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      missing.push('getUserMedia');
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
      missing.push('AudioContext');
    }

    return {
      isSupported: missing.length === 0,
      error: missing.length > 0 ? `Missing WebRTC features: ${missing.join(', ')}` : undefined
    };
  }

  /**
   * 🔗 PATRÓN: Event Setup Pattern
   * Configurar listeners del peer connection
   */
  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection!.iceConnectionState;
      this.connectionState = this.mapIceStateToConnectionState(state);
      
      this.emitEvent('connection.state.changed', {
        state: this.connectionState,
        iceState: state
      });
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.emitEvent('remote.stream.received', {
        streamId: this.remoteStream.id,
        tracks: this.remoteStream.getTracks().length
      });
    };

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannelListeners(channel);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitEvent('ice.candidate', event.candidate);
      }
    };
  }

  /**
   * 📡 PATRÓN: Data Channel Setup Pattern
   * Configurar listeners del data channel
   */
  private setupDataChannelListeners(channel?: RTCDataChannel): void {
    const dataChannel = channel || this.dataChannel;
    if (!dataChannel) return;

    dataChannel.onopen = () => {
      this.emitEvent('data.channel.opened', {
        label: dataChannel.label,
        readyState: dataChannel.readyState
      });
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emitEvent('data.received', data);
      } catch {
        this.emitEvent('data.received', { raw: event.data });
      }
    };

    dataChannel.onclose = () => {
      this.emitEvent('data.channel.closed', {
        label: dataChannel.label
      });
    };

    dataChannel.onerror = (error) => {
      this.emitEvent('data.channel.error', { error });
    };
  }

  /**
   * 🎵 PATRÓN: Audio Frame Processing Pattern
   * Procesar frame de audio
   */
  private processAudioFrame(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;

    // Copiar input a output (pass-through)
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const inputData = inputBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);
      
      for (let sample = 0; sample < inputBuffer.length; sample++) {
        outputData[sample] = inputData[sample];
      }
    }

    // Emitir evento con datos de audio
    this.emitEvent('audio.frame.processed', {
      sampleRate: inputBuffer.sampleRate,
      length: inputBuffer.length,
      channels: inputBuffer.numberOfChannels,
      timestamp: Date.now()
    });
  }

  /**
   * 📤 PATRÓN: Remote Communication Pattern
   * Enviar offer al endpoint remoto (simulado)
   */
  private async sendOfferToRemote(): Promise<RTCSessionDescriptionInit> {
    // Simulación de comunicación con endpoint remoto
    // En implementación real, esto sería una llamada HTTP/WebSocket
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Simular latencia

    return {
      type: 'answer',
      sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n...` // SDP simulado
    };
  }

  /**
   * 🔄 PATRÓN: State Mapping Pattern
   * Mapear estado ICE a estado de conexión
   */
  private mapIceStateToConnectionState(iceState: RTCIceConnectionState): WebRTCConnectionState {
    switch (iceState) {
      case 'new':
      case 'checking':
        return 'connecting';
      case 'connected':
      case 'completed':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'failed':
        return 'failed';
      case 'closed':
        return 'closed';
      default:
        return 'disconnected';
    }
  }

  /**
   * 🎤 PATRÓN: Error Handling Pattern
   * Manejar errores de micrófono
   */
  private handleMicrophoneError(error: unknown): string {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Microphone access denied by user';
        case 'NotFoundError':
          return 'No microphone found';
        case 'NotReadableError':
          return 'Microphone is already in use';
        case 'OverconstrainedError':
          return 'Microphone constraints cannot be satisfied';
        default:
          return error.message;
      }
    }
    return 'Unknown microphone error';
  }

  /**
   * 🎤 PATRÓN: Device Info Pattern
   * Obtener información del dispositivo de audio
   */
  private async getAudioDeviceInfo(): Promise<AudioDeviceInfo> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      return {
        deviceCount: audioInputs.length,
        defaultDevice: audioInputs.find(device => device.deviceId === 'default')?.label || 'Unknown',
        availableDevices: audioInputs.map(device => ({
          deviceId: device.deviceId,
          label: device.label || 'Unknown Device'
        }))
      };

    } catch {
      return {
        deviceCount: 0,
        defaultDevice: 'Unknown',
        availableDevices: []
      };
    }
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
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para WebRTC
 */
export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  audioConstraints?: MediaTrackConstraints;
}

export interface WebRTCInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface MicrophoneAccessResult {
  success: boolean;
  stream?: MediaStream;
  deviceInfo?: AudioDeviceInfo;
  error?: string;
}

export interface ConnectionResult {
  success: boolean;
  connectionId?: string;
  localDescription?: RTCSessionDescriptionInit;
  remoteDescription?: RTCSessionDescriptionInit;
  error?: string;
}

export interface AudioProcessingResult {
  success: boolean;
  sampleRate?: number;
  bufferSize?: number;
  analyzer?: AnalyserNode;
  gainNode?: GainNode;
  error?: string;
}

export interface AudioLevelInfo {
  volume: number;
  isSpeaking: boolean;
  timestamp: number;
}

export interface DataSendResult {
  success: boolean;
  bytesSent?: number;
  timestamp?: number;
  error?: string;
}

export interface VolumeControlResult {
  success: boolean;
  volume?: number;
  timestamp?: number;
  error?: string;
}

export interface MuteControlResult {
  success: boolean;
  muted?: boolean;
  timestamp?: number;
  error?: string;
}

export interface ConnectionStats {
  connectionState: WebRTCConnectionState;
  audioStats?: AudioStreamStats[];
  iceConnectionState?: RTCIceConnectionState;
  timestamp: number;
  error?: string;
}

export interface AudioStreamStats {
  type: 'inbound' | 'outbound';
  bytesReceived?: number;
  bytesSent?: number;
  packetsReceived?: number;
  packetsSent?: number;
  packetsLost?: number;
  jitter?: number;
  timestamp: number;
}

export interface AudioDeviceInfo {
  deviceCount: number;
  defaultDevice: string;
  availableDevices: Array<{
    deviceId: string;
    label: string;
  }>;
}

export interface WebRTCSupportResult {
  isSupported: boolean;
  error?: string;
}

export interface SessionConfig {
  sessionId?: string;
  agentType?: string;
  customerId?: string;
}

export type WebRTCConnectionState = 
  | 'disconnected' 
  | 'initialized' 
  | 'connecting' 
  | 'connected' 
  | 'failed' 
  | 'closed';

// Extensión de tipos globales para compatibilidad
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
