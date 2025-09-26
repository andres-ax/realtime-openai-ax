/**
 * 🏗️ PATRÓN: Real-time Synchronization Service Pattern
 * 🎯 PRINCIPIO: Cart State Management + Real-time Updates
 * 
 * CartSyncService - Servicio de sincronización de carrito en tiempo real
 * Maneja actualizaciones bidireccionales entre UI, storage y agentes
 */

// Cart import removido - no se usa
import type { CartId } from '../../domain/valueObjects/CartId';
// CustomerId import removido - no se usa
// AgentType import removido - no se usa
import type { CartUpdatedEvent } from '../../domain/events/CartUpdatedEvent';

/**
 * 🎯 PATRÓN: Real-time Cart Synchronization Pattern
 * CartSyncService maneja sincronización completa del carrito
 */
export class CartSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private cartCache: Map<string, CachedCartData> = new Map();
  private syncQueue: CartSyncOperation[] = [];
  private isProcessingQueue = false;

  /**
   * 🔧 PATRÓN: Configuration Pattern
   * Constructor con configuración de sincronización
   */
  constructor(private readonly config: CartSyncConfig) {
    this.config = {
      syncIntervalMs: 1000, // 1 segundo
      maxRetries: 3,
      batchSize: 10,
      enableOptimisticUpdates: true,
      enableConflictResolution: true,
      cacheExpirationMs: 300000, // 5 minutos
      ...config
    };
  }

  /**
   * 🚀 PATRÓN: Initialization Pattern
   * Inicializar servicio de sincronización
   */
  public async initialize(): Promise<CartSyncInitResult> {
    try {
      // 1. Limpiar cache expirado
      this.cleanExpiredCache();

      // 2. Iniciar sincronización periódica
      this.startPeriodicSync();

      // 3. Configurar event listeners para storage
      this.setupStorageListeners();

      this.emitEvent('cart.sync.initialized', {
        syncInterval: this.config.syncIntervalMs,
        cacheSize: this.cartCache.size,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'Cart sync service initialized successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize cart sync service'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Cart Update Pattern
   * Sincronizar actualización de carrito
   */
  public async syncCartUpdate(
    cartId: CartId,
    updateData: CartUpdateData,
    source: CartUpdateSource
  ): Promise<CartSyncResult> {
    try {
      const operation: CartSyncOperation = {
        id: this.generateOperationId(),
        type: 'update',
        cartId: cartId.toString(),
        data: updateData,
        source,
        timestamp: Date.now(),
        retries: 0
      };

      // 1. Aplicar actualización optimista si está habilitada
      if (this.config.enableOptimisticUpdates && source === 'ui') {
        await this.applyOptimisticUpdate(operation);
      }

      // 2. Agregar a cola de sincronización
      this.syncQueue.push(operation);

      // 3. Procesar cola si no está en proceso
      if (!this.isProcessingQueue) {
        this.processQueue();
      }

      this.emitEvent('cart.sync.queued', {
        operationId: operation.id,
        cartId: cartId.toString(),
        source,
        queueSize: this.syncQueue.length,
        timestamp: Date.now()
      });

      return {
        success: true,
        operationId: operation.id,
        appliedOptimistically: this.config.enableOptimisticUpdates && source === 'ui'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync cart update'
      };
    }
  }

  /**
   * 📊 PATRÓN: Cart State Query Pattern
   * Obtener estado actual del carrito
   */
  public async getCartState(cartId: CartId): Promise<CartStateResult> {
    try {
      const cartKey = cartId.toString();
      
      // 1. Verificar cache primero
      const cached = this.cartCache.get(cartKey);
      if (cached && !this.isCacheExpired(cached)) {
        return {
          success: true,
          cart: cached.cart,
          lastUpdated: cached.lastUpdated,
          source: 'cache'
        };
      }

      // 2. Cargar desde storage
      const storageData = this.loadCartFromStorage(cartKey);
      if (storageData) {
        // Actualizar cache
        this.updateCache(cartKey, storageData, 'storage');
        
        return {
          success: true,
          cart: storageData,
          lastUpdated: new Date(),
          source: 'storage'
        };
      }

      // 3. No encontrado
      return {
        success: false,
        error: 'Cart not found'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cart state'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Event Broadcasting Pattern
   * Broadcast actualización a todos los listeners
   */
  public async broadcastCartUpdate(event: CartUpdatedEvent): Promise<BroadcastResult> {
    try {
      const cartKey = event.cartId.toString();
      
      // 1. Actualizar cache local
      const cartData = this.convertEventToCartData(event);
      this.updateCache(cartKey, cartData, 'event');

      // 2. Broadcast a UI components
      this.emitEvent('cart.updated', {
        cartId: cartKey,
        items: event.items,
        total: event.total.getValue(),
        itemCount: event.itemCount,
        timestamp: event.updatedAt
      });

      // 3. Broadcast a agentes si es necesario
      await this.broadcastToAgents(event);

      // 4. Actualizar storage
      this.saveCartToStorage(cartKey, cartData);

      this.emitEvent('cart.broadcast.completed', {
        cartId: cartKey,
        listenersNotified: this.getListenerCount('cart.updated'),
        timestamp: Date.now()
      });

      return {
        success: true,
        listenersNotified: this.getListenerCount('cart.updated')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast cart update'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Conflict Resolution Pattern
   * Resolver conflictos de sincronización
   */
  public async resolveConflict(
    cartId: CartId,
    localData: CartUpdateData,
    remoteData: CartUpdateData
  ): Promise<ConflictResolutionResult> {
    try {
      if (!this.config.enableConflictResolution) {
        return {
          success: false,
          error: 'Conflict resolution is disabled'
        };
      }

      // 1. Determinar estrategia de resolución
      const strategy = this.determineResolutionStrategy(localData, remoteData);

      // 2. Aplicar resolución
      const resolvedData = await this.applyResolutionStrategy(strategy, localData, remoteData);

      // 3. Aplicar datos resueltos
      await this.syncCartUpdate(cartId, resolvedData, 'conflict_resolution');

      this.emitEvent('cart.conflict.resolved', {
        cartId: cartId.toString(),
        strategy,
        localTimestamp: localData.timestamp,
        remoteTimestamp: remoteData.timestamp,
        timestamp: Date.now()
      });

      return {
        success: true,
        strategy,
        resolvedData
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict'
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
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.cartCache.clear();
    this.syncQueue.length = 0;
    this.eventListeners.clear();
    this.isProcessingQueue = false;
  }

  /**
   * 🔄 PATRÓN: Periodic Sync Pattern
   * Iniciar sincronización periódica
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      this.performPeriodicSync();
    }, this.config.syncIntervalMs);
  }

  /**
   * 🔄 PATRÓN: Periodic Sync Execution Pattern
   * Ejecutar sincronización periódica
   */
  private async performPeriodicSync(): Promise<void> {
    try {
      // 1. Limpiar cache expirado
      this.cleanExpiredCache();

      // 2. Procesar cola pendiente
      if (!this.isProcessingQueue && this.syncQueue.length > 0) {
        this.processQueue();
      }

      // 3. Verificar inconsistencias
      await this.checkForInconsistencies();

    } catch (error) {
      this.emitEvent('cart.sync.error', {
        error: error instanceof Error ? error.message : 'Periodic sync failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 📋 PATRÓN: Queue Processing Pattern
   * Procesar cola de operaciones
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const batch = this.syncQueue.splice(0, this.config.batchSize);
      
      for (const operation of batch) {
        try {
          await this.processOperation(operation);
        } catch (error) {
          await this.handleOperationError(operation, error);
        }
      }

    } finally {
      this.isProcessingQueue = false;
      
      // Procesar siguiente batch si hay más operaciones
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  /**
   * ⚙️ PATRÓN: Operation Processing Pattern
   * Procesar operación individual
   */
  private async processOperation(operation: CartSyncOperation): Promise<void> {
    switch (operation.type) {
      case 'update':
        await this.processUpdateOperation(operation);
        break;
      case 'delete':
        await this.processDeleteOperation(operation);
        break;
      case 'sync':
        await this.processSyncOperation(operation);
        break;
    }

    this.emitEvent('cart.operation.processed', {
      operationId: operation.id,
      type: operation.type,
      cartId: operation.cartId,
      timestamp: Date.now()
    });
  }

  /**
   * 🔄 PATRÓN: Update Operation Pattern
   * Procesar operación de actualización
   */
  private async processUpdateOperation(operation: CartSyncOperation): Promise<void> {
    const cartData = operation.data as CartUpdateData;
    
    // 1. Actualizar storage
    this.saveCartToStorage(operation.cartId, cartData);
    
    // 2. Actualizar cache
    this.updateCache(operation.cartId, cartData, operation.source);
    
    // 3. Broadcast si no viene de UI (evitar loops)
    if (operation.source !== 'ui') {
      this.emitEvent('cart.updated', {
        cartId: operation.cartId,
        ...cartData,
        timestamp: operation.timestamp
      });
    }
  }

  /**
   * 🗑️ PATRÓN: Delete Operation Pattern
   * Procesar operación de eliminación
   */
  private async processDeleteOperation(operation: CartSyncOperation): Promise<void> {
    // 1. Remover de storage
    this.removeCartFromStorage(operation.cartId);
    
    // 2. Remover de cache
    this.cartCache.delete(operation.cartId);
    
    // 3. Broadcast eliminación
    this.emitEvent('cart.deleted', {
      cartId: operation.cartId,
      timestamp: operation.timestamp
    });
  }

  /**
   * 🔄 PATRÓN: Sync Operation Pattern
   * Procesar operación de sincronización
   */
  private async processSyncOperation(operation: CartSyncOperation): Promise<void> {
    // Verificar y sincronizar estado con storage
    const storageData = this.loadCartFromStorage(operation.cartId);
    const cachedData = this.cartCache.get(operation.cartId);
    
    if (storageData && cachedData && this.hasDataChanged(storageData, cachedData.cart)) {
      this.updateCache(operation.cartId, storageData, 'storage');
      
      this.emitEvent('cart.synced', {
        cartId: operation.cartId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * ❌ PATRÓN: Error Handling Pattern
   * Manejar error de operación
   */
  private async handleOperationError(operation: CartSyncOperation, error: unknown): Promise<void> {
    operation.retries++;
    
    if (operation.retries < (this.config.maxRetries || 3)) {
      // Reintroducir en la cola para retry
      this.syncQueue.unshift(operation);
    } else {
      // Máximo de reintentos alcanzado
      this.emitEvent('cart.operation.failed', {
        operationId: operation.id,
        cartId: operation.cartId,
        error: error instanceof Error ? error.message : 'Unknown error',
        retries: operation.retries,
        timestamp: Date.now()
      });
    }
  }

  /**
   * ⚡ PATRÓN: Optimistic Update Pattern
   * Aplicar actualización optimista
   */
  private async applyOptimisticUpdate(operation: CartSyncOperation): Promise<void> {
    const cartData = operation.data as CartUpdateData;
    
    // Actualizar cache inmediatamente
    this.updateCache(operation.cartId, cartData, 'optimistic');
    
    // Broadcast inmediato a UI
    this.emitEvent('cart.updated', {
      cartId: operation.cartId,
      ...cartData,
      optimistic: true,
      timestamp: operation.timestamp
    });
  }

  /**
   * 📊 PATRÓN: Cache Management Pattern
   * Actualizar cache
   */
  private updateCache(cartId: string, cartData: CartUpdateData, source: string): void {
    this.cartCache.set(cartId, {
      cart: cartData,
      lastUpdated: new Date(),
      source,
      expiresAt: Date.now() + (this.config.cacheExpirationMs || 300000)
    });
  }

  /**
   * 🧹 PATRÓN: Cache Cleanup Pattern
   * Limpiar cache expirado
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [cartId, cached] of this.cartCache.entries()) {
      if (cached.expiresAt < now) {
        this.cartCache.delete(cartId);
      }
    }
  }

  /**
   * ⏰ PATRÓN: Cache Expiration Check Pattern
   * Verificar si cache está expirado
   */
  private isCacheExpired(cached: CachedCartData): boolean {
    return cached.expiresAt < Date.now();
  }

  /**
   * 💾 PATRÓN: Storage Operations Pattern
   * Operaciones de storage
   */
  private loadCartFromStorage(cartId: string): CartUpdateData | null {
    try {
      const stored = localStorage.getItem(`cart:${cartId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveCartToStorage(cartId: string, cartData: CartUpdateData): void {
    try {
      localStorage.setItem(`cart:${cartId}`, JSON.stringify(cartData));
    } catch (error) {
      this.emitEvent('cart.storage.error', {
        cartId,
        error: error instanceof Error ? error.message : 'Storage save failed',
        timestamp: Date.now()
      });
    }
  }

  private removeCartFromStorage(cartId: string): void {
    try {
      localStorage.removeItem(`cart:${cartId}`);
    } catch (error) {
      this.emitEvent('cart.storage.error', {
        cartId,
        error: error instanceof Error ? error.message : 'Storage remove failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 🔍 PATRÓN: Data Comparison Pattern
   * Verificar si los datos han cambiado
   */
  private hasDataChanged(data1: CartUpdateData, data2: CartUpdateData): boolean {
    return JSON.stringify(data1) !== JSON.stringify(data2);
  }

  /**
   * 🔄 PATRÓN: Event Conversion Pattern
   * Convertir evento a datos de carrito
   */
  private convertEventToCartData(event: CartUpdatedEvent): CartUpdateData {
    return {
      items: event.items.map(item => ({
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.getValue(),
        subtotal: item.subtotal.getValue()
      })),
      total: event.total.getValue(),
      itemCount: event.itemCount,
      timestamp: event.updatedAt.getTime()
    };
  }

  /**
   * 🤖 PATRÓN: Agent Broadcasting Pattern
   * Broadcast a agentes
   */
  private async broadcastToAgents(event: CartUpdatedEvent): Promise<void> {
    // Implementación simplificada - en producción se conectaría con AgentService
    this.emitEvent('cart.agent.broadcast', {
      cartId: event.cartId.toString(),
      items: event.items,
      total: event.total.getValue(),
      timestamp: event.updatedAt
    });
  }

  /**
   * 🔧 PATRÓN: Utility Methods
   * Métodos utilitarios
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getListenerCount(eventType: string): number {
    return this.eventListeners.get(eventType)?.length || 0;
  }

  private setupStorageListeners(): void {
    // Escuchar cambios en localStorage de otros tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('cart:')) {
        const cartId = event.key.replace('cart:', '');
        this.emitEvent('cart.storage.changed', {
          cartId,
          oldValue: event.oldValue,
          newValue: event.newValue,
          timestamp: Date.now()
        });
      }
    });
  }

  private async checkForInconsistencies(): Promise<void> {
    // Verificar inconsistencias entre cache y storage
    for (const [cartId, cached] of this.cartCache.entries()) {
      const storageData = this.loadCartFromStorage(cartId);
      
      if (storageData && this.hasDataChanged(storageData, cached.cart)) {
        this.emitEvent('cart.inconsistency.detected', {
          cartId,
          cacheData: cached.cart,
          storageData,
          timestamp: Date.now()
        });
      }
    }
  }

  private determineResolutionStrategy(
    localData: CartUpdateData,
    remoteData: CartUpdateData
  ): ConflictResolutionStrategy {
    // Estrategia simple: último timestamp gana
    if (localData.timestamp > remoteData.timestamp) {
      return 'local_wins';
    } else if (remoteData.timestamp > localData.timestamp) {
      return 'remote_wins';
    } else {
      return 'merge';
    }
  }

  private async applyResolutionStrategy(
    strategy: ConflictResolutionStrategy,
    localData: CartUpdateData,
    remoteData: CartUpdateData
  ): Promise<CartUpdateData> {
    switch (strategy) {
      case 'local_wins':
        return localData;
      case 'remote_wins':
        return remoteData;
      case 'merge':
        return this.mergeCartData(localData, remoteData);
      default:
        return localData;
    }
  }

  private mergeCartData(local: CartUpdateData, remote: CartUpdateData): CartUpdateData {
    // Merge simple - combinar items únicos
    const mergedItems = [...local.items];
    
    remote.items.forEach(remoteItem => {
      const existingIndex = mergedItems.findIndex(
        item => item.menuItemName === remoteItem.menuItemName
      );
      
      if (existingIndex === -1) {
        mergedItems.push(remoteItem);
      } else {
        // Usar cantidad mayor
        if (remoteItem.quantity > mergedItems[existingIndex].quantity) {
          mergedItems[existingIndex] = remoteItem;
        }
      }
    });

    return {
      items: mergedItems,
      total: Math.max(local.total, remote.total),
      itemCount: mergedItems.length,
      timestamp: Math.max(local.timestamp, remote.timestamp)
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
          console.error(`Error in cart sync event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para Cart Sync Service
 */
export interface CartSyncConfig {
  syncIntervalMs?: number;
  maxRetries?: number;
  batchSize?: number;
  enableOptimisticUpdates?: boolean;
  enableConflictResolution?: boolean;
  cacheExpirationMs?: number;
}

export interface CartSyncInitResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CartUpdateData {
  items: Array<{
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  total: number;
  itemCount: number;
  timestamp: number;
}

export type CartUpdateSource = 'ui' | 'agent' | 'storage' | 'event' | 'optimistic' | 'conflict_resolution';

export interface CartSyncOperation {
  id: string;
  type: 'update' | 'delete' | 'sync';
  cartId: string;
  data?: CartUpdateData;
  source: CartUpdateSource;
  timestamp: number;
  retries: number;
}

export interface CartSyncResult {
  success: boolean;
  operationId?: string;
  appliedOptimistically?: boolean;
  error?: string;
}

export interface CartStateResult {
  success: boolean;
  cart?: CartUpdateData;
  lastUpdated?: Date;
  source?: string;
  error?: string;
}

export interface BroadcastResult {
  success: boolean;
  listenersNotified?: number;
  error?: string;
}

export interface CachedCartData {
  cart: CartUpdateData;
  lastUpdated: Date;
  source: string;
  expiresAt: number;
}

export type ConflictResolutionStrategy = 'local_wins' | 'remote_wins' | 'merge';

export interface ConflictResolutionResult {
  success: boolean;
  strategy?: ConflictResolutionStrategy;
  resolvedData?: CartUpdateData;
  error?: string;
}
