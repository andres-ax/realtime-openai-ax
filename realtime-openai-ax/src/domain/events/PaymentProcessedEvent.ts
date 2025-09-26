/**
 * 🏗️ PATRÓN: Domain Event Pattern (DDD)
 * 🎯 PRINCIPIO: Event-Driven Architecture + Payment Processing
 * 
 * PaymentProcessedEvent - Evento emitido cuando se procesa un pago
 * Desencadena procesos de confirmación y fulfillment
 */

import { BaseDomainEvent } from './DomainEvent';
import { OrderId } from '../valueObjects/OrderId';
import { CustomerId } from '../valueObjects/CustomerId';
import { Price } from '../valueObjects/Price';

/**
 * 📡 PATRÓN: Payment Event Pattern
 * PaymentProcessedEvent captura el procesamiento exitoso de pagos
 */
export class PaymentProcessedEvent extends BaseDomainEvent {
  public readonly orderId: OrderId;
  public readonly customerId?: CustomerId;
  public readonly paymentId: string;
  public readonly amount: Price;
  public readonly paymentMethod: PaymentMethod;
  public readonly paymentStatus: PaymentStatus;
  public readonly transactionId: string;
  public readonly processedAt: Date;
  public readonly paymentDetails: PaymentDetails;

  constructor(
    orderId: OrderId,
    paymentId: string,
    amount: Price,
    paymentMethod: PaymentMethod,
    paymentStatus: PaymentStatus,
    transactionId: string,
    paymentDetails: PaymentDetails,
    customerId?: CustomerId
  ) {
    super(
      orderId.toString(),
      'PaymentProcessed',
      {
        orderId: orderId.toString(),
        customerId: customerId?.toString(),
        paymentId,
        amount: amount.getValue(),
        amountFormatted: amount.toUSDString(),
        paymentMethod,
        paymentStatus,
        transactionId,
        processedAt: new Date().toISOString(),
        paymentDetails
      }
    );
    
    this.orderId = orderId;
    this.customerId = customerId;
    this.paymentId = paymentId;
    this.amount = amount;
    this.paymentMethod = paymentMethod;
    this.paymentStatus = paymentStatus;
    this.transactionId = transactionId;
    this.processedAt = new Date();
    this.paymentDetails = paymentDetails;
  }

  /**
   * 🎯 PATRÓN: Event Payload Pattern
   * Obtener datos del evento para procesamiento
   */
  public getPayload(): PaymentProcessedEventPayload {
    return {
      orderId: this.orderId.toString(),
      customerId: this.customerId?.toString(),
      paymentId: this.paymentId,
      amount: this.amount.getValue(),
      amountFormatted: this.amount.toUSDString(),
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      transactionId: this.transactionId,
      processedAt: this.processedAt.toISOString(),
      isSuccessful: this.isSuccessful(),
      requiresAction: this.requiresAction(),
      paymentDetails: this.paymentDetails
    };
  }

  /**
   * 🔍 PATRÓN: Event Identification Pattern
   * Identificar el agregado afectado
   */
  public getAggregateId(): string {
    return this.orderId.toString();
  }

  /**
   * 🎯 PATRÓN: Event Description Pattern
   * Descripción legible del evento
   */
  public getDescription(): string {
    const statusText = this.isSuccessful() ? 'successfully processed' : 'failed';
    return `Payment ${this.paymentId} ${statusText} for order ${this.orderId.toString()}: ${this.amount.toUSDString()}`;
  }

  /**
   * 📊 PATRÓN: Status Analysis Pattern
   * Verificar si el pago fue exitoso
   */
  public isSuccessful(): boolean {
    return this.paymentStatus === 'COMPLETED' || this.paymentStatus === 'AUTHORIZED';
  }

  /**
   * 📊 PATRÓN: Status Analysis Pattern
   * Verificar si el pago falló
   */
  public isFailed(): boolean {
    return this.paymentStatus === 'FAILED' || this.paymentStatus === 'DECLINED';
  }

  /**
   * 📊 PATRÓN: Status Analysis Pattern
   * Verificar si requiere acción adicional
   */
  public requiresAction(): boolean {
    return this.paymentStatus === 'PENDING' || this.paymentStatus === 'REQUIRES_ACTION';
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si debe proceder con el fulfillment
   */
  public shouldProceedWithFulfillment(): boolean {
    return this.isSuccessful() && !this.requiresAction();
  }

  /**
   * 📊 PATRÓN: Risk Assessment Pattern
   * Evaluar nivel de riesgo del pago
   */
  public getRiskLevel(): PaymentRiskLevel {
    // Lógica simple de evaluación de riesgo
    if (this.amount.isGreaterThan(Price.fromDollars(500))) {
      return 'HIGH';
    } else if (this.amount.isGreaterThan(Price.fromDollars(100))) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * 📊 PATRÓN: Notification Strategy Pattern
   * Determinar estrategia de notificación
   */
  public getNotificationStrategy(): NotificationStrategy {
    if (this.isSuccessful()) {
      return {
        customer: {
          email: true,
          sms: true,
          push: true,
          message: `Your payment of ${this.amount.toUSDString()} has been processed successfully!`
        },
        merchant: {
          email: this.getRiskLevel() === 'HIGH',
          dashboard: true,
          message: `Payment received: ${this.amount.toUSDString()}`
        }
      };
    } else {
      return {
        customer: {
          email: true,
          sms: false,
          push: true,
          message: 'There was an issue processing your payment. Please try again.'
        },
        merchant: {
          email: true,
          dashboard: true,
          message: `Payment failed for order ${this.orderId.toString()}`
        }
      };
    }
  }

  /**
   * 📊 PATRÓN: Next Steps Pattern
   * Obtener próximos pasos basados en el estado
   */
  public getNextSteps(): PaymentNextSteps {
    if (this.isSuccessful()) {
      return {
        orderProcessing: true,
        sendConfirmation: true,
        updateInventory: true,
        scheduleDelivery: true,
        notifyKitchen: true
      };
    } else if (this.requiresAction()) {
      return {
        orderProcessing: false,
        sendConfirmation: false,
        updateInventory: false,
        scheduleDelivery: false,
        notifyKitchen: false,
        retryPayment: true,
        contactCustomer: true
      };
    } else {
      return {
        orderProcessing: false,
        sendConfirmation: false,
        updateInventory: false,
        scheduleDelivery: false,
        notifyKitchen: false,
        cancelOrder: true,
        refundIfNeeded: true
      };
    }
  }

  // Serialización manejada por BaseDomainEvent
}

/**
 * 📊 PATRÓN: Data Transfer Object
 * Payload del evento para transferencia de datos
 */
export interface PaymentProcessedEventPayload {
  orderId: string;
  customerId?: string;
  paymentId: string;
  amount: number;
  amountFormatted: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId: string;
  processedAt: string;
  isSuccessful: boolean;
  requiresAction: boolean;
  paymentDetails: PaymentDetails;
}

/**
 * 💳 PATRÓN: Payment Method Pattern
 * Métodos de pago soportados
 */
export type PaymentMethod = 
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'DIGITAL_WALLET'
  | 'BANK_TRANSFER'
  | 'CASH_ON_DELIVERY';

/**
 * 📊 PATRÓN: Payment Status Pattern
 * Estados de pago
 */
export type PaymentStatus = 
  | 'PENDING'
  | 'AUTHORIZED'
  | 'COMPLETED'
  | 'FAILED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REQUIRES_ACTION';

/**
 * 📊 PATRÓN: Risk Assessment Pattern
 * Niveles de riesgo de pago
 */
export type PaymentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * 💳 PATRÓN: Payment Details Pattern
 * Detalles del pago
 */
export interface PaymentDetails {
  cardLast4?: string;
  cardBrand?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  processorResponse?: string;
  authorizationCode?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 📧 PATRÓN: Notification Strategy Pattern
 * Estrategia de notificaciones
 */
export interface NotificationStrategy {
  customer: {
    email: boolean;
    sms: boolean;
    push: boolean;
    message: string;
  };
  merchant: {
    email: boolean;
    dashboard: boolean;
    message: string;
  };
}

/**
 * 📋 PATRÓN: Next Steps Pattern
 * Próximos pasos después del pago
 */
export interface PaymentNextSteps {
  orderProcessing: boolean;
  sendConfirmation: boolean;
  updateInventory: boolean;
  scheduleDelivery: boolean;
  notifyKitchen: boolean;
  retryPayment?: boolean;
  contactCustomer?: boolean;
  cancelOrder?: boolean;
  refundIfNeeded?: boolean;
}
