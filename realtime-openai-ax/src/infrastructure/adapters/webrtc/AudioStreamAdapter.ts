/**
 * 🏗️ PATRÓN: Adapter Pattern + Audio Stream Management
 * 🎯 PRINCIPIO: Audio Processing + Real-time Stream Handling
 * 
 * AudioStreamAdapter - Adaptador especializado para manejo de streams de audio
 * Gestiona captura, procesamiento y transmisión de audio en tiempo real
 */

/**
 * 🎯 PATRÓN: Audio Stream Adapter Pattern
 * AudioStreamAdapter maneja streams de audio con procesamiento avanzado
 */
export class AudioStreamAdapter {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  
  private isRecording = false;
  private isProcessing = false;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private audioWorklet: AudioWorkletNode | null = null;
  private compressionNode: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de audio
   */
  constructor(private readonly config: AudioStreamConfig = {}) {
    this.config = {
      sampleRate: 24000,
      channelCount: 1,
      bufferSize: 4096,
      enableNoiseReduction: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true,
      compressionThreshold: -24,
      compressionRatio: 12,
      filterFrequency: 8000,
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar adaptador de audio
   */
  public async initialize(): Promise<AudioStreamInitResult> {
    try {
      // 1. Crear audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });

      // 2. Verificar soporte de audio
      const support = this.checkAudioSupport();
      if (!support.isSupported) {
        return {
          success: false,
          error: support.error
        };
      }

      // 3. Configurar nodos de audio
      await this.setupAudioNodes();

      // 4. Cargar audio worklet si está disponible
      if (this.config.useAudioWorklet) {
        await this.loadAudioWorklet();
      }

      this.emitEvent('audio.initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state
      });

      return {
        success: true,
        sampleRate: this.audioContext.sampleRate,
        latency: this.audioContext.baseLatency,
        state: this.audioContext.state
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize audio stream adapter'
      };
    }
  }

  /**
   * 🎤 PATRÓN: Media Capture Pattern
   * Capturar stream de audio del micrófono
   */
  public async captureAudioStream(constraints?: MediaStreamConstraints): Promise<AudioCaptureResult> {
    try {
      if (!this.audioContext) {
        return {
          success: false,
          error: 'Audio context not initialized'
        };
      }

      // Configurar constraints de audio
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: this.config.enableEchoCancellation,
        noiseSuppression: this.config.enableNoiseReduction,
        autoGainControl: this.config.enableAutoGainControl,
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channelCount,
        ...constraints?.audio as MediaTrackConstraints
      };

      // Capturar stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });

      // Crear source node
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Conectar nodos de procesamiento
      this.connectAudioNodes();

      this.emitEvent('audio.captured', {
        streamId: this.mediaStream.id,
        tracks: this.mediaStream.getAudioTracks().length,
        constraints: audioConstraints
      });

      return {
        success: true,
        stream: this.mediaStream,
        sourceNode: this.sourceNode,
        deviceInfo: await this.getAudioDeviceInfo()
      };

    } catch (error) {
      return {
        success: false,
        error: this.handleAudioError(error)
      };
    }
  }

  /**
   * 🎵 PATRÓN: Audio Processing Pipeline Pattern
   * Iniciar procesamiento de audio
   */
  public async startProcessing(): Promise<AudioProcessingResult> {
    try {
      if (!this.sourceNode || !this.audioContext) {
        return {
          success: false,
          error: 'Audio source not available'
        };
      }

      if (this.isProcessing) {
        return {
          success: false,
          error: 'Audio processing already active'
        };
      }

      // Configurar processor node
      if (this.config.useAudioWorklet && this.audioWorklet) {
        // Usar Audio Worklet para mejor rendimiento
        this.setupAudioWorkletProcessing();
      } else {
        // Usar ScriptProcessorNode como fallback
        this.setupScriptProcessorProcessing();
      }

      this.isProcessing = true;

      this.emitEvent('audio.processing.started', {
        processingType: this.config.useAudioWorklet ? 'worklet' : 'script_processor',
        bufferSize: this.config.bufferSize,
        sampleRate: this.audioContext.sampleRate
      });

      return {
        success: true,
        processingType: this.config.useAudioWorklet ? 'worklet' : 'script_processor',
        bufferSize: this.config.bufferSize,
        latency: this.calculateProcessingLatency()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio processing'
      };
    }
  }

  /**
   * 🔊 PATRÓN: Volume Analysis Pattern
   * Analizar nivel de volumen en tiempo real
   */
  public getVolumeLevel(): AudioVolumeInfo {
    if (!this.analyserNode) {
      return {
        volume: 0,
        peak: 0,
        rms: 0,
        isSpeaking: false,
        timestamp: Date.now()
      };
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    // Calcular RMS (Root Mean Square)
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255.0;
      sum += value * value;
      peak = Math.max(peak, value);
    }

    const rms = Math.sqrt(sum / bufferLength);
    const volume = rms * 100;
    const isSpeaking = volume > (this.config.speechThreshold || 5);

    return {
      volume,
      peak: peak * 100,
      rms,
      isSpeaking,
      timestamp: Date.now()
    };
  }

  /**
   * 🎛️ PATRÓN: Audio Effects Pattern
   * Aplicar efectos de audio en tiempo real
   */
  public applyAudioEffects(effects: AudioEffectsConfig): AudioEffectsResult {
    try {
      if (!this.audioContext) {
        return {
          success: false,
          error: 'Audio context not available'
        };
      }

      const appliedEffects: string[] = [];

      // Aplicar compresión
      if (effects.compression && this.compressionNode) {
        this.compressionNode.threshold.value = effects.compression.threshold || -24;
        this.compressionNode.ratio.value = effects.compression.ratio || 12;
        this.compressionNode.attack.value = effects.compression.attack || 0.003;
        this.compressionNode.release.value = effects.compression.release || 0.25;
        appliedEffects.push('compression');
      }

      // Aplicar filtro
      if (effects.filter && this.filterNode) {
        this.filterNode.type = effects.filter.type || 'lowpass';
        this.filterNode.frequency.value = effects.filter.frequency || 8000;
        this.filterNode.Q.value = effects.filter.Q || 1;
        appliedEffects.push('filter');
      }

      // Aplicar ganancia
      if (effects.gain !== undefined && this.gainNode) {
        this.gainNode.gain.value = effects.gain;
        appliedEffects.push('gain');
      }

      this.emitEvent('audio.effects.applied', {
        effects: appliedEffects,
        timestamp: Date.now()
      });

      return {
        success: true,
        appliedEffects,
        currentGain: this.gainNode?.gain.value || 1
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply audio effects'
      };
    }
  }

  /**
   * 📊 PATRÓN: Frequency Analysis Pattern
   * Analizar espectro de frecuencias
   */
  public getFrequencyAnalysis(): FrequencyAnalysisResult {
    if (!this.analyserNode) {
      return {
        success: false,
        error: 'Analyser node not available'
      };
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    this.analyserNode.getByteFrequencyData(frequencyData);
    this.analyserNode.getByteTimeDomainData(timeDomainData);

    // Analizar bandas de frecuencia
    const bands = this.analyzeFrequencyBands(frequencyData);
    
    // Detectar características de voz
    const voiceCharacteristics = this.analyzeVoiceCharacteristics(frequencyData, timeDomainData);

    return {
      success: true,
      frequencyData: Array.from(frequencyData),
      timeDomainData: Array.from(timeDomainData),
      bands,
      voiceCharacteristics,
      timestamp: Date.now()
    };
  }

  /**
   * 🔇 PATRÓN: Mute Control Pattern
   * Controlar silenciamiento de audio
   */
  public setMuted(muted: boolean): MuteControlResult {
    try {
      if (!this.mediaStream) {
        return {
          success: false,
          error: 'No media stream available'
        };
      }

      // Silenciar/activar tracks de audio
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });

      // También controlar ganancia
      if (this.gainNode) {
        this.gainNode.gain.value = muted ? 0 : (this.config.defaultGain || 1);
      }

      this.emitEvent('audio.mute.changed', {
        muted,
        timestamp: Date.now()
      });

      return {
        success: true,
        muted,
        trackCount: this.mediaStream.getAudioTracks().length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change mute state'
      };
    }
  }

  /**
   * 📤 PATRÓN: Stream Export Pattern
   * Exportar stream procesado
   */
  public getProcessedStream(): ProcessedStreamResult {
    if (!this.destinationNode) {
      return {
        success: false,
        error: 'Destination node not available'
      };
    }

    try {
      const processedStream = this.destinationNode.stream;
      
      return {
        success: true,
        stream: processedStream,
        tracks: processedStream.getAudioTracks().length,
        processingChain: this.getProcessingChainInfo()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get processed stream'
      };
    }
  }

  /**
   * 📊 PATRÓN: Metrics Collection Pattern
   * Obtener métricas de audio
   */
  public getAudioMetrics(): AudioMetrics {
    const volumeInfo = this.getVolumeLevel();
    
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      sampleRate: this.audioContext?.sampleRate || 0,
      bufferSize: this.config.bufferSize || 0,
      latency: this.audioContext?.baseLatency || 0,
      volume: volumeInfo.volume,
      isSpeaking: volumeInfo.isSpeaking,
      trackCount: this.mediaStream?.getAudioTracks().length || 0,
      contextState: this.audioContext?.state || 'closed',
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
   * Limpiar recursos de audio
   */
  public async cleanup(): Promise<void> {
    try {
      // Detener procesamiento
      this.isProcessing = false;
      this.isRecording = false;

      // Desconectar nodos
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }

      if (this.audioWorklet) {
        this.audioWorklet.disconnect();
        this.audioWorklet = null;
      }

      // Detener tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Cerrar audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Limpiar event listeners
      this.eventListeners.clear();

      this.emitEvent('audio.cleanup.completed', {
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }

  /**
   * 🔍 PATRÓN: Support Detection Pattern
   * Verificar soporte de audio
   */
  private checkAudioSupport(): AudioSupportResult {
    const missing: string[] = [];

    if (!window.AudioContext && !window.webkitAudioContext) {
      missing.push('AudioContext');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      missing.push('getUserMedia');
    }

    if (!window.MediaStream) {
      missing.push('MediaStream');
    }

    return {
      isSupported: missing.length === 0,
      error: missing.length > 0 ? `Missing audio features: ${missing.join(', ')}` : undefined
    };
  }

  /**
   * 🎛️ PATRÓN: Audio Node Setup Pattern
   * Configurar nodos de audio
   */
  private async setupAudioNodes(): Promise<void> {
    if (!this.audioContext) return;

    // Crear analyser node
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Crear gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.config.defaultGain || 1;

    // Crear compression node
    this.compressionNode = this.audioContext.createDynamicsCompressor();
    this.compressionNode.threshold.value = this.config.compressionThreshold || -24;
    this.compressionNode.ratio.value = this.config.compressionRatio || 12;

    // Crear filter node
    this.filterNode = this.audioContext.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = this.config.filterFrequency || 8000;

    // Crear destination node
    this.destinationNode = this.audioContext.createMediaStreamDestination();
  }

  /**
   * 🔗 PATRÓN: Audio Pipeline Pattern
   * Conectar nodos de audio
   */
  private connectAudioNodes(): void {
    if (!this.sourceNode) return;

    // Pipeline: Source -> Analyser -> Compression -> Filter -> Gain -> Destination
    this.sourceNode.connect(this.analyserNode!);
    this.analyserNode!.connect(this.compressionNode!);
    this.compressionNode!.connect(this.filterNode!);
    this.filterNode!.connect(this.gainNode!);
    this.gainNode!.connect(this.destinationNode!);
  }

  /**
   * 🎵 PATRÓN: Audio Worklet Pattern
   * Cargar audio worklet
   */
  private async loadAudioWorklet(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // En una implementación real, cargarías el worklet desde un archivo
      // await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      
      // Por ahora, simulamos la carga exitosa
      console.log('Audio worklet would be loaded here');
      
    } catch (error) {
      console.warn('Failed to load audio worklet, falling back to ScriptProcessor');
      this.config.useAudioWorklet = false;
    }
  }

  /**
   * 🎛️ PATRÓN: Worklet Processing Pattern
   * Configurar procesamiento con Audio Worklet
   */
  private setupAudioWorkletProcessing(): void {
    if (!this.audioContext || !this.audioWorklet) return;

    this.audioWorklet.port.onmessage = (event) => {
      this.handleAudioWorkletMessage(event.data);
    };

    // Conectar worklet al pipeline
    this.gainNode!.connect(this.audioWorklet);
    this.audioWorklet.connect(this.destinationNode!);
  }

  /**
   * 🎛️ PATRÓN: Script Processor Pattern
   * Configurar procesamiento con ScriptProcessor
   */
  private setupScriptProcessorProcessing(): void {
    if (!this.audioContext) return;

    this.processorNode = this.audioContext.createScriptProcessor(
      this.config.bufferSize,
      this.config.channelCount,
      this.config.channelCount
    );

    this.processorNode.onaudioprocess = (event) => {
      this.processAudioBuffer(event);
    };

    // Conectar processor al pipeline
    this.gainNode!.connect(this.processorNode);
    this.processorNode.connect(this.destinationNode!);
  }

  /**
   * 🎵 PATRÓN: Audio Buffer Processing Pattern
   * Procesar buffer de audio
   */
  private processAudioBuffer(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;

    // Procesar cada canal
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const inputData = inputBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);

      // Aplicar procesamiento personalizado
      this.applyCustomProcessing(inputData, outputData);
    }

    // Emitir evento con datos procesados
    this.emitEvent('audio.buffer.processed', {
      sampleRate: inputBuffer.sampleRate,
      length: inputBuffer.length,
      channels: inputBuffer.numberOfChannels,
      timestamp: Date.now()
    });
  }

  /**
   * 🎛️ PATRÓN: Custom Processing Pattern
   * Aplicar procesamiento personalizado
   */
  private applyCustomProcessing(inputData: Float32Array, outputData: Float32Array): void {
    // Aplicar procesamiento básico (pass-through con posible modificación)
    for (let i = 0; i < inputData.length; i++) {
      let sample = inputData[i];

      // Aplicar noise gate si está configurado
      if (this.config.noiseGateThreshold && Math.abs(sample) < this.config.noiseGateThreshold) {
        sample = 0;
      }

      // Aplicar limitación de amplitud
      sample = Math.max(-1, Math.min(1, sample));

      outputData[i] = sample;
    }
  }

  /**
   * 📊 PATRÓN: Frequency Band Analysis Pattern
   * Analizar bandas de frecuencia
   */
  private analyzeFrequencyBands(frequencyData: Uint8Array): FrequencyBands {
    const length = frequencyData.length;
    
    // Dividir en bandas de frecuencia
    const bassEnd = Math.floor(length * 0.1);
    const midEnd = Math.floor(length * 0.5);
    
    let bass = 0, mid = 0, treble = 0;
    
    // Calcular promedios por banda
    for (let i = 0; i < bassEnd; i++) {
      bass += frequencyData[i];
    }
    bass /= bassEnd;
    
    for (let i = bassEnd; i < midEnd; i++) {
      mid += frequencyData[i];
    }
    mid /= (midEnd - bassEnd);
    
    for (let i = midEnd; i < length; i++) {
      treble += frequencyData[i];
    }
    treble /= (length - midEnd);

    return {
      bass: bass / 255 * 100,
      mid: mid / 255 * 100,
      treble: treble / 255 * 100
    };
  }

  /**
   * 🗣️ PATRÓN: Voice Analysis Pattern
   * Analizar características de voz
   */
  private analyzeVoiceCharacteristics(
    frequencyData: Uint8Array, 
    timeDomainData: Uint8Array
  ): VoiceCharacteristics {
    // Detectar pitch fundamental (simplificado)
    const pitch = this.detectPitch(timeDomainData);
    
    // Analizar formantes (simplificado)
    const formants = this.analyzeFormants(frequencyData);
    
    // Detectar actividad de voz
    const voiceActivity = this.detectVoiceActivity(frequencyData, timeDomainData);

    return {
      pitch,
      formants,
      voiceActivity,
      clarity: this.calculateClarity(frequencyData),
      energy: this.calculateEnergy(timeDomainData)
    };
  }

  /**
   * 🎵 PATRÓN: Pitch Detection Pattern
   * Detectar pitch fundamental
   */
  private detectPitch(timeDomainData: Uint8Array): number {
    // Implementación simplificada de detección de pitch
    // En una implementación real usarías algoritmos como YIN o autocorrelación
    
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const bufferSize = timeDomainData.length;
    
    // Buscar periodicidad en la señal
    let bestCorrelation = 0;
    let bestOffset = 0;
    
    for (let offset = 1; offset < bufferSize / 2; offset++) {
      let correlation = 0;
      
      for (let i = 0; i < bufferSize - offset; i++) {
        correlation += Math.abs(timeDomainData[i] - timeDomainData[i + offset]);
      }
      
      correlation = 1 - (correlation / (bufferSize - offset));
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }
    
    return bestOffset > 0 ? sampleRate / bestOffset : 0;
  }

  /**
   * 🎛️ PATRÓN: Formant Analysis Pattern
   * Analizar formantes de voz
   */
  private analyzeFormants(frequencyData: Uint8Array): number[] {
    // Implementación simplificada de análisis de formantes
    const formants: number[] = [];
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binSize = sampleRate / (frequencyData.length * 2);
    
    // Buscar picos en el espectro de frecuencias
    for (let i = 1; i < frequencyData.length - 1; i++) {
      if (frequencyData[i] > frequencyData[i - 1] && 
          frequencyData[i] > frequencyData[i + 1] &&
          frequencyData[i] > 50) { // Umbral mínimo
        
        const frequency = i * binSize;
        if (frequency >= 200 && frequency <= 4000) { // Rango de formantes
          formants.push(frequency);
        }
      }
    }
    
    return formants.slice(0, 3); // Primeros 3 formantes
  }

  /**
   * 🗣️ PATRÓN: Voice Activity Detection Pattern
   * Detectar actividad de voz
   */
  private detectVoiceActivity(frequencyData: Uint8Array, timeDomainData: Uint8Array): boolean {
    // Calcular energía en bandas de frecuencia de voz (300-3400 Hz)
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binSize = sampleRate / (frequencyData.length * 2);
    
    let voiceEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const frequency = i * binSize;
      const energy = frequencyData[i];
      
      totalEnergy += energy;
      
      if (frequency >= 300 && frequency <= 3400) {
        voiceEnergy += energy;
      }
    }
    
    const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
    const energyThreshold = this.config.speechThreshold || 0.1;
    
    return voiceRatio > energyThreshold;
  }

  /**
   * 📊 PATRÓN: Audio Quality Metrics Pattern
   * Calcular métricas de calidad
   */
  private calculateClarity(frequencyData: Uint8Array): number {
    // Calcular claridad basada en distribución de frecuencias
    let sum = 0;
    let weightedSum = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const value = frequencyData[i];
      sum += value;
      weightedSum += value * i;
    }
    
    return sum > 0 ? (weightedSum / sum) / frequencyData.length : 0;
  }

  private calculateEnergy(timeDomainData: Uint8Array): number {
    let energy = 0;
    
    for (let i = 0; i < timeDomainData.length; i++) {
      const sample = (timeDomainData[i] - 128) / 128;
      energy += sample * sample;
    }
    
    return Math.sqrt(energy / timeDomainData.length);
  }

  /**
   * ⏱️ PATRÓN: Latency Calculation Pattern
   * Calcular latencia de procesamiento
   */
  private calculateProcessingLatency(): number {
    if (!this.audioContext) return 0;
    
    const bufferLatency = (this.config.bufferSize || 4096) / this.audioContext.sampleRate;
    const contextLatency = this.audioContext.baseLatency || 0;
    
    return (bufferLatency + contextLatency) * 1000; // en milisegundos
  }

  /**
   * 📊 PATRÓN: Processing Chain Info Pattern
   * Obtener información de la cadena de procesamiento
   */
  private getProcessingChainInfo(): ProcessingChainInfo {
    return {
      nodes: [
        'MediaStreamSource',
        'AnalyserNode',
        'DynamicsCompressor',
        'BiquadFilter',
        'GainNode',
        this.config.useAudioWorklet ? 'AudioWorklet' : 'ScriptProcessor',
        'MediaStreamDestination'
      ],
      bufferSize: this.config.bufferSize || 4096,
      sampleRate: this.audioContext?.sampleRate || 0,
      latency: this.calculateProcessingLatency()
    };
  }

  /**
   * 🎤 PATRÓN: Device Info Pattern
   * Obtener información de dispositivos de audio
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
          label: device.label || 'Unknown Device',
          groupId: device.groupId
        }))
      };

    } catch (error) {
      return {
        deviceCount: 0,
        defaultDevice: 'Unknown',
        availableDevices: []
      };
    }
  }

  /**
   * 🎤 PATRÓN: Error Handling Pattern
   * Manejar errores de audio
   */
  private handleAudioError(error: unknown): string {
    if (error instanceof Error) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Microphone access denied by user';
        case 'NotFoundError':
          return 'No microphone found';
        case 'NotReadableError':
          return 'Microphone is already in use';
        case 'OverconstrainedError':
          return 'Audio constraints cannot be satisfied';
        case 'SecurityError':
          return 'Security error accessing microphone';
        default:
          return error.message;
      }
    }
    return 'Unknown audio error';
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

  /**
   * 📤 PATRÓN: Audio Worklet Message Handler Pattern
   * Manejar mensajes del audio worklet
   */
  private handleAudioWorkletMessage(data: unknown): void {
    this.emitEvent('audio.worklet.message', data);
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para audio streaming
 */
export interface AudioStreamConfig {
  sampleRate?: number;
  channelCount?: number;
  bufferSize?: number;
  enableNoiseReduction?: boolean;
  enableEchoCancellation?: boolean;
  enableAutoGainControl?: boolean;
  compressionThreshold?: number;
  compressionRatio?: number;
  filterFrequency?: number;
  defaultGain?: number;
  speechThreshold?: number;
  noiseGateThreshold?: number;
  useAudioWorklet?: boolean;
}

export interface AudioStreamInitResult {
  success: boolean;
  sampleRate?: number;
  latency?: number;
  state?: AudioContextState;
  error?: string;
}

export interface AudioCaptureResult {
  success: boolean;
  stream?: MediaStream;
  sourceNode?: MediaStreamAudioSourceNode;
  deviceInfo?: AudioDeviceInfo;
  error?: string;
}

export interface AudioProcessingResult {
  success: boolean;
  processingType?: 'worklet' | 'script_processor';
  bufferSize?: number;
  latency?: number;
  error?: string;
}

export interface AudioVolumeInfo {
  volume: number;
  peak: number;
  rms: number;
  isSpeaking: boolean;
  timestamp: number;
}

export interface AudioEffectsConfig {
  compression?: {
    threshold?: number;
    ratio?: number;
    attack?: number;
    release?: number;
  };
  filter?: {
    type?: BiquadFilterType;
    frequency?: number;
    Q?: number;
  };
  gain?: number;
}

export interface AudioEffectsResult {
  success: boolean;
  appliedEffects?: string[];
  currentGain?: number;
  error?: string;
}

export interface FrequencyAnalysisResult {
  success: boolean;
  frequencyData?: number[];
  timeDomainData?: number[];
  bands?: FrequencyBands;
  voiceCharacteristics?: VoiceCharacteristics;
  timestamp?: number;
  error?: string;
}

export interface FrequencyBands {
  bass: number;
  mid: number;
  treble: number;
}

export interface VoiceCharacteristics {
  pitch: number;
  formants: number[];
  voiceActivity: boolean;
  clarity: number;
  energy: number;
}

export interface MuteControlResult {
  success: boolean;
  muted?: boolean;
  trackCount?: number;
  error?: string;
}

export interface ProcessedStreamResult {
  success: boolean;
  stream?: MediaStream;
  tracks?: number;
  processingChain?: ProcessingChainInfo;
  error?: string;
}

export interface ProcessingChainInfo {
  nodes: string[];
  bufferSize: number;
  sampleRate: number;
  latency: number;
}

export interface AudioMetrics {
  isRecording: boolean;
  isProcessing: boolean;
  sampleRate: number;
  bufferSize: number;
  latency: number;
  volume: number;
  isSpeaking: boolean;
  trackCount: number;
  contextState: AudioContextState;
  timestamp: number;
}

export interface AudioDeviceInfo {
  deviceCount: number;
  defaultDevice: string;
  availableDevices: Array<{
    deviceId: string;
    label: string;
    groupId?: string;
  }>;
}

export interface AudioSupportResult {
  isSupported: boolean;
  error?: string;
}

// Extensión de tipos globales para compatibilidad
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
