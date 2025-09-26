/**
 * 🏗️ PATRÓN: Adapter Pattern + Peer Connection Management
 * 🎯 PRINCIPIO: WebRTC Peer Connection + Advanced Connection Handling
 * 
 * PeerConnectionAdapter - Adaptador para gestión avanzada de conexiones peer
 * Maneja conexiones WebRTC con funcionalidades avanzadas y recuperación automática
 */

/**
 * 🎯 PATRÓN: Peer Connection Adapter Pattern
 * PeerConnectionAdapter gestiona conexiones WebRTC con funcionalidades avanzadas
 */
export class PeerConnectionAdapter {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  
  private connectionState: PeerConnectionState = 'new';
  private iceGatheringState: RTCIceGatheringState = 'new';
  private signalingState: RTCSignalingState = 'stable';
  
  private iceCandidates: RTCIceCandidate[] = [];
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statsCollectionTimer: NodeJS.Timeout | null = null;
  
  private isInitialized = false;
  private isConnecting = false;
  private lastStatsReport: RTCStatsReport | null = null;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración avanzada
   */
  constructor(private readonly config: PeerConnectionConfig = {}) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      enableAutoReconnect: true,
      reconnectDelay: 5000,
      statsCollectionInterval: 1000,
      connectionTimeout: 30000,
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar adaptador de peer connection
   */
  public async initialize(): Promise<PeerConnectionInitResult> {
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
        iceServers: this.config.iceServers,
        iceCandidatePoolSize: this.config.iceCandidatePoolSize,
        bundlePolicy: this.config.bundlePolicy,
        rtcpMuxPolicy: this.config.rtcpMuxPolicy
      });

      // 3. Configurar event listeners
      this.setupPeerConnectionListeners();

      // 4. Iniciar recolección de estadísticas
      if (this.config.statsCollectionInterval) {
        this.startStatsCollection();
      }

      this.isInitialized = true;
      this.connectionState = 'initialized';

      this.emitEvent('peer.initialized', {
        configuration: this.peerConnection.getConfiguration(),
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Peer connection adapter initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize peer connection adapter'
      };
    }
  }

  /**
   * 🤝 PATRÓN: Connection Establishment Pattern
   * Crear oferta de conexión
   */
  public async createOffer(options?: RTCOfferOptions): Promise<OfferCreationResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      this.isConnecting = true;
      this.connectionState = 'connecting';

      // Configurar opciones por defecto
      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        iceRestart: false,
        ...options
      };

      // Crear oferta
      const offer = await this.peerConnection.createOffer(offerOptions);
      
      // Establecer descripción local
      await this.peerConnection.setLocalDescription(offer);

      this.emitEvent('offer.created', {
        offer,
        options: offerOptions,
        timestamp: Date.now()
      });

      return {
        success: true,
        offer,
        localDescription: this.peerConnection.localDescription
      };

    } catch (error) {
      this.isConnecting = false;
      this.connectionState = 'failed';
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create offer'
      };
    }
  }

  /**
   * 🤝 PATRÓN: Connection Establishment Pattern
   * Crear respuesta de conexión
   */
  public async createAnswer(options?: RTCAnswerOptions): Promise<AnswerCreationResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      // Crear respuesta
      const answer = await this.peerConnection.createAnswer(options);
      
      // Establecer descripción local
      await this.peerConnection.setLocalDescription(answer);

      this.emitEvent('answer.created', {
        answer,
        options,
        timestamp: Date.now()
      });

      return {
        success: true,
        answer,
        localDescription: this.peerConnection.localDescription
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create answer'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Session Description Pattern
   * Establecer descripción remota
   */
  public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<DescriptionResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      await this.peerConnection.setRemoteDescription(description);

      // Agregar candidatos ICE pendientes
      await this.addPendingIceCandidates();

      this.emitEvent('remote.description.set', {
        description,
        signalingState: this.peerConnection.signalingState,
        timestamp: Date.now()
      });

      return {
        success: true,
        remoteDescription: this.peerConnection.remoteDescription,
        signalingState: this.peerConnection.signalingState
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set remote description'
      };
    }
  }

  /**
   * 🧊 PATRÓN: ICE Candidate Management Pattern
   * Agregar candidato ICE
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<IceCandidateResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      // Si no hay descripción remota, guardar candidato para más tarde
      if (!this.peerConnection.remoteDescription) {
        this.iceCandidates.push(new RTCIceCandidate(candidate));
        return {
          success: true,
          queued: true,
          queueSize: this.iceCandidates.length
        };
      }

      // Agregar candidato inmediatamente
      await this.peerConnection.addIceCandidate(candidate);

      this.emitEvent('ice.candidate.added', {
        candidate,
        timestamp: Date.now()
      });

      return {
        success: true,
        queued: false
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add ICE candidate'
      };
    }
  }

  /**
   * 📡 PATRÓN: Data Channel Management Pattern
   * Crear canal de datos
   */
  public createDataChannel(label: string, options?: RTCDataChannelInit): DataChannelCreationResult {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      const dataChannel = this.peerConnection.createDataChannel(label, {
        ordered: true,
        maxRetransmits: 3,
        ...options
      });

      // Configurar event listeners del canal
      this.setupDataChannelListeners(dataChannel, label);

      // Guardar referencia
      this.dataChannels.set(label, dataChannel);

      this.emitEvent('data.channel.created', {
        label,
        options,
        readyState: dataChannel.readyState,
        timestamp: Date.now()
      });

      return {
        success: true,
        dataChannel,
        label
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create data channel'
      };
    }
  }

  /**
   * 📤 PATRÓN: Data Transmission Pattern
   * Enviar datos por canal específico
   */
  public sendData(channelLabel: string, data: string | ArrayBuffer | Blob): DataSendResult {
    try {
      const dataChannel = this.dataChannels.get(channelLabel);
      
      if (!dataChannel) {
        return {
          success: false,
          error: `Data channel '${channelLabel}' not found`
        };
      }

      if (dataChannel.readyState !== 'open') {
        return {
          success: false,
          error: `Data channel '${channelLabel}' is not open (state: ${dataChannel.readyState})`
        };
      }

      // Enviar datos usando el overload correcto de RTCDataChannel.send()
      let bytesSent: number;

      if (typeof data === 'string') {
        dataChannel.send(data);
        bytesSent = new TextEncoder().encode(data).length;
      } else if (data instanceof Blob) {
        dataChannel.send(data);
        bytesSent = data.size;
      } else if (data instanceof ArrayBuffer) {
        dataChannel.send(data);
        bytesSent = data.byteLength;
      } else {
        // Fallback: convertir a string
        const stringData = String(data);
        dataChannel.send(stringData);
        bytesSent = new TextEncoder().encode(stringData).length;
      }

      this.emitEvent('data.sent', {
        channelLabel,
        bytesSent,
        dataType: typeof data,
        timestamp: Date.now()
      });

      return {
        success: true,
        bytesSent,
        channelLabel
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send data'
      };
    }
  }

  /**
   * 🎵 PATRÓN: Media Stream Management Pattern
   * Agregar stream local
   */
  public async addLocalStream(stream: MediaStream): Promise<StreamAddResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      this.localStream = stream;

      // Agregar tracks al peer connection
      const senders: RTCRtpSender[] = [];
      for (const track of stream.getTracks()) {
        const sender = this.peerConnection.addTrack(track, stream);
        senders.push(sender);
      }

      this.emitEvent('local.stream.added', {
        streamId: stream.id,
        trackCount: stream.getTracks().length,
        senders: senders.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        stream,
        senders,
        trackCount: stream.getTracks().length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add local stream'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Auto Reconnection Pattern
   * Reconectar automáticamente
   */
  public async reconnect(): Promise<ReconnectionResult> {
    try {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        return {
          success: false,
          error: `Maximum reconnection attempts (${this.maxConnectionAttempts}) exceeded`
        };
      }

      this.connectionAttempts++;
      this.connectionState = 'reconnecting';

      this.emitEvent('reconnection.started', {
        attempt: this.connectionAttempts,
        maxAttempts: this.maxConnectionAttempts,
        timestamp: Date.now()
      });

      // Limpiar conexión anterior
      await this.cleanup(false);

      // Reinicializar
      const initResult = await this.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error);
      }

      // Reiniciar ICE
      if (this.peerConnection) {
        await this.restartIce();
      }

      return {
        success: true,
        attempt: this.connectionAttempts,
        connectionState: this.connectionState
      };

    } catch (error) {
      this.scheduleReconnection();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reconnection failed',
        attempt: this.connectionAttempts
      };
    }
  }

  /**
   * 🧊 PATRÓN: ICE Restart Pattern
   * Reiniciar proceso ICE
   */
  public async restartIce(): Promise<IceRestartResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      // Crear nueva oferta con ICE restart
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      this.emitEvent('ice.restart.initiated', {
        offer,
        timestamp: Date.now()
      });

      return {
        success: true,
        offer,
        iceGatheringState: this.peerConnection.iceGatheringState
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restart ICE'
      };
    }
  }

  /**
   * 📊 PATRÓN: Statistics Collection Pattern
   * Obtener estadísticas detalladas
   */
  public async getDetailedStats(): Promise<DetailedStatsResult> {
    try {
      if (!this.peerConnection) {
        return {
          success: false,
          error: 'Peer connection not initialized'
        };
      }

      const stats = await this.peerConnection.getStats();
      this.lastStatsReport = stats;

      const processedStats = this.processStatsReport(stats);

      return {
        success: true,
        stats: processedStats,
        rawStats: stats,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      };
    }
  }

  /**
   * 🔍 PATRÓN: Connection Quality Analysis Pattern
   * Analizar calidad de conexión
   */
  public async analyzeConnectionQuality(): Promise<ConnectionQualityResult> {
    const statsResult = await this.getDetailedStats();
    
    if (!statsResult.success) {
      return {
        success: false,
        error: statsResult.error
      };
    }

    const quality = this.calculateConnectionQuality(statsResult.stats!);

    return {
      success: true,
      quality,
      recommendations: this.generateQualityRecommendations(quality),
      timestamp: Date.now()
    };
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
   * Limpiar recursos de peer connection
   */
  public async cleanup(resetAttempts = true): Promise<void> {
    try {
      // Limpiar timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.statsCollectionTimer) {
        clearInterval(this.statsCollectionTimer);
        this.statsCollectionTimer = null;
      }

      // Cerrar data channels
      for (const [, channel] of this.dataChannels.entries()) {
        if (channel.readyState === 'open') {
          channel.close();
        }
      }
      this.dataChannels.clear();

      // Detener streams locales
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Cerrar peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Reset estado
      this.connectionState = 'closed';
      this.isInitialized = false;
      this.isConnecting = false;
      
      if (resetAttempts) {
        this.connectionAttempts = 0;
      }

      // Limpiar candidatos pendientes
      this.iceCandidates = [];

      // Limpiar event listeners
      this.eventListeners.clear();

      this.emitEvent('peer.cleanup.completed', {
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error during peer connection cleanup:', error);
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

    if (!window.RTCSessionDescription) {
      missing.push('RTCSessionDescription');
    }

    if (!window.RTCIceCandidate) {
      missing.push('RTCIceCandidate');
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

    // Estado de conexión ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection!.iceConnectionState;
      this.connectionState = this.mapIceStateToConnectionState(state);
      
      this.emitEvent('ice.connection.state.changed', {
        state,
        connectionState: this.connectionState,
        timestamp: Date.now()
      });

      // Manejar reconexión automática
      if (this.config.enableAutoReconnect && 
          (state === 'failed' || state === 'disconnected')) {
        this.scheduleReconnection();
      }
    };

    // Estado de gathering ICE
    this.peerConnection.onicegatheringstatechange = () => {
      this.iceGatheringState = this.peerConnection!.iceGatheringState;
      
      this.emitEvent('ice.gathering.state.changed', {
        state: this.iceGatheringState,
        timestamp: Date.now()
      });
    };

    // Estado de signaling
    this.peerConnection.onsignalingstatechange = () => {
      this.signalingState = this.peerConnection!.signalingState;
      
      this.emitEvent('signaling.state.changed', {
        state: this.signalingState,
        timestamp: Date.now()
      });
    };

    // Candidatos ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emitEvent('ice.candidate.generated', {
          candidate: event.candidate,
          timestamp: Date.now()
        });
      } else {
        this.emitEvent('ice.gathering.completed', {
          timestamp: Date.now()
        });
      }
    };

    // Tracks remotos
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      
      this.emitEvent('remote.track.received', {
        track: event.track,
        streams: event.streams.length,
        streamId: this.remoteStream?.id,
        timestamp: Date.now()
      });
    };

    // Data channels remotos
    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannelListeners(channel, channel.label);
      this.dataChannels.set(channel.label, channel);
      
      this.emitEvent('remote.data.channel.received', {
        label: channel.label,
        readyState: channel.readyState,
        timestamp: Date.now()
      });
    };

    // Errores de conexión
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection!.connectionState;
      
      this.emitEvent('connection.state.changed', {
        state,
        timestamp: Date.now()
      });

      if (state === 'connected') {
        this.connectionAttempts = 0; // Reset contador en conexión exitosa
        this.isConnecting = false;
      }
    };
  }

  /**
   * 📡 PATRÓN: Data Channel Setup Pattern
   * Configurar listeners del data channel
   */
  private setupDataChannelListeners(channel: RTCDataChannel, label: string): void {
    channel.onopen = () => {
      this.emitEvent('data.channel.opened', {
        label,
        readyState: channel.readyState,
        timestamp: Date.now()
      });
    };

    channel.onmessage = (event) => {
      this.emitEvent('data.received', {
        label,
        data: event.data,
        dataType: typeof event.data,
        timestamp: Date.now()
      });
    };

    channel.onclose = () => {
      this.emitEvent('data.channel.closed', {
        label,
        timestamp: Date.now()
      });
    };

    channel.onerror = (error) => {
      this.emitEvent('data.channel.error', {
        label,
        error,
        timestamp: Date.now()
      });
    };
  }

  /**
   * 🧊 PATRÓN: ICE Candidate Processing Pattern
   * Agregar candidatos ICE pendientes
   */
  private async addPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || this.iceCandidates.length === 0) return;

    for (const candidate of this.iceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (error) {
        console.warn('Failed to add pending ICE candidate:', error);
      }
    }

    this.iceCandidates = [];
  }

  /**
   * 🔄 PATRÓN: State Mapping Pattern
   * Mapear estado ICE a estado de conexión
   */
  private mapIceStateToConnectionState(iceState: RTCIceConnectionState): PeerConnectionState {
    switch (iceState) {
      case 'new':
        return 'new';
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
        return 'new';
    }
  }

  /**
   * ⏰ PATRÓN: Scheduled Reconnection Pattern
   * Programar reconexión automática
   */
  private scheduleReconnection(): void {
    if (!this.config.enableAutoReconnect || this.reconnectTimer) return;

    const delay = this.config.reconnectDelay || 5000;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.reconnect();
    }, delay);

    this.emitEvent('reconnection.scheduled', {
      delay,
      attempt: this.connectionAttempts + 1,
      timestamp: Date.now()
    });
  }

  /**
   * 📊 PATRÓN: Stats Collection Pattern
   * Iniciar recolección de estadísticas
   */
  private startStatsCollection(): void {
    if (this.statsCollectionTimer) return;

    this.statsCollectionTimer = setInterval(async () => {
      const statsResult = await this.getDetailedStats();
      if (statsResult.success) {
        this.emitEvent('stats.collected', {
          stats: statsResult.stats,
          timestamp: Date.now()
        });
      }
    }, this.config.statsCollectionInterval);
  }

  /**
   * 📊 PATRÓN: Stats Processing Pattern
   * Procesar reporte de estadísticas
   */
  private processStatsReport(stats: RTCStatsReport): ProcessedStats {
    const processed: ProcessedStats = {
      connection: {
        state: this.connectionState,
        iceState: this.peerConnection?.iceConnectionState || 'new',
        signalingState: this.peerConnection?.signalingState || 'stable'
      },
      audio: {
        inbound: [],
        outbound: []
      },
      candidates: {
        local: [],
        remote: []
      },
      dataChannels: []
    };

    stats.forEach((report) => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.mediaType === 'audio') {
            processed.audio.inbound.push({
              ssrc: report.ssrc,
              bytesReceived: report.bytesReceived || 0,
              packetsReceived: report.packetsReceived || 0,
              packetsLost: report.packetsLost || 0,
              jitter: report.jitter || 0,
              audioLevel: report.audioLevel || 0
            });
          }
          break;

        case 'outbound-rtp':
          if (report.mediaType === 'audio') {
            processed.audio.outbound.push({
              ssrc: report.ssrc,
              bytesSent: report.bytesSent || 0,
              packetsSent: report.packetsSent || 0,
              audioLevel: report.audioLevel || 0
            });
          }
          break;

        case 'local-candidate':
          processed.candidates.local.push({
            id: report.id,
            candidateType: report.candidateType || 'unknown',
            protocol: report.protocol || 'unknown',
            address: report.address || 'unknown',
            port: report.port || 0
          });
          break;

        case 'remote-candidate':
          processed.candidates.remote.push({
            id: report.id,
            candidateType: report.candidateType || 'unknown',
            protocol: report.protocol || 'unknown',
            address: report.address || 'unknown',
            port: report.port || 0
          });
          break;

        case 'data-channel':
          processed.dataChannels.push({
            id: report.id,
            label: report.label || 'unknown',
            protocol: report.protocol || 'unknown',
            state: report.state || 'unknown',
            messagesSent: report.messagesSent || 0,
            messagesReceived: report.messagesReceived || 0,
            bytesSent: report.bytesSent || 0,
            bytesReceived: report.bytesReceived || 0
          });
          break;
      }
    });

    return processed;
  }

  /**
   * 📊 PATRÓN: Quality Analysis Pattern
   * Calcular calidad de conexión
   */
  private calculateConnectionQuality(stats: ProcessedStats): ConnectionQuality {
    let score = 100;
    const issues: string[] = [];

    // Analizar pérdida de paquetes
    const inboundAudio = stats.audio.inbound[0];
    if (inboundAudio) {
      const packetLossRate = inboundAudio.packetsLost / 
        (inboundAudio.packetsReceived + inboundAudio.packetsLost);
      
      if (packetLossRate > 0.05) {
        score -= 30;
        issues.push('High packet loss');
      } else if (packetLossRate > 0.02) {
        score -= 15;
        issues.push('Moderate packet loss');
      }

      // Analizar jitter
      if (inboundAudio.jitter > 0.1) {
        score -= 20;
        issues.push('High jitter');
      } else if (inboundAudio.jitter > 0.05) {
        score -= 10;
        issues.push('Moderate jitter');
      }
    }

    // Analizar estado de conexión
    if (stats.connection.iceState === 'disconnected') {
      score -= 50;
      issues.push('Connection unstable');
    } else if (stats.connection.iceState === 'checking') {
      score -= 20;
      issues.push('Connection establishing');
    }

    return {
      score: Math.max(0, score),
      rating: this.getQualityRating(score),
      issues,
      packetLossRate: inboundAudio ? 
        inboundAudio.packetsLost / (inboundAudio.packetsReceived + inboundAudio.packetsLost) : 0,
      jitter: inboundAudio?.jitter || 0,
      audioLevel: inboundAudio?.audioLevel || 0
    };
  }

  /**
   * 📊 PATRÓN: Quality Rating Pattern
   * Obtener rating de calidad
   */
  private getQualityRating(score: number): QualityRating {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'critical';
  }

  /**
   * 💡 PATRÓN: Recommendation Engine Pattern
   * Generar recomendaciones de calidad
   */
  private generateQualityRecommendations(quality: ConnectionQuality): string[] {
    const recommendations: string[] = [];

    if (quality.packetLossRate > 0.02) {
      recommendations.push('Check network stability');
      recommendations.push('Consider switching to a wired connection');
    }

    if (quality.jitter > 0.05) {
      recommendations.push('Reduce network congestion');
      recommendations.push('Close bandwidth-intensive applications');
    }

    if (quality.score < 40) {
      recommendations.push('Restart the connection');
      recommendations.push('Check firewall settings');
    }

    if (quality.audioLevel < 0.1) {
      recommendations.push('Check microphone settings');
      recommendations.push('Increase microphone volume');
    }

    return recommendations;
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
 * Tipos específicos para peer connection management
 */
export interface PeerConnectionConfig {
  iceServers?: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
  enableAutoReconnect?: boolean;
  reconnectDelay?: number;
  statsCollectionInterval?: number;
  connectionTimeout?: number;
}

export interface PeerConnectionInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface OfferCreationResult {
  success: boolean;
  offer?: RTCSessionDescriptionInit;
  localDescription?: RTCSessionDescription | null;
  error?: string;
}

export interface AnswerCreationResult {
  success: boolean;
  answer?: RTCSessionDescriptionInit;
  localDescription?: RTCSessionDescription | null;
  error?: string;
}

export interface DescriptionResult {
  success: boolean;
  remoteDescription?: RTCSessionDescription | null;
  signalingState?: RTCSignalingState;
  error?: string;
}

export interface IceCandidateResult {
  success: boolean;
  queued?: boolean;
  queueSize?: number;
  error?: string;
}

export interface DataChannelCreationResult {
  success: boolean;
  dataChannel?: RTCDataChannel;
  label?: string;
  error?: string;
}

export interface DataSendResult {
  success: boolean;
  bytesSent?: number;
  channelLabel?: string;
  error?: string;
}

export interface StreamAddResult {
  success: boolean;
  stream?: MediaStream;
  senders?: RTCRtpSender[];
  trackCount?: number;
  error?: string;
}

export interface ReconnectionResult {
  success: boolean;
  attempt?: number;
  connectionState?: PeerConnectionState;
  error?: string;
}

export interface IceRestartResult {
  success: boolean;
  offer?: RTCSessionDescriptionInit;
  iceGatheringState?: RTCIceGatheringState;
  error?: string;
}

export interface DetailedStatsResult {
  success: boolean;
  stats?: ProcessedStats;
  rawStats?: RTCStatsReport;
  timestamp?: number;
  error?: string;
}

export interface ConnectionQualityResult {
  success: boolean;
  quality?: ConnectionQuality;
  recommendations?: string[];
  timestamp?: number;
  error?: string;
}

export interface ProcessedStats {
  connection: {
    state: PeerConnectionState;
    iceState: RTCIceConnectionState;
    signalingState: RTCSignalingState;
  };
  audio: {
    inbound: Array<{
      ssrc: number;
      bytesReceived: number;
      packetsReceived: number;
      packetsLost: number;
      jitter: number;
      audioLevel: number;
    }>;
    outbound: Array<{
      ssrc: number;
      bytesSent: number;
      packetsSent: number;
      audioLevel: number;
    }>;
  };
  candidates: {
    local: Array<{
      id: string;
      candidateType: string;
      protocol: string;
      address: string;
      port: number;
    }>;
    remote: Array<{
      id: string;
      candidateType: string;
      protocol: string;
      address: string;
      port: number;
    }>;
  };
  dataChannels: Array<{
    id: string;
    label: string;
    protocol: string;
    state: string;
    messagesSent: number;
    messagesReceived: number;
    bytesSent: number;
    bytesReceived: number;
  }>;
}

export interface ConnectionQuality {
  score: number;
  rating: QualityRating;
  issues: string[];
  packetLossRate: number;
  jitter: number;
  audioLevel: number;
}

export interface WebRTCSupportResult {
  isSupported: boolean;
  error?: string;
}

export type PeerConnectionState = 
  | 'new' 
  | 'initialized' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'disconnected' 
  | 'failed' 
  | 'closed';

export type QualityRating = 
  | 'excellent' 
  | 'good' 
  | 'fair' 
  | 'poor' 
  | 'critical';
