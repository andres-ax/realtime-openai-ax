/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + Security + Payment Processing
 * 
 * ProcessPaymentUseCase - Caso de uso para procesamiento de pagos
 * Maneja el flujo completo de pago con validaciones y seguridad
 */

import { Order } from '../../domain/entities/Order';
import { Customer } from '../../domain/entities/Customer';
// ValidationService imported in domain
import { PricingService } from '../../domain/services/PricingService';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { Price } from '../../domain/valueObjects/Price';
import { PaymentProcessedEvent } from '../../domain/events/PaymentProcessedEvent';

// Import domain types
interface DomainPromotion {
  id: string;
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'COMBO_DEAL' | 'MINIMUM_ORDER' | 'ITEM_SPECIFIC' | 'FIRST_ORDER';
  value: number;
  discountPercentage?: number;
  discountAmount?: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}

type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'APPLE_PAY';
type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

  /**
   * 🎯 PATRÓN: Use Case Pattern
   * ProcessPaymentUseCase encapsula la lógica de aplicación para procesamiento de pagos
   */
export class ProcessPaymentUseCase {

  /**
   * 🔄 PATRÓN: Promotion Mapping Pattern
   * Mapear promociones de aplicación a dominio
   */
  private mapPromotionsToDomain(promotions: AppliedPromotion[]): DomainPromotion[] {
    return promotions.map(promo => ({
      id: promo.id,
      code: promo.code,
      name: promo.code, // Use code as name
      type: promo.type as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'COMBO_DEAL' | 'MINIMUM_ORDER' | 'ITEM_SPECIFIC' | 'FIRST_ORDER',
      value: promo.discountAmount,
      discountPercentage: promo.type === 'PERCENTAGE' ? promo.discountAmount : undefined,
      discountAmount: promo.type !== 'PERCENTAGE' ? promo.discountAmount : undefined,
      isActive: true,
      startDate: undefined,
      endDate: undefined
    }));
  }
  
  /**
   * 🔧 PATRÓN: Dependency Injection Pattern
   * Constructor con dependencias inyectadas
   */
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * 💳 PATRÓN: Command Handler Pattern
   * Procesar pago completo
   */
  public async processPayment(command: ProcessPaymentCommand): Promise<ProcessPaymentResult> {
    try {
      // 1. Validar entrada
      const inputValidation = this.validatePaymentInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          error: inputValidation.error!,
          validationErrors: inputValidation.errors
        };
      }

      // 2. Cargar entidades necesarias
      const entities = await this.loadPaymentEntities(command);
      if (!entities.success) {
        return {
          success: false,
          error: entities.error!
        };
      }

      const { order, customer } = entities;

      // 3. Validar estado del pedido
      const orderValidation = this.validateOrderForPayment(order!);
      if (!orderValidation.isValid) {
        return {
          success: false,
          error: orderValidation.error!,
          validationErrors: orderValidation.errors
        };
      }

      // 4. Calcular montos finales
      const pricingResult = PricingService.calculateTotalPrice(
        order!.getItems().map(item => ({
          menuItemName: item.getMenuItemName(),
          quantity: item.getQuantity(),
          unitPrice: item.getUnitPrice()
        })),
        customer,
        this.mapPromotionsToDomain(command.appliedPromotions || [])
      );

      // 5. Validar monto del pago
      if (!pricingResult.total.isEqualTo(Price.fromDollars(command.amount))) {
        return {
          success: false,
          error: `Payment amount mismatch. Expected: ${pricingResult.total.toUSDString()}, Received: $${command.amount}`
        };
      }

      // 6. Detección de fraude
      const fraudCheck = await this.performFraudDetection(command, order!, customer!);
      if (fraudCheck.isHighRisk) {
        return {
          success: false,
          error: 'Payment blocked due to fraud detection',
          fraudReason: fraudCheck.reason,
          requiresManualReview: true
        };
      }

      // 7. Procesar pago con gateway
      const paymentResult = await this.processWithGateway(command, pricingResult.total);
      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error!,
          paymentGatewayError: paymentResult.gatewayError,
          retryable: paymentResult.retryable
        };
      }

      // 8. Actualizar pedido con información de pago (simulado)
      // order!.markAsPaid(
      //   paymentResult.transactionId!,
      //   paymentResult.paymentMethod!,
      //   pricingResult.total
      // );

      // 9. Persistir cambios
      const savedOrder = await this.orderRepository.save(order!);

      // 10. Actualizar historial del cliente (simulado)
      // customer!.recordSuccessfulPayment(pricingResult.total.getValue());
      // await this.customerRepository.save(customer!);

      // 11. Crear evento de pago procesado
      const paymentEvent = new PaymentProcessedEvent(
        savedOrder.id,
        paymentResult.transactionId!,
        pricingResult.total,
        command.paymentMethod as any,
        'COMPLETED' as PaymentStatus,
        paymentResult.transactionId!,
        {
          gateway: paymentResult.gateway || 'stripe',
          processingTime: paymentResult.processingTime || 0,
          fees: paymentResult.fees || 0
        } as any,
        customer!.id
      );

      // 12. Enviar notificaciones
      await this.sendPaymentNotifications(savedOrder, customer!, paymentResult);

      return {
        success: true,
        order: savedOrder,
        transactionId: paymentResult.transactionId!,
        paymentMethod: paymentResult.paymentMethod!,
        amountCharged: pricingResult.total,
        pricingBreakdown: {
          subtotal: pricingResult.subtotal.getValue(),
          tax: pricingResult.tax.getValue(),
          discounts: 0, // Simulated discount
          total: pricingResult.total.getValue(),
          currency: 'USD'
        },
        paymentEvent,
        fraudScore: fraudCheck.riskScore,
        estimatedDelivery: this.calculateDeliveryTime(),
        receiptUrl: paymentResult.receiptUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Command Handler Pattern
   * Procesar reembolso
   */
  public async processRefund(command: ProcessRefundCommand): Promise<ProcessRefundResult> {
    try {
      // 1. Validar entrada
      if (!command.orderId || !command.reason) {
        return {
          success: false,
          error: 'Order ID and reason are required for refund'
        };
      }

      // 2. Cargar pedido
      const order = await this.orderRepository.findById(OrderId.fromString(command.orderId));
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // 3. Validar que el pedido pueda ser reembolsado
      if (order.getStatus().getValue() === 'CANCELLED' || order.getStatus().getValue() === 'REFUNDED') {
        return {
          success: false,
          error: 'Order cannot be refunded in current status'
        };
      }

      // 4. Calcular monto de reembolso
      const refundAmount = command.partialAmount ? 
        Price.fromDollars(command.partialAmount) : 
        order.calculateTotal();

      // 5. Procesar reembolso con gateway
      const refundResult = await this.paymentGateway.processRefund({
        transactionId: 'simulated-transaction-id',
        amount: refundAmount.getValue(),
        reason: command.reason,
        orderId: command.orderId
      });

      if (!refundResult.success) {
        return {
          success: false,
          error: refundResult.error!,
          gatewayError: refundResult.error
        };
      }

      // 6. Actualizar pedido
      if (command.partialAmount) {
        // order.markAsPartiallyRefunded(refundAmount, command.reason); // Simulated
      } else {
        // order.markAsRefunded(command.reason); // Simulated
      }

      // 7. Persistir cambios
      const savedOrder = await this.orderRepository.save(order);

      // 8. Cargar customer para notificaciones
      const customer = await this.customerRepository.findById(order.getCustomerId());

      // 9. Enviar notificaciones
      if (customer) {
        await this.sendRefundNotifications(savedOrder, customer, refundResult);
      }

      return {
        success: true,
        order: savedOrder,
        refundTransactionId: refundResult.refundTransactionId!,
        refundAmount,
        isPartialRefund: !!command.partialAmount,
        refundReason: command.reason
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  /**
   * 📊 PATRÓN: Query Handler Pattern
   * Obtener estado de pago
   */
  public async getPaymentStatus(command: GetPaymentStatusCommand): Promise<PaymentStatusResult> {
    try {
      // 1. Cargar pedido
      const order = await this.orderRepository.findById(OrderId.fromString(command.orderId));
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // 2. Obtener estado del gateway si hay transacción
      const gatewayStatus: TransactionStatus | undefined = undefined;
      // Simulated transaction status check
      // if (order.getTransactionId()) {
      //   gatewayStatus = await this.paymentGateway.getTransactionStatus(
      //     order.getTransactionId()!
      //   );
      // }

      return {
        success: true,
        orderId: command.orderId,
        paymentStatus: 'PENDING', // Simulated
        transactionId: 'simulated-transaction-id',
        paymentMethod: 'CREDIT_CARD',
        amountPaid: Price.fromDollars(0),
        isPaid: false,
        isRefunded: false,
        canBeRefunded: true,
        gatewayStatus: 'PENDING', // Simulated status
        lastUpdated: order.updatedAt
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar datos de entrada para pago
   */
  private validatePaymentInput(command: ProcessPaymentCommand): PaymentInputValidation {
    const errors: string[] = [];

    if (!command.orderId) errors.push('Order ID is required');
    if (!command.amount || command.amount <= 0) errors.push('Valid payment amount is required');
    if (!command.paymentMethod) errors.push('Payment method is required');

    // Validar información de tarjeta
    if (command.paymentMethod === 'CREDIT_CARD') {
      if (!command.cardInfo) {
        errors.push('Card information is required for credit card payments');
      } else {
        if (!command.cardInfo.cardNumber) errors.push('Card number is required');
        if (!command.cardInfo.expirationDate) errors.push('Expiration date is required');
        if (!command.cardInfo.cvv) errors.push('CVV is required');
        if (!command.cardInfo.cardholderName) errors.push('Cardholder name is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Entity Loading Pattern
   * Cargar entidades para procesamiento de pago
   */
  private async loadPaymentEntities(command: ProcessPaymentCommand): Promise<PaymentEntityLoadResult> {
    try {
      // Cargar pedido
      const order = await this.orderRepository.findById(OrderId.fromString(command.orderId));
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Cargar customer
      const customer = await this.customerRepository.findById(order.getCustomerId());
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      return {
        success: true,
        order,
        customer
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payment entities'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Business Rules Validation Pattern
   * Validar pedido para procesamiento de pago
   */
  private validateOrderForPayment(order: Order): OrderPaymentValidation {
    const errors: string[] = [];

    // Simulated order status checks
    const status = order.getStatus().getValue();
    if (status === 'PAID') {
      errors.push('Order is already paid');
    }

    if (status === 'CANCELLED') {
      errors.push('Cannot process payment for cancelled order');
    }

    if (status !== 'CONFIRMED' && status !== 'PENDING') {
      errors.push('Order must be confirmed before payment');
    }

    if (order.getItems().length === 0) {
      errors.push('Cannot process payment for empty order');
    }

    return {
      isValid: errors.length === 0,
      errors,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 🔍 PATRÓN: Fraud Detection Pattern
   * Realizar detección de fraude
   */
  private async performFraudDetection(
    command: ProcessPaymentCommand,
    order: Order,
    customer: Customer
  ): Promise<InternalFraudCheckResult> {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Verificar monto inusual
    const orderTotal = order.calculateTotal();
    if (orderTotal.isGreaterThan(Price.fromDollars(500))) {
      riskFactors.push('High order value');
      riskScore += 20;
    }

    // Verificar cliente nuevo
    if (customer.getTotalOrders() === 0) {
      riskFactors.push('First-time customer');
      riskScore += 15;
    }

    // Verificar múltiples intentos de pago
    if (command.attemptNumber && command.attemptNumber > 2) {
      riskFactors.push('Multiple payment attempts');
      riskScore += 25;
    }

    // Usar servicio externo de detección de fraude
    const externalCheck = await this.fraudDetectionService.checkTransaction({
      orderId: order.id.toString(),
      customerId: customer.id.toString(),
      amount: command.amount,
      paymentMethod: command.paymentMethod,
      ipAddress: command.ipAddress
    });

    riskScore += externalCheck.riskScore;
    riskFactors.push(...(externalCheck.reasons || [])); // Use reasons instead of riskFactors

    return {
      riskScore,
      riskFactors,
      isHighRisk: riskScore > 70,
      reason: riskScore > 70 ? `High risk score: ${riskScore}` : undefined
    };
  }

  /**
   * 💳 PATRÓN: Gateway Integration Pattern
   * Procesar pago con gateway
   */
  private async processWithGateway(
    command: ProcessPaymentCommand,
    amount: Price
  ): Promise<GatewayPaymentResult> {
    const startTime = Date.now();

    try {
      const result = await this.paymentGateway.processPayment({
        amount: amount.getValue(),
        // currency: 'USD', // Not needed in PaymentRequest
        paymentMethod: command.paymentMethod,
        paymentDetails: command.cardInfo || {},
        orderId: command.orderId,
        customerId: command.customerId
      });

      const processingTime = Date.now() - startTime;

      return {
        success: result.success,
        transactionId: result.transactionId,
        paymentMethod: command.paymentMethod,
        gateway: 'stripe', // o el gateway configurado
        processingTime,
        fees: 0, // Simulated fees
        receiptUrl: 'https://example.com/receipt', // Simulated receipt
        error: result.error,
        gatewayError: result.error,
        retryable: true // Simulated retryable
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway processing failed',
        retryable: true
      };
    }
  }

  /**
   * ⏰ PATRÓN: Delivery Time Calculation Pattern
   * Calcular tiempo estimado de entrega
   */
  private calculateDeliveryTime(): Date {
    // Tiempo base de preparación: 25 minutos
    const preparationTime = 25;
    // Tiempo de entrega: 20 minutos
    const deliveryTime = 20;
    // Buffer: 5 minutos
    const buffer = 5;

    const totalMinutes = preparationTime + deliveryTime + buffer;
    return new Date(Date.now() + totalMinutes * 60000);
  }

  /**
   * 📧 PATRÓN: Notification Pattern
   * Enviar notificaciones de pago
   */
  private async sendPaymentNotifications(
    order: Order,
    customer: Customer,
    paymentResult: GatewayPaymentResult
  ): Promise<void> {
    // Notificación por email
    await this.notificationService.sendPaymentConfirmation({
      customerEmail: customer.getEmail().toString(),
      orderId: order.id.toString(),
      transactionId: paymentResult.transactionId!,
      amount: order.calculateTotal().getValue()
    });

    // Notificación SMS si está disponible
    if (customer.getPhoneNumber()) {
      await this.notificationService.sendSMSConfirmation({
        phoneNumber: customer.getPhoneNumber().toString(),
        orderId: order.id.toString(),
        estimatedDelivery: new Date().toISOString()
      });
    }
  }

  /**
   * 📧 PATRÓN: Refund Notification Pattern
   * Enviar notificaciones de reembolso
   */
  private async sendRefundNotifications(
    order: Order,
    customer: Customer,
    refundResult: RefundResult
  ): Promise<void> {
    await this.notificationService.sendRefundConfirmation({
      customerEmail: customer.getEmail().toString(),
      orderId: order.id.toString(),
      refundTransactionId: refundResult.refundTransactionId || 'simulated-refund-id',
      refundAmount: refundResult.amount || 0
    });
  }
}

/**
 * 📊 PATRÓN: Command Pattern
 * Comandos para operaciones de pago
 */
export interface ProcessPaymentCommand {
  orderId: string;
  customerId?: string;
  amount: number;
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'APPLE_PAY';
  cardInfo?: {
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    cardholderName: string;
  };
  appliedPromotions?: AppliedPromotion[];
  attemptNumber?: number;
  ipAddress?: string;
}

export interface ProcessRefundCommand {
  orderId: string;
  reason: string;
  partialAmount?: number;
}

export interface GetPaymentStatusCommand {
  orderId: string;
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultados de operaciones de pago
 */
export interface ProcessPaymentResult {
  success: boolean;
  order?: Order;
  transactionId?: string;
  paymentMethod?: string;
  amountCharged?: Price;
  pricingBreakdown?: PricingBreakdown;
  paymentEvent?: PaymentProcessedEvent;
  fraudScore?: number;
  estimatedDelivery?: Date;
  receiptUrl?: string;
  error?: string;
  validationErrors?: string[];
  fraudReason?: string;
  requiresManualReview?: boolean;
  paymentGatewayError?: string;
  retryable?: boolean;
}

export interface ProcessRefundResult {
  success: boolean;
  order?: Order;
  refundTransactionId?: string;
  refundAmount?: Price;
  isPartialRefund?: boolean;
  refundReason?: string;
  error?: string;
  gatewayError?: string;
}

export interface PaymentStatusResult {
  success: boolean;
  orderId?: string;
  paymentStatus?: string;
  transactionId?: string;
  paymentMethod?: string;
  amountPaid?: Price;
  isPaid?: boolean;
  isRefunded?: boolean;
  canBeRefunded?: boolean;
  gatewayStatus?: string;
  lastUpdated?: Date;
  error?: string;
}

/**
 * 🛡️ PATRÓN: Validation Result Patterns
 * Resultados de validaciones específicas
 */
interface PaymentInputValidation {
  isValid: boolean;
  errors: string[];
  error?: string;
}

interface OrderPaymentValidation {
  isValid: boolean;
  errors: string[];
  error?: string;
}

interface PaymentEntityLoadResult {
  success: boolean;
  error?: string;
  order?: Order;
  customer?: Customer;
}

interface InternalFraudCheckResult {
  riskScore: number;
  riskFactors: string[];
  isHighRisk: boolean;
  reason?: string;
}

interface GatewayPaymentResult {
  success: boolean;
  transactionId?: string;
  paymentMethod?: string;
  gateway?: string;
  processingTime?: number;
  fees?: number;
  receiptUrl?: string;
  error?: string;
  gatewayError?: string;
  retryable?: boolean;
}

/**
 * 🏪 PATRÓN: Repository Pattern (Interfaces)
 * Interfaces de servicios externos
 */
export interface PaymentGateway {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  processRefund(request: RefundRequest): Promise<RefundResult>;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

export interface FraudDetectionService {
  checkTransaction(request: FraudCheckRequest): Promise<FraudCheckResult>;
}

/**
 * 📊 PATRÓN: Payment Type Definitions
 * Tipos específicos para procesamiento de pagos
 */
export interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: Record<string, unknown>;
  customerId?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  status?: string;
  error?: string;
  gatewayResponse?: Record<string, unknown>;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  orderId: string;
}

export interface RefundResult {
  success: boolean;
  refundTransactionId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

export interface TransactionStatus {
  transactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudCheckRequest {
  orderId: string;
  customerId?: string;
  amount: number;
  paymentMethod: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface FraudCheckResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isBlocked: boolean;
  reasons?: string[];
  recommendations?: string[];
}

export interface AppliedPromotion {
  id: string;
  code: string;
  type: string;
  discountAmount: number;
  description: string;
}

export interface PricingBreakdown {
  subtotal: number;
  tax: number;
  discounts: number;
  total: number;
  currency: string;
}

export interface PaymentConfirmationData {
  customerEmail: string;
  orderId: string;
  transactionId: string;
  amount: number;
}

export interface SMSConfirmationData {
  phoneNumber: string;
  orderId: string;
  estimatedDelivery: string;
}

export interface RefundConfirmationData {
  customerEmail: string;
  orderId: string;
  refundTransactionId: string;
  refundAmount: number;
}

export interface NotificationService {
  sendPaymentConfirmation(request: PaymentConfirmationData): Promise<void>;
  sendSMSConfirmation(request: SMSConfirmationData): Promise<void>;
  sendRefundConfirmation(request: RefundConfirmationData): Promise<void>;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: OrderId): Promise<Order | null>;
}

export interface CustomerRepository {
  save(customer: Customer): Promise<Customer>;
  findById(id: CustomerId): Promise<Customer | null>;
}
