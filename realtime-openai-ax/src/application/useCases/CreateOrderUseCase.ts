/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + Dependency Inversion + CQRS
 * 
 * CreateOrderUseCase - Caso de uso para crear pedidos desde carrito
 * Orquesta la creación de pedidos aplicando reglas de negocio
 */

import { Order } from '../../domain/entities/Order';
import { Cart } from '../../domain/entities/Cart';
import { Customer } from '../../domain/entities/Customer';
import { MenuItem } from '../../domain/entities/MenuItem';
import { OrderService } from '../../domain/services/OrderService';
import { ValidationService } from '../../domain/services/ValidationService';
import { PricingService, Promotion as DomainPromotion, PricingResult } from '../../domain/services/PricingService';
import { DeliveryTimeEstimate } from '../../domain/services/OrderService';
import { DeliveryAddress } from '../../domain/valueObjects/DeliveryAddress';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { CartId } from '../../domain/valueObjects/CartId';

/**
 * 🎯 PATRÓN: Use Case Pattern
 * CreateOrderUseCase encapsula la lógica de aplicación para crear pedidos
 */
export class CreateOrderUseCase {
  
  /**
   * 🔧 PATRÓN: Dependency Injection Pattern
   * Constructor con dependencias inyectadas
   */
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartRepository: CartRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly menuItemRepository: MenuItemRepository
  ) {}

  /**
   * 🎯 PATRÓN: Command Handler Pattern
   * Ejecutar caso de uso de creación de pedido
   */
  public async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    try {
      // 1. Validar entrada
      const inputValidation = this.validateInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          error: inputValidation.error!,
          validationErrors: inputValidation.errors
        };
      }

      // 2. Obtener entidades necesarias
      const entities = await this.loadRequiredEntities(command);
      if (!entities.success) {
        return {
          success: false,
          error: entities.error!
        };
      }

      const { cart, customer, menuItems } = entities;

      // 3. Validar carrito para checkout
      const cartValidation = ValidationService.validateCartForCheckout(cart!, menuItems!);
      if (!cartValidation.isValid) {
        return {
          success: false,
          error: 'Cart validation failed',
          validationErrors: cartValidation.errors.map(e => e.message)
        };
      }

      // 4. Crear dirección de entrega
      const deliveryAddress = this.createDeliveryAddress(command.deliveryInfo);

      // 5. Crear pedido usando Domain Service
      const order = OrderService.createOrderFromCart(
        cart!,
        customer!,
        deliveryAddress,
        menuItems!
      );

      // 6. Aplicar información de pago si se proporciona
      if (command.paymentInfo) {
        order.setPaymentInfo(command.paymentInfo);
      }

      // 7. Validar pedido completo
      const orderValidation = ValidationService.validateOrderForConfirmation(
        order,
        customer!,
        menuItems!
      );

      if (!orderValidation.canProceed) {
        return {
          success: false,
          error: 'Order validation failed',
          validationErrors: orderValidation.errors.map(e => e.message),
          warnings: orderValidation.warnings.map(w => w.message)
        };
      }

      // 8. Calcular precios finales
      const pricingResult = PricingService.calculateTotalPrice(
        cart!.getItems().map(item => ({
          menuItemName: item.getMenuItemName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice()
        })),
        customer,
        this.mapPromotionsToDomain(command.promotions || [])
      );

      // 9. Persistir pedido
      const savedOrder = await this.orderRepository.save(order);

      // 10. Limpiar carrito después de crear pedido exitosamente
      if (command.clearCartAfterOrder !== false) {
        cart!.clear();
        await this.cartRepository.save(cart!);
      }

      // 11. Registrar pedido en historial del cliente
      customer!.recordCompletedOrder(pricingResult.total.getValue());
      await this.customerRepository.save(customer!);

      // 12. Estimar tiempo de entrega
      const deliveryEstimate = OrderService.estimateDeliveryTime(savedOrder, menuItems!);

      return {
        success: true,
        order: savedOrder,
        orderId: savedOrder.id.toString(),
        pricingDetails: pricingResult,
        deliveryEstimate,
        warnings: orderValidation.warnings.map(w => w.message)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar datos de entrada del comando
   */
  private validateInput(command: CreateOrderCommand): InputValidationResult {
    const errors: string[] = [];

    if (!command.cartId) {
      errors.push('Cart ID is required');
    }

    if (!command.customerId) {
      errors.push('Customer ID is required');
    }

    if (!command.deliveryInfo) {
      errors.push('Delivery information is required');
    } else {
      if (!command.deliveryInfo.street) errors.push('Street address is required');
      if (!command.deliveryInfo.city) errors.push('City is required');
      if (!command.deliveryInfo.state) errors.push('State is required');
      if (!command.deliveryInfo.zipCode) errors.push('ZIP code is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Data Loading Pattern
   * Cargar entidades requeridas desde repositorios
   */
  private async loadRequiredEntities(
    command: CreateOrderCommand
  ): Promise<EntityLoadResult> {
    try {
      // Cargar carrito
      const cart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      if (!cart) {
        return { success: false, error: 'Cart not found' };
      }

      // Cargar cliente
      const customer = await this.customerRepository.findById(
        CustomerId.fromString(command.customerId)
      );
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      // Cargar items del menú
      const menuItemNames = cart.getItems().map(item => item.getMenuItemName());
      const menuItems = await this.menuItemRepository.findByNames(menuItemNames);
      
      if (menuItems.length !== menuItemNames.length) {
        return { success: false, error: 'Some menu items not found' };
      }

      return {
        success: true,
        cart,
        customer,
        menuItems
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load entities'
      };
    }
  }

  /**
   * 📍 PATRÓN: Address Factory Pattern
   * Crear dirección de entrega desde información del comando
   */
  private createDeliveryAddress(deliveryInfo: DeliveryInfo): DeliveryAddress {
    if (deliveryInfo.coordinates) {
      return DeliveryAddress.createWithCoordinates(
        deliveryInfo.street,
        deliveryInfo.city,
        deliveryInfo.state,
        deliveryInfo.zipCode,
        deliveryInfo.coordinates.latitude,
        deliveryInfo.coordinates.longitude,
        deliveryInfo.country || 'US',
        deliveryInfo.additionalInfo
      );
    }

    return DeliveryAddress.create(
      deliveryInfo.street,
      deliveryInfo.city,
      deliveryInfo.state,
      deliveryInfo.zipCode,
      deliveryInfo.country || 'US',
      deliveryInfo.additionalInfo
    );
  }

  /**
   * 🔄 PATRÓN: Data Mapping Pattern
   * Mapear promociones de aplicación a dominio
   */
  private mapPromotionsToDomain(promotions: Promotion[]): DomainPromotion[] {
    return promotions.map(promo => ({
      id: promo.id,
      name: promo.code,
      type: promo.type as DomainPromotion['type'], // Cast to domain type
      discountPercentage: promo.type === 'PERCENTAGE' ? promo.value : undefined,
      discountAmount: promo.type === 'FIXED_AMOUNT' ? promo.value : undefined,
      isActive: true,
      startDate: undefined,
      endDate: undefined
    }));
  }
}

/**
 * 📊 PATRÓN: Command Pattern
 * Comando para crear pedido
 */
export interface CreateOrderCommand {
  cartId: string;
  customerId: string;
  deliveryInfo: DeliveryInfo;
  paymentInfo?: PaymentInfo;
  promotions?: Promotion[];
  clearCartAfterOrder?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * 📍 PATRÓN: Data Transfer Object
 * Información de entrega
 */
export interface DeliveryInfo {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  additionalInfo?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * 💳 PATRÓN: Payment Information Pattern
 * Información de pago
 */
export interface PaymentInfo {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
}

/**
 * 🎁 PATRÓN: Promotion Pattern
 * Promoción aplicable
 */
export interface Promotion {
  id: string;
  code: string;
  type: string;
  value: number;
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de creación de pedido
 */
export interface CreateOrderResult {
  success: boolean;
  order?: Order;
  orderId?: string;
  pricingDetails?: PricingResult;
  deliveryEstimate?: DeliveryTimeEstimate;
  error?: string;
  validationErrors?: string[];
  warnings?: string[];
}

/**
 * 🛡️ PATRÓN: Validation Result Pattern
 * Resultado de validación de entrada
 */
interface InputValidationResult {
  isValid: boolean;
  errors: string[];
  error?: string;
}

/**
 * 📊 PATRÓN: Entity Loading Result Pattern
 * Resultado de carga de entidades
 */
interface EntityLoadResult {
  success: boolean;
  error?: string;
  cart?: Cart;
  customer?: Customer;
  menuItems?: MenuItem[];
}

/**
 * 🏪 PATRÓN: Repository Pattern (Interfaces)
 * Interfaces de repositorios para inversión de dependencias
 */
export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
}

export interface CartRepository {
  save(cart: Cart): Promise<Cart>;
  findById(id: CartId): Promise<Cart | null>;
  findByCustomerId(customerId: CustomerId): Promise<Cart | null>;
}

export interface CustomerRepository {
  save(customer: Customer): Promise<Customer>;
  findById(id: CustomerId): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
}

export interface MenuItemRepository {
  findByNames(names: string[]): Promise<MenuItem[]>;
  findById(id: string): Promise<MenuItem | null>;
  findAvailable(): Promise<MenuItem[]>;
}
