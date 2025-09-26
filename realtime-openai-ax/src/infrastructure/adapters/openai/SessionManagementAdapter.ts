/**
 * 🏗️ PATRÓN: Adapter Pattern + Session Management
 * 🎯 PRINCIPIO: Session Lifecycle + State Management + Ephemeral Keys
 * 
 * SessionManagementAdapter - Adaptador para gestión completa de sesiones OpenAI
 * Maneja ciclo de vida de sesiones, ephemeral keys, y sincronización de estado
 */

import type { AgentId } from '../../../domain/valueObjects/AgentId';
import type { AgentType } from '../../../domain/valueObjects/AgentType';
import type { CustomerId } from '../../../domain/valueObjects/CustomerId';

/**
 * 🎯 PATRÓN: Session Management Adapter Pattern
 * SessionManagementAdapter gestiona el ciclo completo de sesiones OpenAI
 */
export class SessionManagementAdapter {
  private activeSessions: Map<string, SessionData> = new Map();
  private ephemeralKeys: Map<string, EphemeralKeyData> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private isInitialized = false;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de sesiones
   */
  constructor(private readonly config: SessionManagementConfig) {
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 minutos
      ephemeralKeyExpiry: 60 * 1000, // 1 minuto
      maxConcurrentSessions: 10,
      enableSessionPersistence: true,
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutos
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar adaptador de gestión de sesiones
   */
  public async initialize(): Promise<SessionInitResult> {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      // 1. Verificar configuración
      if (!this.apiKey) {
        return {
          success: false,
          error: 'OpenAI API key is required'
        };
      }

      // 2. Restaurar sesiones persistentes
      if (this.config.enableSessionPersistence) {
        await this.restorePersistedSessions();
      }

      // 3. Iniciar limpieza automática
      this.startCleanupTimer();

      // 4. Configurar métricas
      if (this.config.enableMetrics) {
        this.initializeMetrics();
      }

      this.isInitialized = true;

      this.emitEvent('session.manager.initialized', {
        activeSessions: this.activeSessions.size,
        ephemeralKeys: this.ephemeralKeys.size,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Session management adapter initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session management adapter'
      };
    }
  }

  /**
   * 🔑 PATRÓN: Ephemeral Key Management Pattern
   * Crear ephemeral key para sesión
   */
  public async createEphemeralKey(sessionId: string): Promise<EphemeralKeyResult> {
    try {
      // 1. Verificar límites de sesiones concurrentes
      if (this.activeSessions.size >= this.config.maxConcurrentSessions!) {
        return {
          success: false,
          error: 'Maximum concurrent sessions limit reached'
        };
      }

      // 2. Crear ephemeral key con OpenAI
      const keyResponse = await this.requestEphemeralKey();
      if (!keyResponse.success) {
        return keyResponse;
      }

      // 3. Almacenar datos de la key
      const keyData: EphemeralKeyData = {
        sessionId,
        key: keyResponse.key!,
        expiresAt: Date.now() + this.config.ephemeralKeyExpiry!,
        createdAt: Date.now(),
        isActive: true,
        usageCount: 0
      };

      this.ephemeralKeys.set(sessionId, keyData);

      // 4. Programar expiración automática
      this.scheduleKeyExpiration(sessionId);

      this.emitEvent('ephemeral.key.created', {
        sessionId,
        expiresIn: this.config.ephemeralKeyExpiry,
        timestamp: Date.now()
      });

      return {
        success: true,
        key: keyData.key,
        expiresAt: keyData.expiresAt,
        sessionId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ephemeral key'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Session Creation Pattern
   * Crear nueva sesión OpenAI
   */
  public async createSession(request: CreateSessionRequest): Promise<SessionCreationResult> {
    try {
      // 1. Generar ID único de sesión
      const sessionId = this.generateSessionId();

      // 2. Crear ephemeral key
      const keyResult = await this.createEphemeralKey(sessionId);
      if (!keyResult.success) {
        return {
          success: false,
          error: keyResult.error
        };
      }

      // 3. Configurar datos de sesión
      const sessionData: SessionData = {
        sessionId,
        customerId: request.customerId,
        agentId: request.agentId,
        agentType: request.agentType,
        ephemeralKey: keyResult.key!,
        status: 'creating',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + this.config.sessionTimeout!,
        metadata: request.metadata || {},
        conversationHistory: [],
        agentSwitches: [],
        metrics: {
          messagesCount: 0,
          agentSwitchCount: 0,
          totalDuration: 0,
          lastMessageAt: Date.now()
        }
      };

      // 4. Crear sesión con OpenAI Realtime API
      const realtimeResult = await this.createRealtimeSession(sessionData, request.configuration);
      if (!realtimeResult.success) {
        // Limpiar ephemeral key en caso de error
        this.ephemeralKeys.delete(sessionId);
        return realtimeResult;
      }

      // 5. Almacenar sesión activa
      sessionData.status = 'active';
      sessionData.realtimeSessionId = realtimeResult.realtimeSessionId;
      this.activeSessions.set(sessionId, sessionData);

      // 6. Programar timeout de sesión
      this.scheduleSessionTimeout(sessionId);

      // 7. Persistir sesión si está habilitado
      if (this.config.enableSessionPersistence) {
        await this.persistSession(sessionData);
      }

      this.emitEvent('session.created', {
        sessionId,
        customerId: request.customerId?.toString(),
        agentType: request.agentType.getValue(),
        timestamp: Date.now()
      });

      return {
        success: true,
        sessionId,
        ephemeralKey: keyResult.key!,
        expiresAt: sessionData.expiresAt,
        realtimeSessionId: realtimeResult.realtimeSessionId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Agent Switch Management Pattern
   * Cambiar agente en sesión activa
   */
  public async switchAgent(sessionId: string, request: AgentSwitchRequest): Promise<AgentSwitchResult> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      if (session.status !== 'active') {
        return {
          success: false,
          error: 'Session is not active'
        };
      }

      // 1. Registrar cambio de agente
      const agentSwitch: AgentSwitchRecord = {
        fromAgentId: session.agentId,
        fromAgentType: session.agentType,
        toAgentId: request.toAgentId,
        toAgentType: request.toAgentType,
        reason: request.reason,
        timestamp: Date.now(),
        context: request.context || {}
      };

      session.agentSwitches.push(agentSwitch);

      // 2. Actualizar datos de sesión
      session.agentId = request.toAgentId;
      session.agentType = request.toAgentType;
      session.lastActivity = Date.now();
      session.metrics.agentSwitchCount++;

      // 3. Actualizar configuración de agente en OpenAI
      const configResult = await this.updateAgentConfiguration(session, request.toAgentType);
      if (!configResult.success) {
        return configResult;
      }

      // 4. Persistir cambios
      if (this.config.enableSessionPersistence) {
        await this.persistSession(session);
      }

      this.emitEvent('agent.switched', {
        sessionId,
        fromAgent: agentSwitch.fromAgentType.getValue(),
        toAgent: agentSwitch.toAgentType.getValue(),
        reason: request.reason,
        timestamp: Date.now()
      });

      return {
        success: true,
        sessionId,
        newAgentId: request.toAgentId.toString(),
        newAgentType: request.toAgentType.getValue(),
        switchCount: session.metrics.agentSwitchCount
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch agent'
      };
    }
  }

  /**
   * 📊 PATRÓN: Session State Management Pattern
   * Actualizar estado de sesión
   */
  public async updateSessionState(sessionId: string, updates: SessionStateUpdate): Promise<SessionUpdateResult> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      // 1. Aplicar actualizaciones
      if (updates.metadata) {
        session.metadata = { ...session.metadata, ...updates.metadata };
      }

      if (updates.conversationEntry) {
        session.conversationHistory.push(updates.conversationEntry);
        session.metrics.messagesCount++;
        session.metrics.lastMessageAt = Date.now();
      }

      if (updates.status) {
        session.status = updates.status;
      }

      // 2. Actualizar actividad
      session.lastActivity = Date.now();

      // 3. Extender expiración si es necesario
      if (updates.extendExpiration) {
        session.expiresAt = Date.now() + this.config.sessionTimeout!;
        this.scheduleSessionTimeout(sessionId);
      }

      // 4. Persistir cambios
      if (this.config.enableSessionPersistence) {
        await this.persistSession(session);
      }

      this.emitEvent('session.updated', {
        sessionId,
        updates: Object.keys(updates),
        timestamp: Date.now()
      });

      return {
        success: true,
        sessionId,
        updatedFields: Object.keys(updates),
        lastActivity: session.lastActivity
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session state'
      };
    }
  }

  /**
   * 📋 PATRÓN: Session Retrieval Pattern
   * Obtener información de sesión
   */
  public getSession(sessionId: string): SessionRetrievalResult {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    // Calcular duración total
    const totalDuration = Date.now() - session.createdAt;
    session.metrics.totalDuration = totalDuration;

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        customerId: session.customerId?.toString(),
        agentId: session.agentId?.toString(),
        agentType: session.agentType.getValue(),
        status: session.status,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        metadata: session.metadata,
        metrics: session.metrics,
        agentSwitchCount: session.agentSwitches.length,
        conversationLength: session.conversationHistory.length
      }
    };
  }

  /**
   * 📊 PATRÓN: Session Metrics Pattern
   * Obtener métricas de sesiones
   */
  public getSessionMetrics(): SessionMetricsResult {
    const metrics: SessionMetrics = {
      totalSessions: this.activeSessions.size,
      activeEphemeralKeys: this.ephemeralKeys.size,
      sessionsByStatus: this.getSessionsByStatus(),
      sessionsByAgent: this.getSessionsByAgent(),
      averageSessionDuration: this.calculateAverageSessionDuration(),
      totalAgentSwitches: this.getTotalAgentSwitches(),
      memoryUsage: this.calculateMemoryUsage(),
      timestamp: Date.now()
    };

    return {
      success: true,
      metrics
    };
  }

  /**
   * 🔚 PATRÓN: Session Termination Pattern
   * Terminar sesión activa
   */
  public async terminateSession(sessionId: string, reason?: string): Promise<SessionTerminationResult> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      // 1. Actualizar estado de sesión
      session.status = 'terminated';
      session.lastActivity = Date.now();
      
      if (reason) {
        session.metadata.terminationReason = reason;
      }

      // 2. Terminar sesión de OpenAI Realtime
      if (session.realtimeSessionId) {
        await this.terminateRealtimeSession(session.realtimeSessionId);
      }

      // 3. Limpiar timers
      const timer = this.sessionTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.sessionTimers.delete(sessionId);
      }

      // 4. Archivar sesión si está habilitado
      if (this.config.enableSessionPersistence) {
        await this.archiveSession(session);
      }

      // 5. Remover de sesiones activas
      this.activeSessions.delete(sessionId);

      // 6. Limpiar ephemeral key
      this.ephemeralKeys.delete(sessionId);

      this.emitEvent('session.terminated', {
        sessionId,
        reason,
        duration: Date.now() - session.createdAt,
        timestamp: Date.now()
      });

      return {
        success: true,
        sessionId,
        terminatedAt: Date.now(),
        duration: Date.now() - session.createdAt,
        reason
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to terminate session'
      };
    }
  }

  /**
   * 🧹 PATRÓN: Cleanup Pattern
   * Limpiar sesiones expiradas
   */
  public async cleanupExpiredSessions(): Promise<CleanupResult> {
    const now = Date.now();
    const expiredSessions: string[] = [];
    const expiredKeys: string[] = [];

    try {
      // 1. Identificar sesiones expiradas
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.expiresAt < now) {
          expiredSessions.push(sessionId);
        }
      }

      // 2. Identificar ephemeral keys expiradas
      for (const [sessionId, keyData] of this.ephemeralKeys.entries()) {
        if (keyData.expiresAt < now) {
          expiredKeys.push(sessionId);
        }
      }

      // 3. Terminar sesiones expiradas
      for (const sessionId of expiredSessions) {
        await this.terminateSession(sessionId, 'expired');
      }

      // 4. Limpiar keys expiradas
      for (const sessionId of expiredKeys) {
        this.ephemeralKeys.delete(sessionId);
      }

      this.emitEvent('cleanup.completed', {
        expiredSessions: expiredSessions.length,
        expiredKeys: expiredKeys.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        expiredSessions: expiredSessions.length,
        expiredKeys: expiredKeys.length,
        cleanedAt: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup expired sessions'
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
   * 🧹 PATRÓN: Shutdown Pattern
   * Cerrar adaptador y limpiar recursos
   */
  public async shutdown(): Promise<void> {
    try {
      // 1. Terminar todas las sesiones activas
      const terminationPromises = Array.from(this.activeSessions.keys())
        .map(sessionId => this.terminateSession(sessionId, 'shutdown'));
      
      await Promise.all(terminationPromises);

      // 2. Limpiar timers
      for (const timer of this.sessionTimers.values()) {
        clearTimeout(timer);
      }
      this.sessionTimers.clear();

      // 3. Limpiar ephemeral keys
      this.ephemeralKeys.clear();

      // 4. Limpiar event listeners
      this.eventListeners.clear();

      this.isInitialized = false;

      this.emitEvent('session.manager.shutdown', {
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error during session manager shutdown:', error);
    }
  }

  /**
   * 🔑 PATRÓN: OpenAI API Integration Pattern
   * Solicitar ephemeral key de OpenAI
   */
  private async requestEphemeralKey(): Promise<EphemeralKeyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/realtime/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        key: data.client_secret?.value || data.ephemeral_key,
        expiresAt: Date.now() + (data.expires_in * 1000 || 60000)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request ephemeral key'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Realtime Session Creation Pattern
   * Crear sesión con OpenAI Realtime API
   */
  private async createRealtimeSession(
    sessionData: SessionData, 
    configuration?: RealtimeSessionConfig
  ): Promise<RealtimeSessionResult> {
    try {
      // En una implementación real, aquí se crearía la sesión WebRTC
      // Por ahora simulamos una respuesta exitosa
      const realtimeSessionId = `rt_${sessionData.sessionId}_${Date.now()}`;

      return {
        success: true,
        realtimeSessionId,
        configuration: configuration || {}
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create realtime session'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Agent Configuration Update Pattern
   * Actualizar configuración de agente
   */
  private async updateAgentConfiguration(
    session: SessionData, 
    agentType: AgentType
  ): Promise<AgentConfigUpdateResult> {
    try {
      // En una implementación real, aquí se actualizaría la configuración del agente
      // Por ahora simulamos una respuesta exitosa
      
      return {
        success: true,
        agentType: agentType.getValue(),
        updatedAt: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent configuration'
      };
    }
  }

  /**
   * 🔚 PATRÓN: Realtime Session Termination Pattern
   * Terminar sesión de OpenAI Realtime
   */
  private async terminateRealtimeSession(realtimeSessionId: string): Promise<void> {
    try {
      // En una implementación real, aquí se terminaría la sesión WebRTC
      console.log(`Terminating realtime session: ${realtimeSessionId}`);
    } catch (error) {
      console.error('Error terminating realtime session:', error);
    }
  }

  /**
   * 🎲 PATRÓN: ID Generation Pattern
   * Generar ID único de sesión
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `sess_${timestamp}_${randomPart}`;
  }

  /**
   * ⏰ PATRÓN: Timer Management Pattern
   * Programar expiración de ephemeral key
   */
  private scheduleKeyExpiration(sessionId: string): void {
    const keyData = this.ephemeralKeys.get(sessionId);
    if (!keyData) return;

    const delay = keyData.expiresAt - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.ephemeralKeys.delete(sessionId);
        this.emitEvent('ephemeral.key.expired', {
          sessionId,
          timestamp: Date.now()
        });
      }, delay);
    }
  }

  /**
   * ⏰ PATRÓN: Timer Management Pattern
   * Programar timeout de sesión
   */
  private scheduleSessionTimeout(sessionId: string): void {
    // Limpiar timer existente
    const existingTimer = this.sessionTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const delay = session.expiresAt - Date.now();
    if (delay > 0) {
      const timer = setTimeout(async () => {
        await this.terminateSession(sessionId, 'timeout');
      }, delay);

      this.sessionTimers.set(sessionId, timer);
    }
  }

  /**
   * 🧹 PATRÓN: Cleanup Timer Pattern
   * Iniciar timer de limpieza automática
   */
  private startCleanupTimer(): void {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  /**
   * 💾 PATRÓN: Session Persistence Pattern
   * Persistir sesión en almacenamiento
   */
  private async persistSession(session: SessionData): Promise<void> {
    try {
      const sessionKey = `session_${session.sessionId}`;
      const sessionJson = JSON.stringify({
        ...session,
        customerId: session.customerId?.toString(),
        agentId: session.agentId?.toString(),
        agentType: session.agentType.getValue()
      });
      
      localStorage.setItem(sessionKey, sessionJson);
    } catch (error) {
      console.error('Error persisting session:', error);
    }
  }

  /**
   * 📂 PATRÓN: Session Archive Pattern
   * Archivar sesión terminada
   */
  private async archiveSession(session: SessionData): Promise<void> {
    try {
      const archiveKey = `archived_session_${session.sessionId}`;
      const archiveData = {
        ...session,
        archivedAt: Date.now(),
        customerId: session.customerId?.toString(),
        agentId: session.agentId?.toString(),
        agentType: session.agentType.getValue()
      };
      
      localStorage.setItem(archiveKey, JSON.stringify(archiveData));
      
      // Remover de almacenamiento activo
      localStorage.removeItem(`session_${session.sessionId}`);
    } catch (error) {
      console.error('Error archiving session:', error);
    }
  }

  /**
   * 🔄 PATRÓN: Session Restoration Pattern
   * Restaurar sesiones persistidas
   */
  private async restorePersistedSessions(): Promise<void> {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('session_')) {
          const sessionJson = localStorage.getItem(key);
          if (sessionJson) {
            const sessionData = JSON.parse(sessionJson);
            
            // Verificar si la sesión no ha expirado
            if (sessionData.expiresAt > Date.now()) {
              // Reconstruir objetos de dominio
              if (sessionData.customerId) {
                sessionData.customerId = { toString: () => sessionData.customerId };
              }
              if (sessionData.agentId) {
                sessionData.agentId = { toString: () => sessionData.agentId };
              }
              if (sessionData.agentType) {
                sessionData.agentType = { getValue: () => sessionData.agentType };
              }
              
              this.activeSessions.set(sessionData.sessionId, sessionData);
              this.scheduleSessionTimeout(sessionData.sessionId);
            } else {
              // Remover sesión expirada
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error restoring persisted sessions:', error);
    }
  }

  /**
   * 📊 PATRÓN: Metrics Initialization Pattern
   * Inicializar sistema de métricas
   */
  private initializeMetrics(): void {
    // Configurar recolección de métricas en tiempo real
    setInterval(() => {
      const metrics = this.getSessionMetrics();
      this.emitEvent('metrics.collected', metrics);
    }, 30000); // Cada 30 segundos
  }

  /**
   * 📊 PATRÓN: Metrics Calculation Patterns
   * Métodos para calcular métricas
   */
  private getSessionsByStatus(): Record<SessionStatus, number> {
    const statusCount: Record<SessionStatus, number> = {
      creating: 0,
      active: 0,
      paused: 0,
      terminated: 0
    };

    for (const session of this.activeSessions.values()) {
      statusCount[session.status]++;
    }

    return statusCount;
  }

  private getSessionsByAgent(): Record<string, number> {
    const agentCount: Record<string, number> = {};

    for (const session of this.activeSessions.values()) {
      const agentType = session.agentType.getValue();
      agentCount[agentType] = (agentCount[agentType] || 0) + 1;
    }

    return agentCount;
  }

  private calculateAverageSessionDuration(): number {
    if (this.activeSessions.size === 0) return 0;

    const totalDuration = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + (Date.now() - session.createdAt), 0);

    return totalDuration / this.activeSessions.size;
  }

  private getTotalAgentSwitches(): number {
    return Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.agentSwitches.length, 0);
  }

  private calculateMemoryUsage(): MemoryUsage {
    const sessionSize = this.activeSessions.size;
    const keySize = this.ephemeralKeys.size;
    const timerSize = this.sessionTimers.size;

    return {
      activeSessions: sessionSize,
      ephemeralKeys: keySize,
      timers: timerSize,
      estimatedBytes: (sessionSize * 1024) + (keySize * 256) + (timerSize * 64)
    };
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
 * Tipos específicos para gestión de sesiones
 */
export interface SessionManagementConfig {
  apiKey: string;
  baseUrl?: string;
  sessionTimeout?: number;
  ephemeralKeyExpiry?: number;
  maxConcurrentSessions?: number;
  enableSessionPersistence?: boolean;
  enableMetrics?: boolean;
  cleanupInterval?: number;
}

export interface SessionInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EphemeralKeyResult {
  success: boolean;
  key?: string;
  expiresAt?: number;
  sessionId?: string;
  error?: string;
}

export interface CreateSessionRequest {
  customerId?: CustomerId;
  agentId?: AgentId;
  agentType: AgentType;
  metadata?: Record<string, unknown>;
  configuration?: RealtimeSessionConfig;
}

export interface SessionCreationResult {
  success: boolean;
  sessionId?: string;
  ephemeralKey?: string;
  expiresAt?: number;
  realtimeSessionId?: string;
  error?: string;
}

export interface AgentSwitchRequest {
  toAgentId: AgentId;
  toAgentType: AgentType;
  reason: string;
  context?: Record<string, unknown>;
}

export interface AgentSwitchResult {
  success: boolean;
  sessionId?: string;
  newAgentId?: string;
  newAgentType?: string;
  switchCount?: number;
  error?: string;
}

export interface SessionStateUpdate {
  metadata?: Record<string, unknown>;
  conversationEntry?: ConversationEntry;
  status?: SessionStatus;
  extendExpiration?: boolean;
}

export interface SessionUpdateResult {
  success: boolean;
  sessionId?: string;
  updatedFields?: string[];
  lastActivity?: number;
  error?: string;
}

export interface SessionRetrievalResult {
  success: boolean;
  session?: SessionInfo;
  error?: string;
}

export interface SessionTerminationResult {
  success: boolean;
  sessionId?: string;
  terminatedAt?: number;
  duration?: number;
  reason?: string;
  error?: string;
}

export interface CleanupResult {
  success: boolean;
  expiredSessions?: number;
  expiredKeys?: number;
  cleanedAt?: number;
  error?: string;
}

export interface SessionMetricsResult {
  success: boolean;
  metrics?: SessionMetrics;
  error?: string;
}

export interface SessionData {
  sessionId: string;
  customerId?: CustomerId;
  agentId?: AgentId;
  agentType: AgentType;
  ephemeralKey: string;
  realtimeSessionId?: string;
  status: SessionStatus;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  metadata: Record<string, unknown>;
  conversationHistory: ConversationEntry[];
  agentSwitches: AgentSwitchRecord[];
  metrics: SessionMetricsData;
}

export interface EphemeralKeyData {
  sessionId: string;
  key: string;
  expiresAt: number;
  createdAt: number;
  isActive: boolean;
  usageCount: number;
}

export interface AgentSwitchRecord {
  fromAgentId?: AgentId;
  fromAgentType: AgentType;
  toAgentId: AgentId;
  toAgentType: AgentType;
  reason: string;
  timestamp: number;
  context: Record<string, unknown>;
}

export interface ConversationEntry {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionInfo {
  sessionId: string;
  customerId?: string;
  agentId?: string;
  agentType: string;
  status: SessionStatus;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  metadata: Record<string, unknown>;
  metrics: SessionMetricsData;
  agentSwitchCount: number;
  conversationLength: number;
}

export interface SessionMetrics {
  totalSessions: number;
  activeEphemeralKeys: number;
  sessionsByStatus: Record<SessionStatus, number>;
  sessionsByAgent: Record<string, number>;
  averageSessionDuration: number;
  totalAgentSwitches: number;
  memoryUsage: MemoryUsage;
  timestamp: number;
}

export interface SessionMetricsData {
  messagesCount: number;
  agentSwitchCount: number;
  totalDuration: number;
  lastMessageAt: number;
}

export interface MemoryUsage {
  activeSessions: number;
  ephemeralKeys: number;
  timers: number;
  estimatedBytes: number;
}

export interface RealtimeSessionConfig {
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
}

export interface RealtimeSessionResult {
  success: boolean;
  realtimeSessionId?: string;
  configuration?: RealtimeSessionConfig;
  error?: string;
}

export interface AgentConfigUpdateResult {
  success: boolean;
  agentType?: string;
  updatedAt?: number;
  error?: string;
}

export type SessionStatus = 'creating' | 'active' | 'paused' | 'terminated';
