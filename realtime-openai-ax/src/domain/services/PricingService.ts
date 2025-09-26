/**
 * 🏗️ PATRÓN: Domain Service Pattern (DDD)
 * 🎯 PRINCIPIO: Pricing Logic + Business Rules + Complex Calculations
 * 
 * PricingService - Servicio de dominio para cálculos de precios
 * Maneja descuentos, impuestos, promociones y lógica de precios compleja
 */

import { Price } from '../valueObjects/Price';
import { Customer } from '../entities/Customer';
// Order, Cart, MenuItem, Quantity imported for type definitions

/**
 * 🎯 PATRÓN: Pricing Engine Pattern
 * PricingService encapsula toda la lógica compleja de precios y descuentos
 */
export class PricingService {

  /**
   * 💰 PATRÓN: Comprehensive Pricing Pattern
   * Calcular precio total con todos los descuentos y ajustes
   */
  public static calculateTotalPrice(
    items: PricingItem[],
    customer?: Customer,
    promotions: Promotion[] = [],
    taxRate: number = 8.25
  ): PricingResult {
    // Calcular subtotal base
    const subtotal = PricingService.calculateSubtotal(items);

    // Aplicar descuentos por cantidad
    const quantityDiscount = PricingService.calculateQuantityDiscounts(items);

    // Aplicar descuentos de cliente
    const customerDiscount = customer ? 
      PricingService.calculateCustomerDiscount(subtotal, customer) : 
      Price.zero();

    // Aplicar promociones
    const promotionDiscount = PricingService.calculatePromotionDiscounts(
      items, promotions
    );

    // Calcular descuento total
    const totalDiscount = quantityDiscount
      .add(customerDiscount)
      .add(promotionDiscount);

    // Calcular subtotal después de descuentos
    const discountedSubtotal = subtotal.subtract(totalDiscount);

    // Calcular impuestos sobre el subtotal con descuento
    const tax = discountedSubtotal.multiply(taxRate / 100);

    // Calcular total final
    const total = discountedSubtotal.add(tax);

    return {
      subtotal,
      quantityDiscount,
      customerDiscount,
      promotionDiscount,
      totalDiscount,
      discountedSubtotal,
      taxRate,
      tax,
      total,
      savings: totalDiscount,
      breakdown: PricingService.createPriceBreakdown(
        items, quantityDiscount, customerDiscount, promotionDiscount, tax
      )
    };
  }

  /**
   * 🧮 PATRÓN: Subtotal Calculation Pattern
   * Calcular subtotal de items
   */
  public static calculateSubtotal(items: PricingItem[]): Price {
    return items.reduce((total, item) => {
      const itemTotal = item.unitPrice.multiply(item.quantity);
      return total.add(itemTotal);
    }, Price.zero());
  }

  /**
   * 🔢 PATRÓN: Quantity Discount Pattern
   * Calcular descuentos por cantidad
   */
  public static calculateQuantityDiscounts(items: PricingItem[]): Price {
    let totalDiscount = Price.zero();

    for (const item of items) {
      const quantity = item.quantity;
      let discountPercentage = 0;

      // Descuentos escalonados por cantidad
      if (quantity >= 10) {
        discountPercentage = 15; // 15% para 10+ items
      } else if (quantity >= 5) {
        discountPercentage = 10; // 10% para 5-9 items
      } else if (quantity >= 3) {
        discountPercentage = 5;  // 5% para 3-4 items
      }

      if (discountPercentage > 0) {
        const itemTotal = item.unitPrice.multiply(quantity);
        const itemDiscount = itemTotal.multiply(discountPercentage / 100);
        totalDiscount = totalDiscount.add(itemDiscount);
      }
    }

    return totalDiscount;
  }

  /**
   * 👤 PATRÓN: Customer Loyalty Discount Pattern
   * Calcular descuento de cliente basado en nivel
   */
  public static calculateCustomerDiscount(
    subtotal: Price,
    customer: Customer
  ): Price {
    const discountPercentage = customer.getDiscountPercentage();
    
    if (discountPercentage <= 0) {
      return Price.zero();
    }

    // Aplicar descuento con límite máximo
    const discount = subtotal.multiply(discountPercentage / 100);
    const maxDiscount = Price.fromDollars(50); // Máximo $50 de descuento

    return discount.isGreaterThan(maxDiscount) ? maxDiscount : discount;
  }

  /**
   * 🎁 PATRÓN: Promotion Engine Pattern
   * Calcular descuentos por promociones
   */
  public static calculatePromotionDiscounts(
    items: PricingItem[],
    promotions: Promotion[]
  ): Price {
    let totalDiscount = Price.zero();

    for (const promotion of promotions) {
      if (!PricingService.isPromotionApplicable(items, promotion)) {
        continue;
      }

      const discount = PricingService.applyPromotion(items, promotion);
      totalDiscount = totalDiscount.add(discount);
    }

    return totalDiscount;
  }

  /**
   * 🎁 PATRÓN: Promotion Validation Pattern
   * Verificar si promoción es aplicable
   */
  private static isPromotionApplicable(
    items: PricingItem[],
    promotion: Promotion
  ): boolean {
    const now = new Date();
    
    // Verificar fechas de validez
    if (promotion.startDate && now < promotion.startDate) {
      return false;
    }
    
    if (promotion.endDate && now > promotion.endDate) {
      return false;
    }

    // Verificar condiciones específicas
    switch (promotion.type) {
      case 'MINIMUM_ORDER':
        const subtotal = PricingService.calculateSubtotal(items);
        return subtotal.isGreaterThan(Price.fromDollars(promotion.minimumAmount!));

      case 'ITEM_SPECIFIC':
        return items.some(item => 
          promotion.applicableItems!.includes(item.menuItemName)
        );

      case 'COMBO_DEAL':
        return PricingService.hasRequiredComboItems(items, promotion.requiredItems!);

      case 'FIRST_ORDER':
        // Esta validación requeriría información del cliente
        return true; // Simplificado

      default:
        return true;
    }
  }

  /**
   * 🎁 PATRÓN: Promotion Application Pattern
   * Aplicar promoción específica
   */
  private static applyPromotion(
    items: PricingItem[],
    promotion: Promotion
  ): Price {
    switch (promotion.type) {
      case 'PERCENTAGE':
        const subtotal = PricingService.calculateSubtotal(items);
        return subtotal.multiply(promotion.discountPercentage! / 100);

      case 'FIXED_AMOUNT':
        return Price.fromDollars(promotion.discountAmount!);

      case 'BUY_X_GET_Y':
        return PricingService.applyBuyXGetYDiscount(items, promotion);

      case 'COMBO_DEAL':
        return PricingService.applyComboDiscount(items, promotion);

      default:
        return Price.zero();
    }
  }

  /**
   * 🛒 PATRÓN: Buy X Get Y Pattern
   * Aplicar descuento "compra X lleva Y"
   */
  private static applyBuyXGetYDiscount(
    items: PricingItem[],
    promotion: Promotion
  ): Price {
    const targetItem = items.find(item => 
      item.menuItemName === promotion.targetItem
    );

    if (!targetItem) {
      return Price.zero();
    }

    const buyQuantity = promotion.buyQuantity!;
    const getQuantity = promotion.getQuantity!;
    const eligibleSets = Math.floor(targetItem.quantity / buyQuantity);
    const freeItems = eligibleSets * getQuantity;

    return targetItem.unitPrice.multiply(freeItems);
  }

  /**
   * 🍽️ PATRÓN: Combo Deal Pattern
   * Aplicar descuento de combo
   */
  private static applyComboDiscount(
    items: PricingItem[],
    promotion: Promotion
  ): Price {
    if (!PricingService.hasRequiredComboItems(items, promotion.requiredItems!)) {
      return Price.zero();
    }

    const comboPrice = Price.fromDollars(promotion.comboPrice!);
    const individualTotal = promotion.requiredItems!.reduce((total, itemName) => {
      const item = items.find(i => i.menuItemName === itemName);
      return item ? total.add(item.unitPrice) : total;
    }, Price.zero());

    return individualTotal.subtract(comboPrice);
  }

  /**
   * 🔍 PATRÓN: Combo Validation Pattern
   * Verificar si tiene items requeridos para combo
   */
  private static hasRequiredComboItems(
    items: PricingItem[],
    requiredItems: string[]
  ): boolean {
    return requiredItems.every(requiredItem =>
      items.some(item => item.menuItemName === requiredItem)
    );
  }

  /**
   * 📊 PATRÓN: Price Breakdown Pattern
   * Crear desglose detallado de precios
   */
  private static createPriceBreakdown(
    items: PricingItem[],
    quantityDiscount: Price,
    customerDiscount: Price,
    promotionDiscount: Price,
    tax: Price
  ): PriceBreakdownItem[] {
    const breakdown: PriceBreakdownItem[] = [];

    // Items individuales
    items.forEach(item => {
      breakdown.push({
        description: `${item.menuItemName} (x${item.quantity})`,
        amount: item.unitPrice.multiply(item.quantity),
        type: 'ITEM'
      });
    });

    // Descuentos
    if (quantityDiscount.isPositive()) {
      breakdown.push({
        description: 'Quantity Discount',
        amount: quantityDiscount.multiply(-1), // Negativo para mostrar descuento
        type: 'DISCOUNT'
      });
    }

    if (customerDiscount.isPositive()) {
      breakdown.push({
        description: 'Customer Loyalty Discount',
        amount: customerDiscount.multiply(-1),
        type: 'DISCOUNT'
      });
    }

    if (promotionDiscount.isPositive()) {
      breakdown.push({
        description: 'Promotion Discount',
        amount: promotionDiscount.multiply(-1),
        type: 'DISCOUNT'
      });
    }

    // Impuestos
    if (tax.isPositive()) {
      breakdown.push({
        description: 'Tax',
        amount: tax,
        type: 'TAX'
      });
    }

    return breakdown;
  }

  /**
   * 💡 PATRÓN: Dynamic Pricing Pattern
   * Calcular precio dinámico basado en demanda/tiempo
   */
  public static calculateDynamicPrice(
    basePrice: Price,
    demandFactor: number = 1.0,
    timeFactor: number = 1.0,
    inventoryFactor: number = 1.0
  ): Price {
    // Factores de ajuste de precio
    const totalFactor = demandFactor * timeFactor * inventoryFactor;
    
    // Limitar ajustes entre 0.8x y 1.5x del precio base
    const clampedFactor = Math.max(0.8, Math.min(1.5, totalFactor));
    
    return basePrice.multiply(clampedFactor);
  }

  /**
   * 🎯 PATRÓN: Price Optimization Pattern
   * Optimizar precios para maximizar conversión
   */
  public static optimizePriceForConversion(
    basePrice: Price,
    customerTier: string,
    cartValue: Price
  ): PriceOptimizationResult {
    let optimizedPrice = basePrice;
    let confidence = 100;
    const adjustments: string[] = [];

    // Ajuste por tier de cliente
    if (customerTier === 'PLATINUM') {
      optimizedPrice = optimizedPrice.multiply(0.95); // 5% descuento
      adjustments.push('Platinum customer discount applied');
      confidence = 95;
    } else if (customerTier === 'GOLD') {
      optimizedPrice = optimizedPrice.multiply(0.97); // 3% descuento
      adjustments.push('Gold customer discount applied');
      confidence = 90;
    }

    // Ajuste por valor del carrito
    if (cartValue.isGreaterThan(Price.fromDollars(100))) {
      optimizedPrice = optimizedPrice.multiply(0.98); // 2% descuento adicional
      adjustments.push('High cart value discount applied');
      confidence = Math.min(confidence, 85);
    }

    return {
      originalPrice: basePrice,
      optimizedPrice,
      savings: basePrice.subtract(optimizedPrice),
      confidence,
      adjustments
    };
  }
}

/**
 * 💰 PATRÓN: Pricing Item Pattern
 * Item para cálculos de precio
 */
export interface PricingItem {
  menuItemName: string;
  quantity: number;
  unitPrice: Price;
}

/**
 * 📊 PATRÓN: Pricing Result Pattern
 * Resultado completo de cálculo de precios
 */
export interface PricingResult {
  subtotal: Price;
  quantityDiscount: Price;
  customerDiscount: Price;
  promotionDiscount: Price;
  totalDiscount: Price;
  discountedSubtotal: Price;
  taxRate: number;
  tax: Price;
  total: Price;
  savings: Price;
  breakdown: PriceBreakdownItem[];
}

/**
 * 📋 PATRÓN: Price Breakdown Pattern
 * Item del desglose de precios
 */
export interface PriceBreakdownItem {
  description: string;
  amount: Price;
  type: 'ITEM' | 'DISCOUNT' | 'TAX' | 'FEE';
}

/**
 * 🎁 PATRÓN: Promotion Pattern
 * Definición de promoción
 */
export interface Promotion {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'COMBO_DEAL' | 'MINIMUM_ORDER' | 'ITEM_SPECIFIC' | 'FIRST_ORDER';
  discountPercentage?: number;
  discountAmount?: number;
  minimumAmount?: number;
  applicableItems?: string[];
  requiredItems?: string[];
  targetItem?: string;
  buyQuantity?: number;
  getQuantity?: number;
  comboPrice?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

/**
 * 🎯 PATRÓN: Price Optimization Pattern
 * Resultado de optimización de precios
 */
export interface PriceOptimizationResult {
  originalPrice: Price;
  optimizedPrice: Price;
  savings: Price;
  confidence: number;
  adjustments: string[];
}
