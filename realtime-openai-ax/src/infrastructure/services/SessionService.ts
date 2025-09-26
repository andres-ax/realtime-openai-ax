/**
 * 🏗️ PATRÓN: Session Management Service Pattern
 * 🎯 PRINCIPIO: User Session + State Persistence + Multi-tab Sync
 * 
 * SessionService - Servicio de gestión de sesiones de usuario
 * Maneja estado de sesión, persistencia y sincronización entre tabs
 */

import type { CustomerId } from '../../domain/valueObjects/CustomerId';
import type { AgentType } from '../../domain/valueObjects/AgentType';
import type { AgentId } from '../../domain/valueObjects/AgentId';
import type { CartId } from '../../domain/valueObjects/CartId';

/**
 * 🎯 PATRÓN: Session Management Pattern
 * SessionService maneja el ciclo completo de sesiones
 */
export class SessionService {
  private currentSession: UserSession | null = null;
  private sessionTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private crossTabChannel: BroadcastChannel | null = null;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de sesión
   */
  constructor(private readonly config: SessionServiceConfig) {
    this.config = {
      sessionTimeoutMs: 1800000, // 30 minutos
      heartbeatIntervalMs: 30000, // 30 segundos
      enableCrossTabSync: true,
      enableAutoSave: true,
      autoSaveIntervalMs: 10000, // 10 segundos
      maxSessionHistory: 10,
      enableSessionRecovery: true,
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar servicio de sesiones
   */
  public async initialize(): Promise<SessionInitResult> {
    try {
      // 1. Configurar cross-tab communication
      if (this.config.enableCrossTabSync) {
        this.setupCrossTabSync();
      }

      // 2. Intentar recuperar sesión existente
      if (this.config.enableSessionRecovery) {
        await this.attemptSessionRecovery();
      }

      // 3. Configurar auto-save
      if (this.config.enableAutoSave) {
        this.startAutoSave();
      }

      // 4. Configurar listeners de página
      this.setupPageListeners();

      this.emitEvent('session.service.initialized', {
        hasActiveSession: !!this.currentSession,
        crossTabEnabled: this.config.enableCrossTabSync,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Session service initialized successfully',
        hasActiveSession: !!this.currentSession
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session service'
      };
    }
  }

  /**
   * 🔐 PATRÓN: Session Creation Pattern
   * Crear nueva sesión de usuario
   */
  public async createSession(customerId?: CustomerId): Promise<SessionCreateResult> {
    try {
      // 1. Finalizar sesión existente si existe
      if (this.currentSession) {
        await this.endSession();
      }

      // 2. Crear nueva sesión
      const sessionId = this.generateSessionId();
      const session: UserSession = {
        sessionId,
        customerId: customerId?.toString(),
        startTime: new Date(),
        lastActivity: new Date(),
        currentAgent: null,
        agentHistory: [],
        cartId: null,
        orderId: null,
        context: {},
        isActive: true,
        deviceInfo: this.getDeviceInfo(),
        tabId: this.generateTabId()
      };

      this.currentSession = session;

      // 3. Persistir sesión
      await this.persistSession(session);

      // 4. Iniciar heartbeat
      this.startHeartbeat();

      // 5. Configurar timeout
      this.resetSessionTimeout();

      // 6. Broadcast a otros tabs
      this.broadcastSessionEvent('session.created', session);

      this.emitEvent('session.created', {
        sessionId,
        customerId: customerId?.toString(),
        timestamp: Date.now()
      });

      return {
        success: true,
        sessionId,
        session
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      };
    }
  }

  /**
   * 📊 PATRÓN: Session State Update Pattern
   * Actualizar estado de sesión
   */
  public async updateSession(updates: SessionUpdateData): Promise<SessionUpdateResult> {
    try {
      if (!this.currentSession) {
        return {
          success: false,
          error: 'No active session'
        };
      }

      // 1. Aplicar actualizaciones
      const updatedSession = {
        ...this.currentSession,
        ...updates,
        lastActivity: new Date()
      };

      // 2. Validar actualizaciones
      const validation = this.validateSessionUpdate(updatedSession);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      this.currentSession = updatedSession;

      // 3. Persistir cambios
      await this.persistSession(updatedSession);

      // 4. Reset timeout
      this.resetSessionTimeout();

      // 5. Broadcast cambios
      this.broadcastSessionEvent('session.updated', updatedSession);

      this.emitEvent('session.updated', {
        sessionId: updatedSession.sessionId,
        updates,
        timestamp: Date.now()
      });

      return {
        success: true,
        session: updatedSession
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session'
      };
    }
  }

  /**
   * 🤖 PATRÓN: Agent Session Management Pattern
   * Actualizar agente actual en sesión
   */
  public async updateCurrentAgent(
    agentId: AgentId,
    agentType: AgentType,
    context?: Record<string, unknown>
  ): Promise<SessionUpdateResult> {
    try {
      if (!this.currentSession) {
        return {
          success: false,
          error: 'No active session'
        };
      }

      const previousAgent = this.currentSession.currentAgent;
      
      // 1. Actualizar agente actual
      const agentInfo: SessionAgentInfo = {
        agentId: agentId.toString(),
        agentType: agentType.getValue(),
        startTime: new Date(),
        context: context || {}
      };

      // 2. Agregar a historial si cambió
      if (previousAgent && previousAgent.agentId !== agentInfo.agentId) {
        this.currentSession.agentHistory.push({
          ...previousAgent,
          endTime: new Date()
        });

        // Limitar historial
        if (this.currentSession.agentHistory.length > (this.config.maxSessionHistory || 10)) {
          this.currentSession.agentHistory = this.currentSession.agentHistory.slice(-(this.config.maxSessionHistory || 10));
        }
      }

      // 3. Aplicar actualización
      return await this.updateSession({
        currentAgent: agentInfo,
        context: {
          ...this.currentSession.context,
          lastAgentSwitch: new Date().toISOString(),
          agentSwitchReason: context?.reason || 'manual'
        }
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update current agent'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Cart Session Management Pattern
   * Asociar carrito con sesión
   */
  public async associateCart(cartId: CartId): Promise<SessionUpdateResult> {
    return await this.updateSession({
      cartId: cartId.toString(),
      context: {
        ...this.currentSession?.context,
        cartAssociatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * 📋 PATRÓN: Order Session Management Pattern
   * Asociar pedido con sesión
   */
  public async associateOrder(orderId: string): Promise<SessionUpdateResult> {
    return await this.updateSession({
      orderId,
      context: {
        ...this.currentSession?.context,
        orderAssociatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * 📊 PATRÓN: Session Query Pattern
   * Obtener sesión actual
   */
  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * 📊 PATRÓN: Session History Pattern
   * Obtener historial de sesiones
   */
  public async getSessionHistory(limit = 10): Promise<SessionHistoryResult> {
    try {
      const history = this.loadSessionHistory();
      const limitedHistory = history.slice(-limit);

      return {
        success: true,
        sessions: limitedHistory,
        total: history.length
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session history'
      };
    }
  }

  /**
   * 💓 PATRÓN: Session Heartbeat Pattern
   * Enviar heartbeat de sesión
   */
  public async sendHeartbeat(): Promise<HeartbeatResult> {
    try {
      if (!this.currentSession) {
        return {
          success: false,
          error: 'No active session'
        };
      }

      // 1. Actualizar última actividad
      this.currentSession.lastActivity = new Date();

      // 2. Persistir heartbeat
      await this.persistSession(this.currentSession);

      // 3. Reset timeout
      this.resetSessionTimeout();

      // 4. Broadcast heartbeat
      this.broadcastSessionEvent('session.heartbeat', {
        sessionId: this.currentSession.sessionId,
        timestamp: Date.now()
      });

      return {
        success: true,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send heartbeat'
      };
    }
  }

  /**
   * 🔚 PATRÓN: Session Termination Pattern
   * Finalizar sesión actual
   */
  public async endSession(): Promise<SessionEndResult> {
    try {
      if (!this.currentSession) {
        return {
          success: false,
          error: 'No active session to end'
        };
      }

      const sessionId = this.currentSession.sessionId;
      const duration = Date.now() - this.currentSession.startTime.getTime();

      // 1. Marcar sesión como inactiva
      this.currentSession.isActive = false;
      this.currentSession.endTime = new Date();

      // 2. Finalizar agente actual
      if (this.currentSession.currentAgent) {
        this.currentSession.agentHistory.push({
          ...this.currentSession.currentAgent,
          endTime: new Date()
        });
      }

      // 3. Persistir sesión final
      await this.persistSession(this.currentSession);

      // 4. Agregar a historial
      this.addToSessionHistory(this.currentSession);

      // 5. Limpiar recursos
      this.cleanup();

      // 6. Broadcast finalización
      this.broadcastSessionEvent('session.ended', {
        sessionId,
        duration,
        timestamp: Date.now()
      });

      this.emitEvent('session.ended', {
        sessionId,
        duration,
        timestamp: Date.now()
      });

      this.currentSession = null;

      return {
        success: true,
        sessionId,
        duration
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end session'
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
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.crossTabChannel) {
      this.crossTabChannel.close();
      this.crossTabChannel = null;
    }

    this.eventListeners.clear();
  }

  /**
   * 🔄 PATRÓN: Cross-tab Synchronization Pattern
   * Configurar sincronización entre tabs
   */
  private setupCrossTabSync(): void {
    if (!window.BroadcastChannel) return;

    this.crossTabChannel = new BroadcastChannel('session-sync');
    
    this.crossTabChannel.onmessage = (event) => {
      this.handleCrossTabMessage(event.data);
    };
  }

  /**
   * 📡 PATRÓN: Cross-tab Message Handling Pattern
   * Manejar mensajes entre tabs
   */
  private handleCrossTabMessage(data: CrossTabMessage): void {
    switch (data.type) {
      case 'session.created':
      case 'session.updated':
        const sessionPayload = data.payload as { tabId?: string };
        if (sessionPayload.tabId !== this.getCurrentTabId()) {
          this.emitEvent('session.external.update', data.payload);
        }
        break;
      
      case 'session.ended':
        const endPayload = data.payload as { sessionId?: string };
        if (this.currentSession?.sessionId === endPayload.sessionId) {
          this.emitEvent('session.external.ended', data.payload);
        }
        break;
    }
  }

  /**
   * 📡 PATRÓN: Session Broadcasting Pattern
   * Broadcast evento de sesión
   */
  private broadcastSessionEvent(type: string, payload: unknown): void {
    if (this.crossTabChannel) {
      this.crossTabChannel.postMessage({
        type,
        payload: {
          ...(payload as Record<string, unknown>),
          tabId: this.getCurrentTabId()
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🔄 PATRÓN: Session Recovery Pattern
   * Intentar recuperar sesión existente
   */
  private async attemptSessionRecovery(): Promise<void> {
    try {
      const stored = localStorage.getItem('current-session');
      if (!stored) return;

      const session: UserSession = JSON.parse(stored);
      
      // Verificar si la sesión no ha expirado
      const lastActivity = new Date(session.lastActivity);
      const now = new Date();
      const timeDiff = now.getTime() - lastActivity.getTime();
      
      if (timeDiff < (this.config.sessionTimeoutMs || 1800000)) {
        this.currentSession = {
          ...session,
          lastActivity: now
        };
        
        this.startHeartbeat();
        this.resetSessionTimeout();
        
        this.emitEvent('session.recovered', {
          sessionId: session.sessionId,
          timeSinceLastActivity: timeDiff,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Ignorar errores de recuperación
      console.warn('Failed to recover session:', error);
    }
  }

  /**
   * 💾 PATRÓN: Session Persistence Pattern
   * Persistir sesión en storage
   */
  private async persistSession(session: UserSession): Promise<void> {
    try {
      localStorage.setItem('current-session', JSON.stringify(session));
    } catch (error) {
      this.emitEvent('session.persistence.error', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Persistence failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 💓 PATRÓN: Heartbeat Management Pattern
   * Iniciar heartbeat periódico
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * ⏰ PATRÓN: Session Timeout Pattern
   * Reset timeout de sesión
   */
  private resetSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.config.sessionTimeoutMs);
  }

  /**
   * ⏰ PATRÓN: Timeout Handling Pattern
   * Manejar timeout de sesión
   */
  private async handleSessionTimeout(): Promise<void> {
    this.emitEvent('session.timeout', {
      sessionId: this.currentSession?.sessionId,
      timestamp: Date.now()
    });

    await this.endSession();
  }

  /**
   * 💾 PATRÓN: Auto-save Pattern
   * Iniciar auto-save periódico
   */
  private startAutoSave(): void {
    setInterval(() => {
      if (this.currentSession) {
        this.persistSession(this.currentSession);
      }
    }, this.config.autoSaveIntervalMs);
  }

  /**
   * 🌐 PATRÓN: Page Lifecycle Pattern
   * Configurar listeners de página
   */
  private setupPageListeners(): void {
    // Finalizar sesión al cerrar página
    window.addEventListener('beforeunload', () => {
      if (this.currentSession) {
        this.endSession();
      }
    });

    // Pausar/reanudar sesión en cambio de visibilidad
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emitEvent('session.paused', {
          sessionId: this.currentSession?.sessionId,
          timestamp: Date.now()
        });
      } else {
        this.emitEvent('session.resumed', {
          sessionId: this.currentSession?.sessionId,
          timestamp: Date.now()
        });
        
        if (this.currentSession) {
          this.sendHeartbeat();
        }
      }
    });
  }

  /**
   * 🔧 PATRÓN: Utility Methods
   * Métodos utilitarios
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentTabId(): string {
    return this.currentSession?.tabId || 'unknown';
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private validateSessionUpdate(session: UserSession): ValidationResult {
    if (!session.sessionId) {
      return { isValid: false, error: 'Session ID is required' };
    }

    if (session.agentHistory.length > (this.config.maxSessionHistory || 10) * 2) {
      return { isValid: false, error: 'Agent history too large' };
    }

    return { isValid: true };
  }

  private loadSessionHistory(): UserSession[] {
    try {
      const stored = localStorage.getItem('session-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private addToSessionHistory(session: UserSession): void {
    try {
      const history = this.loadSessionHistory();
      history.push(session);
      
      // Limitar historial
      const limitedHistory = history.slice(-(this.config.maxSessionHistory || 10));
      localStorage.setItem('session-history', JSON.stringify(limitedHistory));
    } catch (error) {
      console.warn('Failed to save session to history:', error);
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
          console.error(`Error in session event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para Session Service
 */
export interface SessionServiceConfig {
  sessionTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  enableCrossTabSync?: boolean;
  enableAutoSave?: boolean;
  autoSaveIntervalMs?: number;
  maxSessionHistory?: number;
  enableSessionRecovery?: boolean;
}

export interface UserSession {
  sessionId: string;
  customerId?: string;
  startTime: Date;
  endTime?: Date;
  lastActivity: Date;
  currentAgent: SessionAgentInfo | null;
  agentHistory: SessionAgentHistory[];
  cartId: string | null;
  orderId: string | null;
  context: Record<string, unknown>;
  isActive: boolean;
  deviceInfo: DeviceInfo;
  tabId: string;
}

export interface SessionAgentInfo {
  agentId: string;
  agentType: string;
  startTime: Date;
  context: Record<string, unknown>;
}

export interface SessionAgentHistory extends SessionAgentInfo {
  endTime: Date;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timezone: string;
}

export interface SessionUpdateData {
  customerId?: string;
  currentAgent?: SessionAgentInfo;
  cartId?: string;
  orderId?: string;
  context?: Record<string, unknown>;
}

export interface SessionInitResult {
  success: boolean;
  message?: string;
  hasActiveSession?: boolean;
  error?: string;
}

export interface SessionCreateResult {
  success: boolean;
  sessionId?: string;
  session?: UserSession;
  error?: string;
}

export interface SessionUpdateResult {
  success: boolean;
  session?: UserSession;
  error?: string;
}

export interface SessionEndResult {
  success: boolean;
  sessionId?: string;
  duration?: number;
  error?: string;
}

export interface SessionHistoryResult {
  success: boolean;
  sessions?: UserSession[];
  total?: number;
  error?: string;
}

export interface HeartbeatResult {
  success: boolean;
  timestamp?: number;
  error?: string;
}

export interface CrossTabMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
