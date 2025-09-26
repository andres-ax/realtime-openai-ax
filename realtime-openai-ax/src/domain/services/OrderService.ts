/**
 * 🏗️ PATRÓN: Domain Service Pattern (DDD)
 * 🎯 PRINCIPIO: Domain Logic + Business Rules + Orchestration
 * 
 * OrderService - Servicio de dominio para lógica compleja de pedidos
 * Coordina operaciones entre múltiples agregados y aplica reglas de negocio
 */

import { Order } from '../entities/Order';
import { Cart } from '../entities/Cart';
import { Customer } from '../entities/Customer';
import { MenuItem } from '../entities/MenuItem';
import { OrderId } from '../valueObjects/OrderId';
import { Price } from '../valueObjects/Price';
import { DeliveryAddress } from '../valueObjects/DeliveryAddress';

/**
 * 🎯 PATRÓN: Domain Service Pattern
 * OrderService encapsula lógica de negocio compleja que no pertenece a una entidad específica
 */
export class OrderService {

  /**
   * 🏭 PATRÓN: Factory Service Pattern
   * Crear pedido desde carrito con validaciones de negocio
   */
  public static createOrderFromCart(
    cart: Cart,
    customer: Customer,
    deliveryAddress: DeliveryAddress,
    menuItems: MenuItem[]
  ): Order {
    // Validaciones de negocio
    if (cart.isEmpty()) {
      throw new Error('Cannot create order from empty cart');
    }

    if (!customer.isActive()) {
      throw new Error('Cannot create order for inactive customer');
    }

    if (!deliveryAddress.isComplete()) {
      throw new Error('Delivery address is incomplete');
    }

    // Crear pedido
    const orderId = OrderId.generate();
    const customerId = customer.id;
    const order = new Order(orderId, customerId);

    // Transferir items del carrito al pedido con validaciones
    for (const cartItem of cart.getItems()) {
      const menuItem = menuItems.find(mi => 
        mi.getName() === cartItem.getMenuItemName()
      );

      if (!menuItem) {
        throw new Error(`Menu item not found: ${cartItem.getMenuItemName()}`);
      }

      if (!menuItem.isAvailable()) {
        throw new Error(`Menu item not available: ${cartItem.getMenuItemName()}`);
      }

      // Verificar que el precio no haya cambiado
      if (!menuItem.getPrice().isEqualTo(cartItem.getUnitPrice())) {
        throw new Error(`Price changed for item: ${cartItem.getMenuItemName()}`);
      }

      order.addItem(
        cartItem.getMenuItemName(),
        cartItem.getQuantity(),
        cartItem.getUnitPrice()
      );
    }

    // Establecer información de entrega
    order.setDeliveryAddress(deliveryAddress);
    order.setContactInfo(
      customer.getPhoneNumber().toString(),
      customer.getEmail().toString()
    );

    // Aplicar descuentos de cliente
    const customerDiscount = customer.getDiscountPercentage();
    if (customerDiscount > 0) {
      OrderService.applyCustomerDiscount(order, customerDiscount);
    }

    return order;
  }

  /**
   * 💰 PATRÓN: Discount Application Pattern
   * Aplicar descuento de cliente al pedido
   */
  public static applyCustomerDiscount(order: Order, discountPercentage: number): void {
    if (discountPercentage <= 0 || discountPercentage > 100) {
      throw new Error('Invalid discount percentage');
    }

    // La lógica de descuento se implementaría aquí
    // Por ahora, solo validamos que el pedido pueda ser modificado
    if (!order.getStatus().canBeModified()) {
      throw new Error('Cannot apply discount to confirmed order');
    }

    // En una implementación real, se agregaría un campo de descuento al pedido
    // o se modificarían los precios de los items
  }

  /**
   * 📊 PATRÓN: Business Rules Validation Pattern
   * Validar que el pedido puede ser confirmado
   */
  public static validateOrderForConfirmation(order: Order): OrderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar items
    if (order.getItems().length === 0) {
      errors.push('Order must have at least one item');
    }

    // Validar total mínimo
    const total = order.calculateTotal();
    const minimumOrder = Price.fromDollars(10);
    if (total.isLessThan(minimumOrder)) {
      errors.push(`Order total must be at least ${minimumOrder.toUSDString()}`);
    }

    // Validar información de entrega
    if (!order.getDeliveryAddress()) {
      errors.push('Delivery address is required');
    }

    if (!order.getContactPhone() || !order.getEmail()) {
      errors.push('Contact information is required');
    }

    // Advertencias
    const highValueOrder = Price.fromDollars(200);
    if (total.isGreaterThan(highValueOrder)) {
      warnings.push('High value order - consider additional verification');
    }

    const manyItems = 10;
    if (order.getItems().length > manyItems) {
      warnings.push('Large order - verify preparation capacity');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0
    };
  }

  /**
   * ⏱️ PATRÓN: Delivery Time Estimation Pattern
   * Estimar tiempo de entrega basado en items y ubicación
   */
  public static estimateDeliveryTime(
    order: Order,
    menuItems: MenuItem[]
  ): DeliveryTimeEstimate {
    let maxPreparationTime = 0;
    let totalComplexity = 0;

    // Calcular tiempo de preparación máximo
    for (const orderItem of order.getItems()) {
      const menuItem = menuItems.find(mi => 
        mi.getName() === orderItem.getMenuItemName()
      );

      if (menuItem) {
        maxPreparationTime = Math.max(
          maxPreparationTime,
          menuItem.getPreparationTime()
        );
        totalComplexity += menuItem.getPreparationTime() * orderItem.getQuantity();
      }
    }

    // Tiempo base de preparación
    const preparationTime = Math.max(maxPreparationTime, totalComplexity / 2);

    // Tiempo de entrega (simulado - en producción usaríamos APIs de mapas)
    const deliveryTime = 25; // 25 minutos promedio

    // Tiempo de buffer
    const bufferTime = 5;

    const totalTime = preparationTime + deliveryTime + bufferTime;

    return {
      preparationTime,
      deliveryTime,
      bufferTime,
      totalTime,
      estimatedDelivery: new Date(Date.now() + totalTime * 60000), // minutos a ms
      confidence: OrderService.calculateTimeConfidence(order.getItems().length, totalComplexity)
    };
  }

  /**
   * 📊 PATRÓN: Confidence Calculation Pattern
   * Calcular confianza en la estimación de tiempo
   */
  private static calculateTimeConfidence(itemCount: number, complexity: number): number {
    // Lógica simple de confianza
    let confidence = 90; // Base 90%

    if (itemCount > 5) confidence -= 10;
    if (itemCount > 10) confidence -= 10;
    if (complexity > 60) confidence -= 15;

    return Math.max(confidence, 50); // Mínimo 50%
  }

  /**
   * 🔄 PATRÓN: Order Modification Pattern
   * Modificar pedido existente con validaciones
   */
  public static modifyOrder(
    order: Order,
    modifications: OrderModification[]
  ): OrderModificationResult {
    if (!order.getStatus().canBeModified()) {
      return {
        success: false,
        error: 'Order cannot be modified in current status',
        modifiedOrder: order
      };
    }

    try {
      const modifiedOrder = order; // En una implementación real, se crearía una copia

      for (const modification of modifications) {
        switch (modification.type) {
          case 'ADD_ITEM':
            modifiedOrder.addItem(
              modification.menuItem!,
              modification.quantity!,
              modification.unitPrice!
            );
            break;

          case 'REMOVE_ITEM':
            modifiedOrder.removeItem(modification.menuItem!);
            break;

          case 'UPDATE_QUANTITY':
            // Implementar lógica de actualización de cantidad
            break;

          case 'UPDATE_ADDRESS':
            if (modification.deliveryAddress) {
              modifiedOrder.setDeliveryAddress(modification.deliveryAddress);
            }
            break;
        }
      }

      return {
        success: true,
        modifiedOrder
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modifiedOrder: order
      };
    }
  }

  /**
   * 📊 PATRÓN: Order Analysis Pattern
   * Analizar pedido para insights de negocio
   */
  public static analyzeOrder(order: Order, customer: Customer): OrderAnalysis {
    const total = order.calculateTotal();
    // Item count used for analysis calculations
    const itemCount = order.getItems().length;
    const totalQuantity = order.getItems().reduce(
      (sum, item) => sum + item.getQuantity(), 0
    );

    return {
      orderId: order.id.toString(),
      customerId: customer.id.toString(),
      customerTier: customer.getCustomerTier(),
      isFirstOrder: customer.getTotalOrders() === 0,
      isLargeOrder: total.isGreaterThan(Price.fromDollars(100)),
      isBulkOrder: totalQuantity >= 10,
      itemCount: itemCount,
      averageItemPrice: total.divide(totalQuantity),
      orderComplexity: OrderService.calculateOrderComplexity(order),
      recommendedUpsells: OrderService.getRecommendedUpsells(order),
      riskFactors: OrderService.identifyRiskFactors(order, customer)
    };
  }

  /**
   * 📊 PATRÓN: Complexity Calculation Pattern
   * Calcular complejidad del pedido
   */
  private static calculateOrderComplexity(order: Order): 'LOW' | 'MEDIUM' | 'HIGH' {
    const itemCount = order.getItems().length;
    const totalQuantity = order.getItems().reduce(
      (sum, item) => sum + item.getQuantity(), 0
    );

    if (itemCount <= 3 && totalQuantity <= 5) return 'LOW';
    if (itemCount <= 6 && totalQuantity <= 10) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * 💡 PATRÓN: Recommendation Pattern
   * Obtener recomendaciones de upsell
   */
  private static getRecommendedUpsells(order: Order): string[] {
    const recommendations: string[] = [];
    const items = order.getItems();

    // Lógica simple de recomendaciones
    const hasBurger = items.some(item => 
      item.getMenuItemName().toLowerCase().includes('burger')
    );
    const hasFries = items.some(item => 
      item.getMenuItemName().toLowerCase().includes('fries')
    );
    const hasDrink = items.some(item => 
      item.getMenuItemName().toLowerCase().includes('drink') ||
      item.getMenuItemName().toLowerCase().includes('soda')
    );

    if (hasBurger && !hasFries) {
      recommendations.push('Add Fries to complete your meal');
    }

    if (hasBurger && !hasDrink) {
      recommendations.push('Add a drink to your order');
    }

    if (items.length >= 3 && !items.some(item => 
      item.getMenuItemName().toLowerCase().includes('dessert')
    )) {
      recommendations.push('Try our delicious Apple Pie for dessert');
    }

    return recommendations;
  }

  /**
   * ⚠️ PATRÓN: Risk Assessment Pattern
   * Identificar factores de riesgo
   */
  private static identifyRiskFactors(order: Order, customer: Customer): string[] {
    const risks: string[] = [];

    // Pedido de alto valor
    if (order.calculateTotal().isGreaterThan(Price.fromDollars(200))) {
      risks.push('High value order');
    }

    // Cliente nuevo
    if (customer.getTotalOrders() === 0) {
      risks.push('First-time customer');
    }

    // Pedido muy grande
    if (order.getItems().length > 10) {
      risks.push('Large item count');
    }

    return risks;
  }
}

/**
 * 📊 PATRÓN: Result Object Pattern
 * Resultado de validación de pedido
 */
export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

/**
 * ⏱️ PATRÓN: Time Estimation Pattern
 * Estimación de tiempo de entrega
 */
export interface DeliveryTimeEstimate {
  preparationTime: number;
  deliveryTime: number;
  bufferTime: number;
  totalTime: number;
  estimatedDelivery: Date;
  confidence: number;
}

/**
 * 🔄 PATRÓN: Modification Pattern
 * Modificación de pedido
 */
export interface OrderModification {
  type: 'ADD_ITEM' | 'REMOVE_ITEM' | 'UPDATE_QUANTITY' | 'UPDATE_ADDRESS';
  menuItem?: string;
  quantity?: number;
  unitPrice?: Price;
  deliveryAddress?: DeliveryAddress;
}

/**
 * 📊 PATRÓN: Result Object Pattern
 * Resultado de modificación de pedido
 */
export interface OrderModificationResult {
  success: boolean;
  error?: string;
  modifiedOrder: Order;
}

/**
 * 📊 PATRÓN: Analysis Pattern
 * Análisis completo del pedido
 */
export interface OrderAnalysis {
  orderId: string;
  customerId: string;
  customerTier: string;
  isFirstOrder: boolean;
  isLargeOrder: boolean;
  isBulkOrder: boolean;
  itemCount: number;
  averageItemPrice: Price;
  orderComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedUpsells: string[];
  riskFactors: string[];
}
