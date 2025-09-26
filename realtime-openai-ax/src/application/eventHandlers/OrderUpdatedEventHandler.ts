/**
 * 🏗️ PATRÓN: Event Handler Pattern (Event-Driven Architecture)
 * 🎯 PRINCIPIO: Order Event Handling + Real-time Updates + Browser Demo
 * 
 * OrderUpdatedEventHandler - Manejador para eventos de actualización de pedidos
 * Optimizado para demostración con actualizaciones en tiempo real
 */

import { BaseEventHandler, EventHandlerResult, SideEffect } from './BaseEventHandler';
import { OrderUpdatedEvent } from '../../domain/events/OrderUpdatedEvent';
import { DomainEvent } from '../../domain/events/DomainEvent';
// Order and OrderId imported in domain events

/**
 * 🎯 PATRÓN: Specific Event Handler Pattern
 * OrderUpdatedEventHandler maneja específicamente eventos de actualización de pedidos
 */
export class OrderUpdatedEventHandler extends BaseEventHandler<OrderUpdatedEvent> {
  
  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor específico para eventos de pedidos
   */
  constructor(handlerId?: string) {
    super('OrderUpdatedEvent', handlerId);
  }

  /**
   * 🛡️ PATRÓN: Event Type Validation Pattern
   * Verificar si puede manejar el evento
   */
  public canHandle(event: DomainEvent): boolean {
    return event.eventType === 'OrderUpdatedEvent' && 
           event instanceof OrderUpdatedEvent;
  }

  /**
   * 📊 PATRÓN: Event Handler Implementation Pattern
   * Implementación principal del manejo de eventos
   */
  public async handle(event: OrderUpdatedEvent): Promise<EventHandlerResult> {
    try {
      this.log('info', 'Processing OrderUpdatedEvent', {
        eventId: event.eventId,
        orderId: event.aggregateId,
        updateType: event.updateType
      });

      const sideEffects: SideEffect[] = [];

      // 1. Actualizar orden en storage
      const storageResult = await this.updateOrderInStorage(event);
      sideEffects.push(storageResult);

      // 2. Emitir evento de UI para actualizaciones en tiempo real
      const uiResult = this.emitUIUpdateEvent(event);
      sideEffects.push(uiResult);

      // 3. Procesar actualizaciones específicas por tipo
      const specificResult = await this.processSpecificUpdate(event);
      if (specificResult) {
        sideEffects.push(specificResult);
      }

      // 4. Actualizar métricas y analytics
      const metricsResult = this.updateMetrics(event);
      sideEffects.push(metricsResult);

      // 5. Verificar si necesita notificaciones
      const notificationResult = await this.checkNotifications(event);
      if (notificationResult) {
        sideEffects.push(notificationResult);
      }

      const successfulSideEffects = sideEffects.filter(se => se.success);
      const failedSideEffects = sideEffects.filter(se => !se.success);

      return {
        success: failedSideEffects.length === 0,
        message: `Order updated successfully. ${successfulSideEffects.length} side effects completed.`,
        sideEffects,
        error: failedSideEffects.length > 0 ? 
          `${failedSideEffects.length} side effects failed` : undefined
      };

    } catch (error) {
      this.log('error', 'Failed to handle OrderUpdatedEvent', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 💾 PATRÓN: Storage Update Pattern
   * Actualizar orden en browser storage
   */
  private async updateOrderInStorage(event: OrderUpdatedEvent): Promise<SideEffect> {
    try {
      const orderKey = this.getStorageKey('order', event.aggregateId);
      const existingOrderData = this.getBrowserStorage(orderKey) as Record<string, unknown>;

      if (!existingOrderData) {
        return {
          type: 'STORAGE_UPDATE',
          description: 'Order not found in storage',
          success: false,
          error: 'Order does not exist'
        };
      }

      // Actualizar datos específicos según el tipo de actualización
      const updatedOrderData = this.applyUpdateToOrderData(existingOrderData, event);

      // Guardar orden actualizada
      this.setBrowserStorage(orderKey, updatedOrderData);

      // Actualizar índices si es necesario
      await this.updateOrderIndices(event, updatedOrderData);

      return {
        type: 'STORAGE_UPDATE',
        description: `Order ${event.aggregateId} updated in storage`,
        success: true,
        data: {
          orderId: event.aggregateId,
          updateType: event.updateType,
          updatedFields: Object.keys(event.updatedData || {})
        }
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update order in storage',
        success: false,
        error: error instanceof Error ? error.message : 'Storage update failed'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Data Update Application Pattern
   * Aplicar actualización específica a los datos de la orden
   */
  private applyUpdateToOrderData(orderData: Record<string, unknown>, event: OrderUpdatedEvent): Record<string, unknown> {
    const updatedData = { ...orderData };
    updatedData.updatedAt = new Date().toISOString();

    switch (event.updateType) {
      case 'STATUS_CHANGE':
        updatedData.status = event.updatedData?.newStatus;
        updatedData.statusHistory = updatedData.statusHistory || [];
        updatedData.statusHistory.push({
          status: event.updatedData?.newStatus,
          timestamp: event.occurredAt,
          reason: event.updatedData?.reason
        });
        break;

      case 'DELIVERY_ADDRESS':
        updatedData.deliveryAddress = event.updatedData?.deliveryAddress;
        break;

      case 'CONTACT_INFO':
        updatedData.contactInfo = {
          ...updatedData.contactInfo,
          ...event.updatedData?.contactInfo
        };
        break;

      case 'PAYMENT_INFO':
        updatedData.paymentInfo = {
          ...updatedData.paymentInfo,
          ...event.updatedData?.paymentInfo
        };
        // No guardar información sensible
        if (updatedData.paymentInfo.cardNumber) {
          updatedData.paymentInfo.cardNumber = this.maskCardNumber(updatedData.paymentInfo.cardNumber);
        }
        break;

      case 'ITEMS_CHANGE':
        updatedData.items = event.updatedData?.items || updatedData.items;
        updatedData.totalAmount = this.calculateTotalAmount(updatedData.items);
        break;

      case 'SPECIAL_INSTRUCTIONS':
        updatedData.specialInstructions = event.updatedData?.specialInstructions;
        break;

      default:
        // Actualización genérica
        Object.assign(updatedData, event.updatedData || {});
    }

    return updatedData;
  }

  /**
   * 📡 PATRÓN: UI Event Broadcasting Pattern
   * Emitir evento para actualizaciones de UI en tiempo real
   */
  private emitUIUpdateEvent(event: OrderUpdatedEvent): SideEffect {
    try {
      const uiEventData = {
        type: 'ORDER_UPDATED',
        orderId: event.aggregateId,
        updateType: event.updateType,
        timestamp: event.occurredAt,
        data: event.updatedData
      };

      this.emitBrowserEvent('realtime-order-update', uiEventData);

      return {
        type: 'UI_UPDATE',
        description: 'UI update event emitted',
        success: true,
        data: uiEventData
      };

    } catch (error) {
      return {
        type: 'UI_UPDATE',
        description: 'Failed to emit UI update event',
        success: false,
        error: error instanceof Error ? error.message : 'UI event failed'
      };
    }
  }

  /**
   * 🎯 PATRÓN: Specific Update Processing Pattern
   * Procesamiento específico según el tipo de actualización
   */
  private async processSpecificUpdate(event: OrderUpdatedEvent): Promise<SideEffect | null> {
    switch (event.updateType) {
      case 'STATUS_CHANGE':
        return this.processStatusChange(event);
      
      case 'PAYMENT_INFO':
        return this.processPaymentUpdate(event);
      
      case 'ITEMS_CHANGE':
        return this.processItemsChange(event);
      
      default:
        return null;
    }
  }

  /**
   * 📊 PATRÓN: Status Change Processing Pattern
   * Procesar cambios de estado específicos
   */
  private processStatusChange(event: OrderUpdatedEvent): SideEffect {
    try {
      const newStatus = event.updatedData?.newStatus;
      
      // Actualizar estado en sesión activa si corresponde
      if (event.updatedData?.sessionId) {
        const sessionKey = this.getStorageKey('session-order', event.updatedData.sessionId);
        const sessionData = this.getBrowserStorage(sessionKey) as Record<string, unknown>;
        
        if (sessionData && sessionData.orderId === event.aggregateId) {
          sessionData.orderStatus = newStatus;
          sessionData.lastStatusUpdate = event.occurredAt;
          this.setBrowserStorage(sessionKey, sessionData);
        }
      }

      // Emitir evento específico de cambio de estado
      this.emitBrowserEvent('realtime-order-status-change', {
        orderId: event.aggregateId,
        oldStatus: event.updatedData?.previousStatus,
        newStatus,
        timestamp: event.occurredAt
      });

      return {
        type: 'BROWSER_EVENT',
        description: `Status changed to ${newStatus}`,
        success: true,
        data: { newStatus, orderId: event.aggregateId }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process status change',
        success: false,
        error: error instanceof Error ? error.message : 'Status change failed'
      };
    }
  }

  /**
   * 💳 PATRÓN: Payment Update Processing Pattern
   * Procesar actualizaciones de información de pago
   */
  private processPaymentUpdate(event: OrderUpdatedEvent): SideEffect {
    try {
      // Emitir evento de actualización de pago
      this.emitBrowserEvent('realtime-payment-update', {
        orderId: event.aggregateId,
        paymentStatus: event.updatedData?.paymentInfo?.status,
        timestamp: event.occurredAt
      });

      return {
        type: 'BROWSER_EVENT',
        description: 'Payment information updated',
        success: true,
        data: { orderId: event.aggregateId }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process payment update',
        success: false,
        error: error instanceof Error ? error.message : 'Payment update failed'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Items Change Processing Pattern
   * Procesar cambios en los items del pedido
   */
  private processItemsChange(event: OrderUpdatedEvent): SideEffect {
    try {
      const items = event.updatedData?.items || [];
      const totalAmount = this.calculateTotalAmount(items);

      // Emitir evento de cambio de items
      this.emitBrowserEvent('realtime-order-items-change', {
        orderId: event.aggregateId,
        itemCount: items.length,
        totalAmount,
        timestamp: event.occurredAt
      });

      return {
        type: 'BROWSER_EVENT',
        description: 'Order items updated',
        success: true,
        data: { orderId: event.aggregateId, itemCount: items.length, totalAmount }
      };

    } catch (error) {
      return {
        type: 'BROWSER_EVENT',
        description: 'Failed to process items change',
        success: false,
        error: error instanceof Error ? error.message : 'Items change failed'
      };
    }
  }

  /**
   * 📊 PATRÓN: Metrics Update Pattern
   * Actualizar métricas y analytics
   */
  private updateMetrics(event: OrderUpdatedEvent): SideEffect {
    try {
      const metricsKey = this.getStorageKey('order-metrics');
      const metrics = this.getBrowserStorage(metricsKey) as Record<string, unknown> || {
        totalUpdates: 0,
        updatesByType: {},
        lastUpdate: null
      };

      metrics.totalUpdates++;
      metrics.updatesByType[event.updateType] = (metrics.updatesByType[event.updateType] || 0) + 1;
      metrics.lastUpdate = event.occurredAt;

      this.setBrowserStorage(metricsKey, metrics);

      return {
        type: 'STORAGE_UPDATE',
        description: 'Order metrics updated',
        success: true,
        data: metrics
      };

    } catch (error) {
      return {
        type: 'STORAGE_UPDATE',
        description: 'Failed to update metrics',
        success: false,
        error: error instanceof Error ? error.message : 'Metrics update failed'
      };
    }
  }

  /**
   * 🔔 PATRÓN: Notification Check Pattern
   * Verificar si se necesitan notificaciones
   */
  private async checkNotifications(event: OrderUpdatedEvent): Promise<SideEffect | null> {
    try {
      const shouldNotify = this.shouldSendNotification(event);
      
      if (!shouldNotify) {
        return null;
      }

      const notification = this.createNotification(event);
      
      // En un entorno real, aquí se enviaría la notificación
      // Por ahora, solo emitimos un evento del navegador
      this.emitBrowserEvent('realtime-notification', notification);

      return {
        type: 'NOTIFICATION',
        description: 'Notification sent',
        success: true,
        data: notification
      };

    } catch (error) {
      return {
        type: 'NOTIFICATION',
        description: 'Failed to send notification',
        success: false,
        error: error instanceof Error ? error.message : 'Notification failed'
      };
    }
  }

  /**
   * 🔔 PATRÓN: Notification Decision Pattern
   * Decidir si se debe enviar notificación
   */
  private shouldSendNotification(event: OrderUpdatedEvent): boolean {
    const importantUpdates = [
      'STATUS_CHANGE',
      'PAYMENT_INFO'
    ];

    return importantUpdates.includes(event.updateType);
  }

  /**
   * 🔔 PATRÓN: Notification Creation Pattern
   * Crear notificación apropiada
   */
  private createNotification(event: OrderUpdatedEvent): OrderNotification {
    const baseNotification = {
      id: `order-${event.aggregateId}-${Date.now()}`,
      orderId: event.aggregateId,
      timestamp: event.occurredAt,
      type: event.updateType
    };

    switch (event.updateType) {
      case 'STATUS_CHANGE':
        return {
          ...baseNotification,
          title: 'Order Status Updated',
          message: `Your order status has been updated to: ${event.updatedData?.newStatus}`,
          priority: 'HIGH'
        };

      case 'PAYMENT_INFO':
        return {
          ...baseNotification,
          title: 'Payment Information Updated',
          message: 'Your payment information has been successfully updated',
          priority: 'MEDIUM'
        };

      default:
        return {
          ...baseNotification,
          title: 'Order Updated',
          message: 'Your order has been updated',
          priority: 'LOW'
        };
    }
  }

  /**
   * 🔗 PATRÓN: Index Update Pattern
   * Actualizar índices de búsqueda
   */
  private async updateOrderIndices(event: OrderUpdatedEvent, orderData: Record<string, unknown>): Promise<void> {
    // Actualizar índice por customer si existe
    if (orderData.customerId) {
      const customerOrdersKey = this.getStorageKey('customer-orders', orderData.customerId);
      const customerOrders = this.getBrowserStorage(customerOrdersKey) as string[] || [];
      
      if (!customerOrders.includes(event.aggregateId)) {
        customerOrders.push(event.aggregateId);
        this.setBrowserStorage(customerOrdersKey, customerOrders);
      }
    }

    // Actualizar índice por sesión si existe
    if (orderData.sessionId) {
      const sessionOrderKey = this.getStorageKey('session-order', orderData.sessionId);
      this.setBrowserStorage(sessionOrderKey, event.aggregateId);
    }
  }

  /**
   * 💳 PATRÓN: Card Number Masking Pattern
   * Enmascarar número de tarjeta para seguridad
   */
  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return '****';
    return '**** **** **** ' + cardNumber.slice(-4);
  }

  /**
   * 💰 PATRÓN: Total Calculation Pattern
   * Calcular monto total de items
   */
  private calculateTotalAmount(items: Array<Record<string, unknown>>): number {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return total + itemTotal;
    }, 0);
  }
}

/**
 * 📊 PATRÓN: Notification Interface Pattern
 * Interface para notificaciones de pedidos
 */
export interface OrderNotification {
  id: string;
  orderId: string;
  timestamp: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}
