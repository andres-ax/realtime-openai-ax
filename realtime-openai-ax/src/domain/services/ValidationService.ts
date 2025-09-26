/**
 * 🏗️ PATRÓN: Domain Service Pattern (DDD)
 * 🎯 PRINCIPIO: Validation Logic + Business Rules + Cross-Entity Validation
 * 
 * ValidationService - Servicio de dominio para validaciones complejas
 * Maneja validaciones que involucran múltiples entidades y reglas de negocio
 */

import { Order } from '../entities/Order';
import { Cart } from '../entities/Cart';
import { Customer } from '../entities/Customer';
import { MenuItem } from '../entities/MenuItem';
import { Agent } from '../entities/Agent';
import { Price } from '../valueObjects/Price';
// DeliveryAddress, Email, PhoneNumber imported for type definitions

/**
 * 🎯 PATRÓN: Validation Engine Pattern
 * ValidationService centraliza todas las validaciones complejas del dominio
 */
export class ValidationService {

  /**
   * 📋 PATRÓN: Comprehensive Validation Pattern
   * Validación completa de pedido antes de confirmación
   */
  public static validateOrderForConfirmation(
    order: Order,
    customer: Customer,
    menuItems: MenuItem[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar estructura básica del pedido
    const basicValidation = ValidationService.validateOrderStructure(order);
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    // Validar items del pedido
    const itemValidation = ValidationService.validateOrderItems(order, menuItems);
    errors.push(...itemValidation.errors);
    warnings.push(...itemValidation.warnings);

    // Validar información del cliente
    const customerValidation = ValidationService.validateCustomerForOrder(customer);
    errors.push(...customerValidation.errors);
    warnings.push(...customerValidation.warnings);

    // Validar información de entrega
    const deliveryValidation = ValidationService.validateDeliveryInformation(order);
    errors.push(...deliveryValidation.errors);
    warnings.push(...deliveryValidation.warnings);

    // Validar reglas de negocio
    const businessValidation = ValidationService.validateBusinessRules(order, customer);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    return {
      isValid: errors.length === 0,
      canProceed: errors.filter(e => e.severity === 'CRITICAL').length === 0,
      errors,
      warnings,
      summary: ValidationService.createValidationSummary(errors, warnings)
    };
  }

  /**
   * 🏗️ PATRÓN: Structure Validation Pattern
   * Validar estructura básica del pedido
   */
  public static validateOrderStructure(order: Order): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar que tenga items
    if (order.getItems().length === 0) {
      errors.push({
        code: 'ORDER_EMPTY',
        message: 'Order must contain at least one item',
        severity: 'CRITICAL',
        field: 'items'
      });
    }

    // Validar total mínimo
    const total = order.calculateTotal();
    const minimumOrder = Price.fromDollars(5);
    if (total.isLessThan(minimumOrder)) {
      errors.push({
        code: 'ORDER_BELOW_MINIMUM',
        message: `Order total must be at least ${minimumOrder.toUSDString()}`,
        severity: 'CRITICAL',
        field: 'total'
      });
    }

    // Advertencia para pedidos muy grandes
    const maxRecommended = Price.fromDollars(500);
    if (total.isGreaterThan(maxRecommended)) {
      warnings.push({
        code: 'ORDER_VERY_LARGE',
        message: `Large order of ${total.toUSDString()} - consider verification`,
        severity: 'INFO',
        field: 'total'
      });
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 🛒 PATRÓN: Item Validation Pattern
   * Validar items del pedido contra menú disponible
   */
  public static validateOrderItems(
    order: Order,
    menuItems: MenuItem[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const orderItem of order.getItems()) {
      const menuItem = menuItems.find(mi => 
        mi.getName() === orderItem.getMenuItemName()
      );

      // Validar que el item existe en el menú
      if (!menuItem) {
        errors.push({
          code: 'ITEM_NOT_FOUND',
          message: `Menu item not found: ${orderItem.getMenuItemName()}`,
          severity: 'CRITICAL',
          field: 'items',
          itemName: orderItem.getMenuItemName()
        });
        continue;
      }

      // Validar disponibilidad
      if (!menuItem.isAvailable()) {
        errors.push({
          code: 'ITEM_UNAVAILABLE',
          message: `Item not available: ${orderItem.getMenuItemName()}`,
          severity: 'CRITICAL',
          field: 'items',
          itemName: orderItem.getMenuItemName()
        });
      }

      // Validar precio (detectar cambios)
      if (!menuItem.getPrice().isEqualTo(orderItem.getUnitPrice())) {
        errors.push({
          code: 'PRICE_CHANGED',
          message: `Price changed for ${orderItem.getMenuItemName()}`,
          severity: 'HIGH',
          field: 'items',
          itemName: orderItem.getMenuItemName()
        });
      }

      // Advertencia para items con tiempo de preparación largo
      if (menuItem.getPreparationTime() > 30) {
        warnings.push({
          code: 'LONG_PREPARATION_TIME',
          message: `${orderItem.getMenuItemName()} has long preparation time (${menuItem.getPreparationTime()} min)`,
          severity: 'INFO',
          field: 'items',
          itemName: orderItem.getMenuItemName()
        });
      }

      // Validar cantidad excesiva
      if (orderItem.getQuantity() > 20) {
        warnings.push({
          code: 'HIGH_QUANTITY',
          message: `High quantity for ${orderItem.getMenuItemName()}: ${orderItem.getQuantity()}`,
          severity: 'MEDIUM',
          field: 'items',
          itemName: orderItem.getMenuItemName()
        });
      }
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 👤 PATRÓN: Customer Validation Pattern
   * Validar información del cliente para pedido
   */
  public static validateCustomerForOrder(customer: Customer): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar que el cliente esté activo
    if (!customer.isActive()) {
      errors.push({
        code: 'CUSTOMER_INACTIVE',
        message: 'Customer account is inactive',
        severity: 'CRITICAL',
        field: 'customer'
      });
    }

    // Validar información de contacto
    if (!customer.hasCompleteContactInfo()) {
      errors.push({
        code: 'INCOMPLETE_CONTACT_INFO',
        message: 'Customer contact information is incomplete',
        severity: 'HIGH',
        field: 'customer'
      });
    }

    // Advertencia para clientes nuevos
    if (customer.getTotalOrders() === 0) {
      warnings.push({
        code: 'FIRST_TIME_CUSTOMER',
        message: 'First-time customer - consider additional verification',
        severity: 'INFO',
        field: 'customer'
      });
    }

    // Advertencia para clientes VIP
    if (customer.isVIP()) {
      warnings.push({
        code: 'VIP_CUSTOMER',
        message: 'VIP customer - ensure premium service',
        severity: 'INFO',
        field: 'customer'
      });
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 🚚 PATRÓN: Delivery Validation Pattern
   * Validar información de entrega
   */
  public static validateDeliveryInformation(order: Order): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const deliveryAddress = order.getDeliveryAddress();
    const contactPhone = order.getContactPhone();
    const email = order.getEmail();

    // Validar dirección de entrega
    if (!deliveryAddress) {
      errors.push({
        code: 'MISSING_DELIVERY_ADDRESS',
        message: 'Delivery address is required',
        severity: 'CRITICAL',
        field: 'deliveryAddress'
      });
    } else if (!deliveryAddress.isComplete()) {
      errors.push({
        code: 'INCOMPLETE_DELIVERY_ADDRESS',
        message: 'Delivery address is incomplete',
        severity: 'CRITICAL',
        field: 'deliveryAddress'
      });
    }

    // Validar teléfono de contacto
    if (!contactPhone) {
      errors.push({
        code: 'MISSING_CONTACT_PHONE',
        message: 'Contact phone number is required',
        severity: 'HIGH',
        field: 'contactPhone'
      });
    }

    // Validar email
    if (!email) {
      warnings.push({
        code: 'MISSING_EMAIL',
        message: 'Email address recommended for order updates',
        severity: 'MEDIUM',
        field: 'email'
      });
    }

    // Validar zona de entrega (simulado)
    if (deliveryAddress && deliveryAddress.isInternational()) {
      errors.push({
        code: 'INTERNATIONAL_DELIVERY_NOT_SUPPORTED',
        message: 'International delivery is not supported',
        severity: 'CRITICAL',
        field: 'deliveryAddress'
      });
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 💼 PATRÓN: Business Rules Validation Pattern
   * Validar reglas de negocio específicas
   */
  public static validateBusinessRules(
    order: Order,
    customer: Customer
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar límites de pedido por cliente
    const customerTier = customer.getCustomerTier();
    const orderTotal = order.calculateTotal();

    // Límites por tier de cliente
    const tierLimits: Record<string, number> = {
      'BRONZE': 200,
      'SILVER': 500,
      'GOLD': 1000,
      'PLATINUM': 2000
    };

    const limit = tierLimits[customerTier] || 100;
    if (orderTotal.isGreaterThan(Price.fromDollars(limit))) {
      warnings.push({
        code: 'ORDER_EXCEEDS_TIER_LIMIT',
        message: `Order exceeds ${customerTier} tier limit of $${limit}`,
        severity: 'MEDIUM',
        field: 'total'
      });
    }

    // Validar horario de pedidos (simulado)
    const currentHour = new Date().getHours();
    if (currentHour < 10 || currentHour > 22) {
      warnings.push({
        code: 'ORDER_OUTSIDE_HOURS',
        message: 'Order placed outside normal business hours',
        severity: 'INFO',
        field: 'timing'
      });
    }

    // Validar frecuencia de pedidos
    const daysSinceLastOrder = 0; // Simulado
    if (daysSinceLastOrder === 0) {
      warnings.push({
        code: 'MULTIPLE_ORDERS_TODAY',
        message: 'Customer has multiple orders today',
        severity: 'INFO',
        field: 'frequency'
      });
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 🛒 PATRÓN: Cart Validation Pattern
   * Validar carrito antes de conversión a pedido
   */
  public static validateCartForCheckout(
    cart: Cart,
    menuItems: MenuItem[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar que el carrito no esté vacío
    if (cart.isEmpty()) {
      errors.push({
        code: 'CART_EMPTY',
        message: 'Cart is empty',
        severity: 'CRITICAL',
        field: 'cart'
      });
    }

    // Validar que el carrito esté activo
    if (!cart.isActive()) {
      errors.push({
        code: 'CART_INACTIVE',
        message: 'Cart is inactive',
        severity: 'CRITICAL',
        field: 'cart'
      });
    }

    // Validar expiración del carrito
    if (cart.isExpired()) {
      errors.push({
        code: 'CART_EXPIRED',
        message: 'Cart has expired',
        severity: 'HIGH',
        field: 'cart'
      });
    }

    // Validar items del carrito
    for (const cartItem of cart.getItems()) {
      const menuItem = menuItems.find(mi => 
        mi.getName() === cartItem.getMenuItemName()
      );

      if (!menuItem || !menuItem.isAvailable()) {
        errors.push({
          code: 'CART_ITEM_UNAVAILABLE',
          message: `Cart item no longer available: ${cartItem.getMenuItemName()}`,
          severity: 'HIGH',
          field: 'cart',
          itemName: cartItem.getMenuItemName()
        });
      }
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 🤖 PATRÓN: Agent Validation Pattern
   * Validar configuración de agente
   */
  public static validateAgentConfiguration(agent: Agent): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar que el agente esté activo
    if (!agent.isActive()) {
      errors.push({
        code: 'AGENT_INACTIVE',
        message: 'Agent is inactive',
        severity: 'CRITICAL',
        field: 'agent'
      });
    }

    // Validar herramientas del agente
    const tools = agent.getTools();
    if (tools.length === 0) {
      warnings.push({
        code: 'AGENT_NO_TOOLS',
        message: 'Agent has no tools configured',
        severity: 'MEDIUM',
        field: 'agent'
      });
    }

    // Validar capacidades específicas por tipo
    const agentType = agent.getType();
    if (agentType.getValue() === 'sales' && !agent.canFocusMenuItems()) {
      warnings.push({
        code: 'SALES_AGENT_MISSING_FOCUS_TOOL',
        message: 'Sales agent missing focus_menu_item tool',
        severity: 'MEDIUM',
        field: 'agent'
      });
    }

    if (agentType.getValue() === 'payment' && !agent.canProcessPayment()) {
      errors.push({
        code: 'PAYMENT_AGENT_MISSING_TOOLS',
        message: 'Payment agent missing required payment tools',
        severity: 'HIGH',
        field: 'agent'
      });
    }

    return { isValid: errors.length === 0, canProceed: true, errors, warnings };
  }

  /**
   * 📊 PATRÓN: Validation Summary Pattern
   * Crear resumen de validación
   */
  private static createValidationSummary(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): ValidationSummary {
    const criticalErrors = errors.filter(e => e.severity === 'CRITICAL').length;
    const highErrors = errors.filter(e => e.severity === 'HIGH').length;
    const mediumWarnings = warnings.filter(w => w.severity === 'MEDIUM').length;
    const infoWarnings = warnings.filter(w => w.severity === 'INFO').length;

    return {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      criticalErrors,
      highErrors,
      mediumWarnings,
      infoWarnings,
      overallStatus: criticalErrors > 0 ? 'FAILED' : 
                    highErrors > 0 ? 'WARNING' : 'PASSED'
    };
  }
}

/**
 * 📊 PATRÓN: Validation Result Pattern
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  canProceed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary?: ValidationSummary;
}

/**
 * ❌ PATRÓN: Error Pattern
 * Error de validación
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  field: string;
  itemName?: string;
}

/**
 * ⚠️ PATRÓN: Warning Pattern
 * Advertencia de validación
 */
export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'MEDIUM' | 'INFO';
  field: string;
  itemName?: string;
}

/**
 * 📊 PATRÓN: Summary Pattern
 * Resumen de validación
 */
export interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  criticalErrors: number;
  highErrors: number;
  mediumWarnings: number;
  infoWarnings: number;
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
}
