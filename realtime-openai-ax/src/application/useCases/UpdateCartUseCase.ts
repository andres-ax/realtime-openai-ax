/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + Cart Management + Real-time Updates
 * 
 * UpdateCartUseCase - Caso de uso para operaciones de carrito
 * Maneja todas las operaciones de actualización del carrito con sincronización en tiempo real
 */

import { Cart } from '../../domain/entities/Cart';
// CartItem imported in Cart entity
import { Customer } from '../../domain/entities/Customer';
import { MenuItem } from '../../domain/entities/MenuItem';
import { Agent } from '../../domain/entities/Agent';
// PricingService used for calculations
import { CartId } from '../../domain/valueObjects/CartId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { Price } from '../../domain/valueObjects/Price';
import { Quantity } from '../../domain/valueObjects/Quantity';
import { CartUpdatedEvent } from '../../domain/events/CartUpdatedEvent';

/**
 * 🎯 PATRÓN: Use Case Pattern
 * UpdateCartUseCase encapsula la lógica de aplicación para operaciones de carrito
 */
export class UpdateCartUseCase {
  
  /**
   * 🔧 PATRÓN: Dependency Injection Pattern
   * Constructor con dependencias inyectadas
   */
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly agentRepository: AgentRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  /**
   * 🔄 PATRÓN: Command Handler Pattern
   * Agregar item al carrito
   */
  public async addItemToCart(command: AddItemToCartCommand): Promise<UpdateCartResult> {
    try {
      // 1. Validar entrada
      const validation = this.validateAddItemCommand(command);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error!,
          validationWarnings: validation.warnings
        };
      }

      // 2. Cargar o crear carrito
      const cart = await this.loadOrCreateCart(command.cartId, command.customerId);

      // 3. Cargar información del item del menú
      const menuItem = await this.menuItemRepository.findByName(command.menuItemName);
      if (!menuItem) {
        return {
          success: false,
          error: `Menu item not found: ${command.menuItemName}`
        };
      }

      // 4. Agregar item al carrito
      const quantity = Quantity.fromNumber(command.quantity);
      const unitPrice = menuItem.getPrice();
      
      cart.addItem(command.menuItemName, quantity.getValue(), unitPrice);

      // 5. Guardar carrito actualizado
      await this.cartRepository.save(cart);

      // 6. Publicar evento de actualización
      const event = new CartUpdatedEvent(
        cart.id,
        cart.getItems().map(item => ({
          menuItemName: item.getMenuItemName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice(),
          subtotal: item.getSubtotal()
        })),
        cart.calculateSubtotal(),
        cart.getItemCount()
      );

      await this.eventPublisher.publish(event);

      // 7. Preparar resultado
      return {
        success: true,
        cart,
        cartSummary: this.buildCartSummary(cart),
        pricingDetails: await this.calculatePricingDetails(cart),
        uiHints: this.generateUIHints(cart, 'ITEM_ADDED')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item to cart'
      };
    }
  }

  /**
   * 🗑️ PATRÓN: Command Handler Pattern
   * Remover item del carrito
   */
  public async removeItemFromCart(command: RemoveItemFromCartCommand): Promise<UpdateCartResult> {
    try {
      // 1. Validar entrada
      if (!command.cartId || !command.menuItemName) {
        return {
          success: false,
          error: 'Cart ID and menu item name are required'
        };
      }

      // 2. Cargar carrito
      const cart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // 3. Obtener item antes de remover para el evento
      const removedItem = cart.getItems().find(item => 
        item.getMenuItemName() === command.menuItemName
      );

      // 4. Remover item del carrito
      cart.removeItem(command.menuItemName);

      // 5. Guardar carrito actualizado
      await this.cartRepository.save(cart);

      // 6. Publicar evento de actualización
      const event = new CartUpdatedEvent(
        cart.id,
        cart.getItems().map(item => ({
          menuItemName: item.getMenuItemName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice(),
            subtotal: item.getSubtotal()
        })),
        cart.calculateSubtotal(),
        cart.getItemCount()
      );

      await this.eventPublisher.publish(event);

      // 7. Preparar resultado
      return {
        success: true,
        cart,
        cartSummary: this.buildCartSummary(cart),
        pricingDetails: await this.calculatePricingDetails(cart),
        uiHints: this.generateUIHints(cart, 'ITEM_REMOVED')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item from cart'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Command Handler Pattern
   * Actualizar cantidad de item
   */
  public async updateItemQuantity(command: UpdateItemQuantityCommand): Promise<UpdateCartResult> {
    try {
      // 1. Validar entrada
      if (!command.cartId || !command.menuItemName || command.newQuantity <= 0) {
        return {
          success: false,
          error: 'Valid cart ID, menu item name, and positive quantity are required'
        };
      }

      // 2. Cargar carrito
      const cart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // 3. Actualizar cantidad
      const newQuantity = Quantity.fromNumber(command.newQuantity);
      cart.updateItemQuantity(command.menuItemName, newQuantity.getValue());

      // 4. Guardar carrito actualizado
      await this.cartRepository.save(cart);

      // 5. Publicar evento de actualización
      const event = new CartUpdatedEvent(
        cart.id,
        cart.getItems().map(item => ({
          menuItemName: item.getMenuItemName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice(),
          subtotal: item.getSubtotal()
        })),
        cart.calculateSubtotal(),
        cart.getItemCount()
      );

      await this.eventPublisher.publish(event);

      // 6. Preparar resultado
      return {
        success: true,
        cart,
        cartSummary: this.buildCartSummary(cart),
        pricingDetails: await this.calculatePricingDetails(cart),
        uiHints: this.generateUIHints(cart, 'ITEM_QUANTITY_CHANGED')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item quantity'
      };
    }
  }

  /**
   * 🗑️ PATRÓN: Command Handler Pattern
   * Limpiar carrito completamente
   */
  public async clearCart(command: ClearCartCommand): Promise<UpdateCartResult> {
    try {
      // 1. Validar entrada
      if (!command.cartId) {
        return {
          success: false,
          error: 'Cart ID is required'
        };
      }

      // 2. Cargar carrito
      const cart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // 3. Obtener count anterior para el evento
      const previousItemCount = cart.getItemCount();

      // 4. Limpiar carrito
      cart.clear();

      // 5. Guardar carrito actualizado
      await this.cartRepository.save(cart);

      // 6. Publicar evento de actualización
      const event = new CartUpdatedEvent(
        cart.id,
        [],
        Price.fromDollars(0),
        0
      );

      await this.eventPublisher.publish(event);

      // 7. Preparar resultado
      return {
        success: true,
        cart,
        cartSummary: this.buildCartSummary(cart),
        pricingDetails: await this.calculatePricingDetails(cart),
        uiHints: this.generateUIHints(cart, 'CART_CLEARED')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart'
      };
    }
  }

  /**
   * 📊 PATRÓN: Query Handler Pattern
   * Obtener estado actual del carrito
   */
  public async getCartStatus(command: GetCartStatusCommand): Promise<CartStatusResult> {
    try {
      // 1. Validar entrada
      if (!command.cartId) {
        return {
          success: false,
          error: 'Cart ID is required'
        };
      }

      // 2. Cargar carrito
      const cart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      if (!cart) {
        return {
          success: false,
          error: 'Cart not found'
        };
      }

      // 3. Preparar resultado
      return {
        success: true,
        cart,
        cartSummary: this.buildCartSummary(cart),
        pricingDetails: await this.calculatePricingDetails(cart),
        recommendations: await this.generateRecommendations(cart)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cart status'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar comando de agregar item
   */
  private validateAddItemCommand(command: AddItemToCartCommand): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!command.menuItemName) errors.push('Menu item name is required');
    if (!command.quantity || command.quantity <= 0) errors.push('Valid quantity is required');
    if (command.quantity > 10) warnings.push('Large quantity ordered');

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      warnings
    };
  }

  /**
   * 🏗️ PATRÓN: Cart Factory Pattern
   * Cargar o crear carrito
   */
  private async loadOrCreateCart(cartId?: string, customerId?: string): Promise<Cart> {
    if (cartId) {
      const existingCart = await this.cartRepository.findById(CartId.fromString(cartId));
      if (existingCart) {
        return existingCart;
      }
    }

    // Crear nuevo carrito
    const newCartId = CartId.generate();
    const customerIdObj = customerId ? CustomerId.fromString(customerId) : undefined;
    
    return new Cart(newCartId, customerIdObj);
  }

  /**
   * 📊 PATRÓN: Summary Builder Pattern
   * Construir resumen del carrito
   */
  private buildCartSummary(cart: Cart): CartSummary {
    const subtotal = cart.calculateSubtotal().getValue();
    const tax = subtotal * 0.0825; // 8.25% tax
    
    return {
      itemCount: cart.getItemCount(),
      totalAmount: subtotal + tax,
      subtotal,
      tax,
      discounts: 0, // TODO: Implement discount calculation
      estimatedDeliveryTime: '25-30 minutes'
    };
  }

  /**
   * 💰 PATRÓN: Pricing Calculation Pattern
   * Calcular detalles de precios
   */
  private async calculatePricingDetails(cart: Cart): Promise<CartPricingDetails> {
    const items = cart.getItems();
    const breakdown: PriceBreakdown[] = items.map(item => ({
      itemName: item.getMenuItemName(),
      quantity: item.getQuantity(),
      unitPrice: item.getUnitPrice().getValue(),
      totalPrice: item.getSubtotal().getValue()
    }));

    const subtotal = cart.calculateSubtotal().getValue();
    const tax = subtotal * 0.0825;
    const discounts: CartDiscount[] = []; // TODO: Implement discount logic
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      discounts,
      total,
      currency: 'USD',
      breakdown
    };
  }

  /**
   * 💡 PATRÓN: Recommendation Engine Pattern
   * Generar recomendaciones para el carrito
   */
  private async generateRecommendations(cart: Cart): Promise<CartRecommendation[]> {
    const recommendations: CartRecommendation[] = [];
    const items = cart.getItems();
    const itemNames = items.map(item => item.getMenuItemName().toLowerCase());

    // Recomendación de bebida
    const hasDrink = itemNames.some(name => name.includes('combo') || name.includes('soda'));
    if (!hasDrink && items.length > 0) {
      recommendations.push({
        type: 'COMPLEMENT',
        title: 'Add a Drink',
        description: 'Complete your meal with a refreshing beverage',
        suggestedItems: ['Combo Postobón', 'Manzana Postobón'],
        priority: 'HIGH'
      });
    }

    // Recomendación de acompañamiento
    const hasSides = itemNames.some(name => name.includes('fries'));
    if (!hasSides && items.length > 0) {
      recommendations.push({
        type: 'COMPLEMENT',
        title: 'Add Fries',
        description: 'Perfect side for your meal',
        suggestedItems: ['Fries'],
        priority: 'MEDIUM'
      });
    }

    return recommendations;
  }

  /**
   * 🎨 PATRÓN: UI Hints Generation Pattern
   * Generar hints para la UI
   */
  private generateUIHints(cart: Cart, operation: string): CartUIHints {
    return {
      shouldShowCheckout: cart.getItemCount() > 0,
      shouldShowRecommendations: cart.getItemCount() > 0 && cart.getItemCount() < 5,
      shouldHighlightChanges: true,
      animationType: operation === 'ITEM_ADDED' ? 'bounce' : 'fade'
    };
  }
}

/**
 * 📊 PATRÓN: Command Pattern
 * Comandos para operaciones de carrito
 */
export interface AddItemToCartCommand {
  cartId?: string;
  customerId?: string;
  sessionId?: string;
  menuItemName: string;
  quantity: number;
  specialInstructions?: string;
}

export interface RemoveItemFromCartCommand {
  cartId: string;
  customerId?: string;
  sessionId?: string;
  menuItemName: string;
}

export interface UpdateItemQuantityCommand {
  cartId: string;
  customerId?: string;
  sessionId?: string;
  menuItemName: string;
  newQuantity: number;
}

export interface ClearCartCommand {
  cartId: string;
  customerId?: string;
  sessionId?: string;
}

export interface GetCartStatusCommand {
  cartId: string;
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultados de operaciones de carrito
 */
export interface UpdateCartResult {
  success: boolean;
  cart?: Cart;
  cartSummary?: CartSummary;
  pricingDetails?: CartPricingDetails;
  error?: string;
  validationWarnings?: string[];
  uiHints?: CartUIHints;
}

export interface CartStatusResult {
  success: boolean;
  cart?: Cart;
  cartSummary?: CartSummary;
  pricingDetails?: CartPricingDetails;
  recommendations?: CartRecommendation[];
  error?: string;
}

/**
 * 🛡️ PATRÓN: Validation Result Pattern
 * Resultado de validación
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
}

/**
 * 🎨 PATRÓN: UI Hints Pattern
 * Hints para la interfaz de usuario
 */
export interface CartUIHints {
  shouldShowCheckout: boolean;
  shouldShowRecommendations: boolean;
  shouldHighlightChanges: boolean;
  animationType?: 'slide' | 'fade' | 'bounce';
}

/**
 * 📊 PATRÓN: Cart Type Definitions
 * Tipos específicos para operaciones de carrito
 */
export interface CartSummary {
  itemCount: number;
  totalAmount: number;
  subtotal: number;
  tax: number;
  discounts: number;
  estimatedDeliveryTime?: string;
}

export interface CartPricingDetails {
  subtotal: number;
  tax: number;
  discounts: CartDiscount[];
  total: number;
  currency: string;
  breakdown: PriceBreakdown[];
}

export interface CartDiscount {
  type: string;
  description: string;
  amount: number;
  percentage?: number;
}

export interface PriceBreakdown {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartRecommendation {
  type: 'COMPLEMENT' | 'UPSELL' | 'POPULAR';
  title: string;
  description: string;
  suggestedItems: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * 🏪 PATRÓN: Repository Pattern (Interfaces)
 * Interfaces de repositorios para carrito
 */
export interface CartRepository {
  save(cart: Cart): Promise<Cart>;
  findById(id: CartId): Promise<Cart | null>;
  findByCustomerId(customerId: CustomerId): Promise<Cart[]>;
}

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
}

export interface MenuItemRepository {
  findByName(name: string): Promise<MenuItem | null>;
  findById(id: string): Promise<MenuItem | null>;
}

export interface AgentRepository {
  findById(id: string): Promise<Agent | null>;
}

export interface EventPublisher {
  publish(event: CartUpdatedEvent): Promise<void>;
}