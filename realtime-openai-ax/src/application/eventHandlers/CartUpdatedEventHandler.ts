/**
 * 🏗️ PATRÓN: Event Handler Pattern (Event-Driven Architecture)
 * 🎯 PRINCIPIO: Cart Event Handling + Real-time Updates + Browser Sync
 * 
 * CartUpdatedEventHandler - Manejador para eventos de actualización del carrito
 * Optimizado para sincronización en tiempo real del carrito de compras
 */

import { BaseEventHandler, EventHandlerResult, SideEffect } from './BaseEventHandler';
import { CartUpdatedEvent } from '../../domain/events/CartUpdatedEvent';
import { DomainEvent } from '../../domain/events/DomainEvent';
// Cart and CartId imported in domain events

/**
 * 🎯 PATRÓN: Specific Event Handler Pattern
 * CartUpdatedEventHandler maneja específicamente eventos de actualización del carrito
 */
export class CartUpdatedEventHandler extends BaseEventHandler<CartUpdatedEvent> {
  
  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor específico para eventos de carrito
   */
  constructor(handlerId?: string) {
    super('CartUpdatedEvent', handlerId);
  }

  /**
   * 🛡️ PATRÓN: Event Type Validation Pattern
   * Verificar si puede manejar el evento
   */
  public canHandle(event: DomainEvent): boolean {
    return event.eventType === 'CartUpdatedEvent' && 
           event instanceof CartUpdatedEvent;
  }

  /**
   * 📊 PATRÓN: Event Handler Implementation Pattern
   * Implementación principal del manejo de eventos
   */
  public async handle(event: CartUpdatedEvent): Promise<EventHandlerResult> {
    try {
      this.log('info', 'Processing CartUpdatedEvent', {
        eventId: event.eventId,
        cartId: event.aggregateId,
        changeType: event.getChangeType(),
        itemCount: event.itemCount,
        totalAmount: event.total.getValue()
      });

      const sideEffects: SideEffect[] = [];

      // 1. Actualizar carrito en storage
      const storageResult = await this.updateCartInStorage(event);
      sideEffects.push(storageResult);

      // 2. Sincronizar con sesión activa
      const sessionResult = await this.syncWithActiveSession(event);
      sideEffects.push(sessionResult);

      // 3. Emitir evento de UI para actualizaciones en tiempo real
      const uiResult = this.emitCartUpdateEvent(event);
      sideEffects.push(uiResult);

      // 4. Procesar actualización específica por tipo
      const specificResult = await this.processSpecificUpdate(event);
      if (specificResult) {
        sideEffects.push(specificResult);
      }

      // 5. Actualizar recomendaciones
      const recommendationsResult = await this.updateRecommendations(event);
      sideEffects.push(recommendationsResult);

      // 6. Actualizar métricas del carrito
      const metricsResult = this.updateCartMetrics(event);
      sideEffects.push(metricsResult);

      // 7. Verificar reglas de negocio
      const businessRulesResult = await this.checkBusinessRules(event);
      if (businessRulesResult) {
        sideEffects.push(businessRulesResult);
      }

      const successfulSideEffects = sideEffects.filter(se => se.success);
      const failedSideEffects = sideEffects.filter(se => !se.success);

      return {
        success: failedSideEffects.length === 0,
        message: `Cart updated successfully. ${successfulSideEffects.length} side effects completed.`,
        sideEffects,
        error: failedSideEffects.length > 0 ? 
          `${failedSideEffects.length} side effects failed` : undefined
      };

    } catch (error) {
      this.log('error', 'Failed to handle CartUpdatedEvent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 💾 PATRÓN: Storage Update Pattern
   * Actualizar carrito en browser storage
   */
  private async updateCartInStorage(event: CartUpdatedEvent): Promise<SideEffect> {
    try {
      const cartKey = this.getStorageKey('cart', event.aggregateId);
      const existingCartData = this.getBrowserStorage(cartKey) as Record<string, unknown>;

      if (!existingCartData) {
        // Crear nuevo carrito si no existe
        const newCartData = this.createCartDataFromEvent(event);
        this.setBrowserStorage(cartKey, newCartData);
        
        return {
          type: 'STORAGE_UPDATE',
          description: 'New cart created in storage',
          success: true,
          data: { cartId: event.aggregateId, action: 'created' }
        };
      }

      // Actualizar carrito existente
      const updatedCartData = this.applyUpdateToCartData(existingCartData, event);
      this.setBrowserStorage(cartKey, updatedCartData);

      // Actualizar índices
      await this.updateCartIndices(event, updatedCartData);

      return {
        type: 'STORAGE_UPDATE',
        description: `Cart ${event.aggregateId} updated in storage`,
        success: true,
          data: {
            cartId: event.aggregateId,
            updateType: event.getChangeType(),
            itemCount: event.itemCount,
            totalAmount: event.total.getValue()
          }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update cart in storage',
        success: false,
        error: error instanceof Error ? error.message : 'Storage update failed'
      };
    }
  }

  /**
   * 🏗️ PATRÓN: Cart Data Creation Pattern
   * Crear datos de carrito desde evento
   */
  private createCartDataFromEvent(event: CartUpdatedEvent): Record<string, unknown> {
    return {
      id: event.aggregateId,
      customerId: event.payload.customerId as string,
      sessionId: event.payload.sessionId as string,
      items: event.items || [],
      itemCount: event.itemCount || 0,
      totalAmount: event.total.getValue() || 0,
      isActive: true,
      createdAt: event.occurredOn,
      updatedAt: event.occurredOn,
      lastUpdateType: event.getChangeType()
    };
  }

  /**
   * 🔄 PATRÓN: Data Update Application Pattern
   * Aplicar actualización específica a los datos del carrito
   */
  private applyUpdateToCartData(cartData: Record<string, unknown>, event: CartUpdatedEvent): Record<string, unknown> {
    const updatedData = { ...cartData };
    updatedData.updatedAt = event.occurredOn;
    updatedData.lastUpdateType = event.getChangeType();

    switch (event.getChangeType()) {
      case 'ITEM_ADDED':
        updatedData.items = event.items || updatedData.items;
        updatedData.itemCount = event.itemCount || updatedData.itemCount;
        updatedData.totalAmount = event.total.getValue() || updatedData.totalAmount;
        break;

      case 'ITEM_REMOVED':
        updatedData.items = event.items || updatedData.items;
        updatedData.itemCount = event.itemCount || updatedData.itemCount;
        updatedData.totalAmount = event.total.getValue() || updatedData.totalAmount;
        break;

      case 'ITEM_UPDATED':
        updatedData.items = event.items || updatedData.items;
        updatedData.itemCount = event.itemCount || updatedData.itemCount;
        updatedData.totalAmount = event.total.getValue() || updatedData.totalAmount;
        break;

      case 'CLEARED':
        updatedData.items = [];
        updatedData.itemCount = 0;
        updatedData.totalAmount = 0;
        break;

      default:
        // Actualización genérica
        if (event.items !== undefined) updatedData.items = event.items;
        if (event.itemCount !== undefined) updatedData.itemCount = event.itemCount;
        if (event.total !== undefined) updatedData.totalAmount = event.total.getValue();
    }

    return updatedData;
  }

  /**
   * 🎮 PATRÓN: Session Synchronization Pattern
   * Sincronizar carrito con sesión activa
   */
  private async syncWithActiveSession(event: CartUpdatedEvent): Promise<SideEffect> {
    try {
      const sessionId = event.payload.sessionId as string;
      if (!sessionId) {
        return {
          type: 'STORAGE_UPDATE',
          description: 'No session ID provided, skipping session sync',
          success: true
        };
      }

      const sessionCartKey = this.getStorageKey('session-cart', sessionId);
      this.setBrowserStorage(sessionCartKey, event.aggregateId);

      // Actualizar información de sesión
      const sessionKey = this.getStorageKey('session', sessionId);
        const sessionData = this.getBrowserStorage(sessionKey) as Record<string, unknown> || {};
      
      sessionData.cartId = event.aggregateId;
      sessionData.cartItemCount = event.itemCount;
      sessionData.cartTotalAmount = event.total.getValue();
      sessionData.lastCartUpdate = event.occurredOn;

      this.setBrowserStorage(sessionKey, sessionData);

      return {
        type: 'STORAGE_UPDATE',
        description: `Cart synchronized with session ${sessionId}`,
        success: true,
        data: { sessionId: sessionId, cartId: event.aggregateId }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to sync cart with session',
        success: false,
        error: error instanceof Error ? error.message : 'Session sync failed'
      };
    }
  }

  /**
   * 📡 PATRÓN: UI Event Broadcasting Pattern
   * Emitir evento para actualizaciones de UI en tiempo real
   */
  private emitCartUpdateEvent(event: CartUpdatedEvent): SideEffect {
    try {
      const uiEventData = {
        type: 'CART_UPDATED',
        cartId: event.aggregateId,
        updateType: event.getChangeType(),
        itemCount: event.itemCount,
        totalAmount: event.total.getValue(),
        items: event.items,
        timestamp: event.occurredOn,
        sessionId: event.payload.sessionId as string
      };

      this.emitBrowserEvent('realtime-cart-update', uiEventData);

      return {
        type: 'UI_UPDATE',
        description: 'Cart update event emitted to UI',
        success: true,
        data: uiEventData
      };

    } catch (error) {
      return {
        type: 'UI_UPDATE',
        description: 'Failed to emit cart update event',
        success: false,
        error: error instanceof Error ? error.message : 'UI event failed'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Specific Update Processing Pattern
   * Procesamiento específico según el tipo de actualización
   */
  private async processSpecificUpdate(event: CartUpdatedEvent): Promise<SideEffect | null> {
    switch (event.getChangeType()) {
      case 'ITEM_ADDED':
        return this.processItemAdded(event);
      
      case 'ITEM_REMOVED':
        return this.processItemRemoved(event);
      
      case 'CLEARED':
        return this.processCartCleared(event);
      
      default:
        return null;
    }
  }

  /**
   * ➕ PATRÓN: Item Added Processing Pattern
   * Procesar adición de items específicos
   */
  private processItemAdded(event: CartUpdatedEvent): SideEffect {
    try {
      // Emitir evento específico de item agregado
      const addedItem = event.items[event.items.length - 1] || null;
      this.emitBrowserEvent('realtime-item-added-to-cart', {
        cartId: event.aggregateId,
        addedItem: addedItem,
        newItemCount: event.itemCount,
        newTotalAmount: event.total.getValue(),
        timestamp: event.occurredOn
      });

      // Actualizar popularidad del item
      if (addedItem?.menuItemName) {
        this.updateItemPopularity(addedItem.menuItemName, 1);
      }

      return {
        type: 'BROWSER_EVENT',
        description: `Item added to cart: ${addedItem?.menuItemName || 'Unknown'}`,
        success: true,
        data: { addedItem: addedItem }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process item addition',
        success: false,
        error: error instanceof Error ? error.message : 'Item addition failed'
      };
    }
  }

  /**
   * ➖ PATRÓN: Item Removed Processing Pattern
   * Procesar eliminación de items específicos
   */
  private processItemRemoved(event: CartUpdatedEvent): SideEffect {
    try {
      // Emitir evento específico de item removido
      const removedItem = event.payload.removedItem as Record<string, unknown> || null;
      this.emitBrowserEvent('realtime-item-removed-from-cart', {
        cartId: event.aggregateId,
        removedItem: removedItem,
        newItemCount: event.itemCount,
        newTotalAmount: event.total.getValue(),
        timestamp: event.occurredOn
      });

      return {
        type: 'BROWSER_EVENT',
        description: `Item removed from cart: ${(removedItem as any)?.menuItemName || 'Unknown'}`,
        success: true,
        data: { removedItem: removedItem }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process item removal',
        success: false,
        error: error instanceof Error ? error.message : 'Item removal failed'
      };
    }
  }

  /**
   * 🗑️ PATRÓN: Cart Cleared Processing Pattern
   * Procesar limpieza completa del carrito
   */
  private processCartCleared(event: CartUpdatedEvent): SideEffect {
    try {
      // Emitir evento específico de carrito limpiado
      this.emitBrowserEvent('realtime-cart-cleared', {
        cartId: event.aggregateId,
        previousItemCount: event.payload.previousItemCount as number || 0,
        timestamp: event.occurredOn
      });

      return {
        type: 'BROWSER_EVENT',
        description: 'Cart cleared successfully',
        success: true,
        data: { cartId: event.aggregateId }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process cart clearing',
        success: false,
        error: error instanceof Error ? error.message : 'Cart clearing failed'
      };
    }
  }

  /**
   * 💡 PATRÓN: Recommendations Update Pattern
   * Actualizar recomendaciones basadas en el carrito
   */
  private async updateRecommendations(event: CartUpdatedEvent): Promise<SideEffect> {
    try {
      const recommendations = this.generateRecommendations(event);
      const recommendationsKey = this.getStorageKey('cart-recommendations', event.aggregateId);
      
      this.setBrowserStorage(recommendationsKey, {
        cartId: event.aggregateId,
        recommendations,
        generatedAt: event.occurredOn,
        basedOnItems: event.items?.map(item => item.menuItemName) || []
      });

      // Emitir evento de recomendaciones actualizadas
      this.emitBrowserEvent('realtime-recommendations-updated', {
        cartId: event.aggregateId,
        recommendations,
        timestamp: event.occurredOn
      });

      return {
        type: 'STORAGE_UPDATE',
        description: `${recommendations.length} recommendations generated`,
        success: true,
        data: { recommendationCount: recommendations.length }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update recommendations',
        success: false,
        error: error instanceof Error ? error.message : 'Recommendations update failed'
      };
    }
  }

  /**
   * 💡 PATRÓN: Recommendation Generation Pattern
   * Generar recomendaciones inteligentes
   */
  private generateRecommendations(event: CartUpdatedEvent): CartRecommendation[] {
    const recommendations: CartRecommendation[] = [];
    const items = event.items || [];
    const itemNames = items.map(item => item.menuItemName?.toLowerCase() || '');

    // Recomendación de bebida
    const hasDrink = itemNames.some(name => 
      name.includes('combo') || name.includes('soda') || name.includes('drink')
    );
    if (!hasDrink && items.length > 0) {
      recommendations.push({
        type: 'COMPLEMENT',
        title: 'Add a Drink',
        description: 'Complete your meal with a refreshing beverage',
        suggestedItems: ['Combo Postobón', 'Manzana Postobón'],
        priority: 'HIGH',
        reason: 'Popular combo addition'
      });
    }

    // Recomendación de acompañamiento
    const hasSides = itemNames.some(name => name.includes('fries'));
    const hasBurger = itemNames.some(name => name.includes('burger'));
    if (hasBurger && !hasSides) {
      recommendations.push({
        type: 'COMPLEMENT',
        title: 'Add Fries',
        description: 'Perfect side for your burger',
        suggestedItems: ['Fries'],
        priority: 'MEDIUM',
        reason: 'Classic burger combo'
      });
    }

    // Recomendación por cantidad
    if (items.length >= 3) {
      recommendations.push({
        type: 'UPSELL',
        title: 'Try Our Apple Pie',
        description: 'Sweet ending to your meal',
        suggestedItems: ['Apple Pie'],
        priority: 'LOW',
        reason: 'Popular dessert choice'
      });
    }

    return recommendations;
  }

  /**
   * 📊 PATRÓN: Metrics Update Pattern
   * Actualizar métricas del carrito
   */
  private updateCartMetrics(event: CartUpdatedEvent): SideEffect {
    try {
      const metricsKey = this.getStorageKey('cart-metrics');
      const metrics = this.getBrowserStorage(metricsKey) as Record<string, unknown> || {
        totalUpdates: 0,
        updatesByType: {},
        averageItemCount: 0,
        averageTotalAmount: 0,
        lastUpdate: null
      };

      (metrics.totalUpdates as number)++;
      const updateType = event.getChangeType();
      (metrics.updatesByType as Record<string, number>)[updateType] = ((metrics.updatesByType as Record<string, number>)[updateType] || 0) + 1;
      metrics.lastUpdate = event.occurredOn;

      // Actualizar promedios (simplificado)
      if (event.itemCount !== undefined) {
        metrics.averageItemCount = ((metrics.averageItemCount as number) + event.itemCount) / 2;
      }
      if (event.total !== undefined) {
        metrics.averageTotalAmount = ((metrics.averageTotalAmount as number) + event.total.getValue()) / 2;
      }

      this.setBrowserStorage(metricsKey, metrics);

      return {
        type: 'STORAGE_UPDATE',
        description: 'Cart metrics updated',
        success: true,
        data: metrics
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update cart metrics',
        success: false,
        error: error instanceof Error ? error.message : 'Metrics update failed'
      };
    }
  }

  /**
   * 📋 PATRÓN: Business Rules Check Pattern
   * Verificar reglas de negocio del carrito
   */
  private async checkBusinessRules(event: CartUpdatedEvent): Promise<SideEffect | null> {
    try {
      const violations: string[] = [];

      // Verificar límite máximo de items
      if (event.itemCount && event.itemCount > 20) {
        violations.push('Cart exceeds maximum item limit (20)');
      }

      // Verificar monto mínimo para delivery
      const totalAmount = event.total.getValue();
      if (totalAmount && totalAmount < 10) {
        violations.push('Minimum order amount for delivery is $10');
      }

      // Verificar monto máximo
      if (totalAmount && totalAmount > 500) {
        violations.push('Order amount exceeds maximum limit ($500)');
      }

      if (violations.length === 0) {
        return null;
      }

      // Emitir evento de violaciones de reglas de negocio
      this.emitBrowserEvent('realtime-business-rules-violation', {
        cartId: event.aggregateId,
        violations,
        timestamp: event.occurredOn
      });

      return {
        type: 'BROWSER_EVENT',
        description: `${violations.length} business rule violations detected`,
        success: true,
        data: { violations }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to check business rules',
        success: false,
        error: error instanceof Error ? error.message : 'Business rules check failed'
      };
    }
  }

  /**
   * 🔗 PATRÓN: Index Update Pattern
   * Actualizar índices de búsqueda del carrito
   */
  private async updateCartIndices(event: CartUpdatedEvent, cartData: Record<string, unknown>): Promise<void> {
    // Actualizar índice por customer si existe
    if (cartData.customerId) {
      const customerCartKey = this.getStorageKey('customer-cart', cartData.customerId as string);
      this.setBrowserStorage(customerCartKey, event.aggregateId);
    }

    // Actualizar índice por sesión si existe
    if (cartData.sessionId) {
      const sessionCartKey = this.getStorageKey('session-cart', cartData.sessionId as string);
      this.setBrowserStorage(sessionCartKey, event.aggregateId);
    }
  }

  /**
   * 📈 PATRÓN: Item Popularity Tracking Pattern
   * Actualizar popularidad de items
   */
  private updateItemPopularity(itemName: string, increment: number): void {
    try {
      const popularityKey = this.getStorageKey('item-popularity');
      const popularity = this.getBrowserStorage(popularityKey) as Record<string, number> || {};
      
      popularity[itemName] = (popularity[itemName] || 0) + increment;
      
      this.setBrowserStorage(popularityKey, popularity);
    } catch (error) {
      this.log('warn', 'Failed to update item popularity', error);
    }
  }
}

/**
 * 📊 PATRÓN: Recommendation Interface Pattern
 * Interface para recomendaciones del carrito
 */
export interface CartRecommendation {
  type: 'COMPLEMENT' | 'UPSELL' | 'COMBO' | 'POPULAR';
  title: string;
  description: string;
  suggestedItems: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}
