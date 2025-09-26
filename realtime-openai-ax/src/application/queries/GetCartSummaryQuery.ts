/**
 * 🏗️ PATRÓN: Query Pattern (CQRS)
 * 🎯 PRINCIPIO: Query Responsibility + Real-time Cart + Browser Storage
 * 
 * GetCartSummaryQuery - Query para obtener resumen del carrito
 * Optimizada para demostración con datos en tiempo real del navegador
 */

import { BaseQuery, QueryValidationResult, QueryMetadata, SerializedQuery } from './BaseQuery';
import { Cart } from '../../domain/entities/Cart';
import { CartId } from '../../domain/valueObjects/CartId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { Price } from '../../domain/valueObjects/Price';

/**
 * 🎯 PATRÓN: Query Pattern
 * GetCartSummaryQuery encapsula la consulta de resumen del carrito
 */
export class GetCartSummaryQuery extends BaseQuery {
  
  /**
   * 🔧 PATRÓN: Immutable Query Pattern
   * Constructor que crea query inmutable
   */
  constructor(
    public readonly cartId?: string,
    public readonly customerId?: string,
    public readonly sessionId?: string,
    public readonly includeItems: boolean = true,
    public readonly includePricing: boolean = true,
    public readonly includeRecommendations: boolean = false,
    queryId?: string
  ) {
    super(queryId);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar query antes de ejecución
   */
  public validate(): QueryValidationResult {
    const errors: string[] = [];

    // Al menos uno de los identificadores debe estar presente
    if (!this.cartId && !this.customerId && !this.sessionId) {
      errors.push('At least one identifier (cartId, customerId, or sessionId) is required');
    }

    // Validar formato de IDs si están presentes
    if (this.cartId && !this.isValidUUID(this.cartId)) {
      errors.push('Invalid cart ID format');
    }

    if (this.customerId && !this.isValidUUID(this.customerId)) {
      errors.push('Invalid customer ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Query Metadata Pattern
   * Obtener metadatos de la query
   */
  public getMetadata(): QueryMetadata {
    return {
      queryType: 'GetCartSummaryQuery',
      queryId: this.queryId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      customerId: this.customerId,
      targetResource: this.cartId || 'cart-summary',
      isCacheable: false, // Datos de carrito cambian frecuentemente
      estimatedDuration: this.getEstimatedDuration(),
      requiresRealTimeData: true,
      dataSource: 'BROWSER_STORAGE'
    };
  }

  /**
   * 🔄 PATRÓN: Query Serialization Pattern
   * Serializar query para transmisión
   */
  public serialize(): SerializedQuery {
    return {
      queryType: 'GetCartSummaryQuery',
      queryId: this.queryId,
      timestamp: this.timestamp.toISOString(),
      parameters: {
        cartId: this.cartId,
        customerId: this.customerId,
        sessionId: this.sessionId,
        includeItems: this.includeItems,
        includePricing: this.includePricing,
        includeRecommendations: this.includeRecommendations
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear query desde datos serializados
   */
  public static fromSerialized(data: SerializedQuery): GetCartSummaryQuery {
    if (data.queryType !== 'GetCartSummaryQuery') {
      throw new Error('Invalid query type for GetCartSummaryQuery');
    }

    const params = data.parameters as {
      cartId?: string;
      customerId?: string;
      sessionId?: string;
      includeItems: boolean;
      includePricing: boolean;
      includeRecommendations: boolean;
    };
    return new GetCartSummaryQuery(
      params.cartId,
      params.customerId,
      params.sessionId,
      params.includeItems,
      params.includePricing,
      params.includeRecommendations,
      data.queryId
    );
  }

  /**
   * 🎯 PATRÓN: Query Builder Pattern
   * Builder para construcción fluida de queries
   */
  public static builder(): GetCartSummaryQueryBuilder {
    return new GetCartSummaryQueryBuilder();
  }

  /**
   * 📊 PATRÓN: Query Execution Pattern
   * Ejecutar query y obtener resumen del carrito
   */
  public async execute(): Promise<GetCartSummaryResult> {
    try {
      // 1. Validar query
      const validation = this.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage!,
          validationErrors: validation.errors
        };
      }

      // 2. Obtener carrito
      const cart = await this.loadCart();
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // 3. Construir resumen
      const summary = await this.buildCartSummary(cart);

      return {
        success: true,
        cartSummary: summary,
        queryMetadata: this.getMetadata()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Cart Loading Pattern
   * Cargar carrito desde browser storage
   */
  private async loadCart(): Promise<Cart | null> {
    let cartKey: string;

    if (this.cartId) {
      cartKey = this.getStorageKey('cart', this.cartId);
    } else if (this.sessionId) {
      cartKey = this.getStorageKey('session-cart', this.sessionId);
    } else if (this.customerId) {
      cartKey = this.getStorageKey('customer-cart', this.customerId);
    } else {
      return null;
    }

    const cartData = this.getBrowserStorage(cartKey) as Record<string, unknown>;
    if (!cartData) {
      return null;
    }

    return this.reconstructCartFromStorage(cartData);
  }

  /**
   * 🏗️ PATRÓN: Object Reconstruction Pattern
   * Reconstruir entidad Cart desde datos de storage
   */
  private reconstructCartFromStorage(data: Record<string, unknown>): Cart {
    // En una implementación real, aquí reconstruiríamos la entidad completa
    // Por ahora, creamos un objeto que simula la estructura
    const cartId = CartId.fromString(data.id as string);
    const customerId = data.customerId ? CustomerId.fromString(data.customerId as string) : undefined;
    
    // Crear carrito básico (en implementación real usaríamos factory methods)
    const cart = new Cart(cartId, customerId);
    
    // Agregar items si existen
    if (data.items && Array.isArray(data.items)) {
        (data.items as Array<Record<string, unknown>>).forEach((item: Record<string, unknown>) => {
        cart.addItem(item.menuItemName as string, item.quantity as number, Price.fromDollars(item.unitPrice as number));
      });
    }

    return cart;
  }

  /**
   * 📊 PATRÓN: Summary Builder Pattern
   * Construir resumen completo del carrito
   */
  private async buildCartSummary(cart: Cart): Promise<CartSummary> {
    const summary: CartSummary = {
      cartId: cart.id.toString(),
      customerId: cart.getCustomerId()?.toString(),
      isEmpty: cart.isEmpty(),
      isActive: cart.isActive(),
      isExpired: cart.isExpired(),
      itemCount: cart.getItemCount(),
      totalQuantity: cart.getTotalQuantity(),
      lastUpdated: cart.updatedAt,
      createdAt: cart.createdAt
    };

    // Agregar items si se solicita
    if (this.includeItems) {
      summary.items = cart.getItems().map(item => ({
        menuItemName: item.getMenuItemName(),
        quantity: item.getQuantity(),
        unitPrice: item.getUnitPrice().getValue(),
        totalPrice: item.getSubtotal().getValue(),
        addedAt: item.getAddedAt()
      }));
    }

    // Agregar información de precios si se solicita
    if (this.includePricing) {
      summary.pricing = await this.calculatePricing(cart);
    }

    // Agregar recomendaciones si se solicita
    if (this.includeRecommendations) {
      summary.recommendations = await this.generateRecommendations(cart);
    }

    return summary;
  }

  /**
   * 💰 PATRÓN: Pricing Calculation Pattern
   * Calcular información de precios del carrito
   */
  private async calculatePricing(cart: Cart): Promise<CartPricing> {
    const subtotal = cart.calculateSubtotal();
    const tax = subtotal.multiply(0.0825); // 8.25% tax
    const total = subtotal.add(tax);

    // Obtener descuentos aplicables (simulado)
    const discounts = await this.getApplicableDiscounts(cart);
    const totalDiscount = discounts.reduce((sum, discount) => 
      sum + discount.amount, 0
    );

    const finalTotal = total.subtract(Price.fromDollars(totalDiscount));

    return {
      subtotal: subtotal.getValue(),
      tax: tax.getValue(),
      totalDiscount,
      total: finalTotal.getValue(),
      currency: 'USD',
      discounts,
      estimatedDeliveryFee: 2.99 // Fee fijo para demostración
    };
  }

  /**
   * 🎁 PATRÓN: Discount Calculation Pattern
   * Obtener descuentos aplicables al carrito
   */
  private async getApplicableDiscounts(cart: Cart): Promise<CartDiscount[]> {
    const discounts: CartDiscount[] = [];
    const subtotal = cart.calculateSubtotal().getValue();

    // Descuento por cantidad
    if (cart.getTotalQuantity() >= 5) {
      discounts.push({
        type: 'QUANTITY_DISCOUNT',
        description: '5+ items discount',
        amount: subtotal * 0.1, // 10% descuento
        percentage: 10
      });
    }

    // Descuento por monto mínimo
    if (subtotal >= 25) {
      discounts.push({
        type: 'MINIMUM_ORDER',
        description: '$25+ order discount',
        amount: 2.50,
        percentage: 0
      });
    }

    // Descuento de primera orden (simulado)
    const isFirstOrder = this.getBrowserStorage(
      this.getStorageKey('customer-orders', this.customerId || 'anonymous')
    ) === null;

    if (isFirstOrder) {
      discounts.push({
        type: 'FIRST_ORDER',
        description: 'First order discount',
        amount: 5.00,
        percentage: 0
      });
    }

    return discounts;
  }

  /**
   * 💡 PATRÓN: Recommendation Engine Pattern
   * Generar recomendaciones basadas en el carrito
   */
  private async generateRecommendations(cart: Cart): Promise<CartRecommendation[]> {
    const recommendations: CartRecommendation[] = [];
    const items = cart.getItems();
    const itemNames = items.map(item => item.getMenuItemName().toLowerCase());

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
        reason: 'Popular combo addition',
        priority: 'HIGH'
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
        reason: 'Classic burger combo',
        priority: 'MEDIUM'
      });
    }

    // Recomendación de postre
    if (items.length >= 2) {
      const hasDessert = itemNames.some(name => name.includes('pie') || name.includes('dessert'));
      if (!hasDessert) {
        recommendations.push({
          type: 'UPSELL',
          title: 'Try Our Apple Pie',
          description: 'Sweet ending to your meal',
          suggestedItems: ['Apple Pie'],
          reason: 'Popular dessert choice',
          priority: 'LOW'
        });
      }
    }

    // Recomendación de combo
    if (items.length >= 3 && cart.calculateSubtotal().getValue() >= 15) {
      recommendations.push({
        type: 'COMBO',
        title: 'Combo Deal Available',
        description: 'Save money with our combo deals',
        suggestedItems: [],
        reason: 'Cost savings opportunity',
        priority: 'HIGH'
      });
    }

    return recommendations;
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de ejecución
   */
  private getEstimatedDuration(): number {
    let baseDuration = 30; // 30ms base para carrito

    if (this.includeItems) baseDuration += 10;
    if (this.includePricing) baseDuration += 20; // Cálculos de precio
    if (this.includeRecommendations) baseDuration += 25; // Lógica de recomendaciones

    return baseDuration;
  }

  /**
   * 🛡️ PATRÓN: UUID Validation Pattern
   * Validar formato UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 🎨 PATRÓN: Query Decoration Pattern
   * Crear variantes de la query
   */
  public withItems(): GetCartSummaryQuery {
    return new GetCartSummaryQuery(
      this.cartId,
      this.customerId,
      this.sessionId,
      true,
      this.includePricing,
      this.includeRecommendations,
      this.queryId
    );
  }

  public withPricing(): GetCartSummaryQuery {
    return new GetCartSummaryQuery(
      this.cartId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      true,
      this.includeRecommendations,
      this.queryId
    );
  }

  public withRecommendations(): GetCartSummaryQuery {
    return new GetCartSummaryQuery(
      this.cartId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      this.includePricing,
      true,
      this.queryId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de GetCartSummaryQuery
 */
export class GetCartSummaryQueryBuilder {
  private cartId?: string;
  private customerId?: string;
  private sessionId?: string;
  private includeItems: boolean = true;
  private includePricing: boolean = true;
  private includeRecommendations: boolean = false;

  public forCart(cartId: string): this {
    this.cartId = cartId;
    return this;
  }

  public forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public inSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public withItems(): this {
    this.includeItems = true;
    return this;
  }

  public withPricing(): this {
    this.includePricing = true;
    return this;
  }

  public withRecommendations(): this {
    this.includeRecommendations = true;
    return this;
  }

  public build(): GetCartSummaryQuery {
    return new GetCartSummaryQuery(
      this.cartId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      this.includePricing,
      this.includeRecommendations
    );
  }
}

/**
 * 📊 PATRÓN: Summary Data Structures
 * Estructuras de datos para resumen del carrito
 */
export interface CartSummary {
  cartId: string;
  customerId?: string;
  isEmpty: boolean;
  isActive: boolean;
  isExpired: boolean;
  itemCount: number;
  totalQuantity: number;
  lastUpdated: Date;
  createdAt: Date;
  items?: CartItemSummary[];
  pricing?: CartPricing;
  recommendations?: CartRecommendation[];
}

export interface CartItemSummary {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
}

export interface CartPricing {
  subtotal: number;
  tax: number;
  totalDiscount: number;
  total: number;
  currency: string;
  discounts: CartDiscount[];
  estimatedDeliveryFee: number;
}

export interface CartDiscount {
  type: 'QUANTITY_DISCOUNT' | 'MINIMUM_ORDER' | 'FIRST_ORDER' | 'PROMO_CODE';
  description: string;
  amount: number;
  percentage: number;
}

export interface CartRecommendation {
  type: 'COMPLEMENT' | 'UPSELL' | 'COMBO' | 'POPULAR';
  title: string;
  description: string;
  suggestedItems: string[];
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de la query de resumen del carrito
 */
export interface GetCartSummaryResult {
  success: boolean;
  cartSummary?: CartSummary;
  error?: string;
  validationErrors?: string[];
  queryMetadata?: QueryMetadata;
}
