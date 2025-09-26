/**
 * 🏗️ PATRÓN: Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Query Responsibility Segregation + Payment Processing
 * 
 * ProcessPaymentCommand - Comando para procesar pagos
 * Encapsula la intención de procesar un pago con toda la información necesaria
 */

import { BaseCommand, CommandValidationResult, CommandMetadata, SerializedCommand } from './BaseCommand';

/**
 * 🎯 PATRÓN: Command Pattern
 * ProcessPaymentCommand representa la intención de procesar un pago
 */
export class ProcessPaymentCommand extends BaseCommand {
  
  /**
   * 🔧 PATRÓN: Immutable Command Pattern
   * Constructor que crea comando inmutable
   */
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly paymentMethod: PaymentMethod,
    public readonly paymentDetails: PaymentDetails,
    public readonly billingAddress?: BillingAddress,
    public readonly savePaymentMethod?: boolean,
    public readonly agentId?: string,
    public readonly sessionId?: string,
    public readonly fraudCheckLevel?: FraudCheckLevel,
    commandId?: string
  ) {
    super(commandId);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar comando antes de procesamiento
   */
  public validate(): CommandValidationResult {
    const errors: string[] = [];

    if (!this.orderId?.trim()) {
      errors.push('Order ID is required');
    }

    if (!this.customerId?.trim()) {
      errors.push('Customer ID is required');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (this.amount > 10000) {
      errors.push('Amount cannot exceed $10,000');
    }

    if (!this.currency?.trim()) {
      errors.push('Currency is required');
    }

    if (!['USD', 'EUR', 'GBP', 'CAD'].includes(this.currency)) {
      errors.push('Unsupported currency');
    }

    if (!this.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!this.paymentDetails) {
      errors.push('Payment details are required');
    }

    // Validaciones específicas por método de pago
    if (this.paymentMethod === 'CREDIT_CARD' || this.paymentMethod === 'DEBIT_CARD') {
      const cardDetails = this.paymentDetails as CreditCardDetails;
      if (!cardDetails.cardNumber) {
        errors.push('Card number is required');
      }
      if (!cardDetails.expirationMonth || !cardDetails.expirationYear) {
        errors.push('Card expiration date is required');
      }
      if (!cardDetails.cvv) {
        errors.push('CVV is required');
      }
      if (!cardDetails.cardholderName) {
        errors.push('Cardholder name is required');
      }
    }

    if (this.paymentMethod === 'PAYPAL') {
      const paypalDetails = this.paymentDetails as PayPalDetails;
      if (!paypalDetails.email) {
        errors.push('PayPal email is required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Command Metadata Pattern
   * Obtener metadatos del comando
   */
  public getMetadata(): CommandMetadata {
    return {
      commandType: 'ProcessPaymentCommand',
      commandId: this.commandId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      agentId: this.agentId,
      targetResource: this.orderId,
      priority: this.getPriorityByAmount(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresUIUpdate: true,
      affectedSystems: [
        'payment-service',
        'fraud-detection',
        'order-service',
        'notification-service'
      ]
    };
  }

  /**
   * 🔄 PATRÓN: Command Serialization Pattern
   * Serializar comando para persistencia o transmisión
   */
  public serialize(): SerializedCommand {
    return {
      commandType: 'ProcessPaymentCommand',
      commandId: this.commandId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        orderId: this.orderId,
        customerId: this.customerId,
        amount: this.amount,
        currency: this.currency,
        paymentMethod: this.paymentMethod,
        paymentDetails: this.serializePaymentDetails(),
        billingAddress: this.billingAddress,
        savePaymentMethod: this.savePaymentMethod,
        agentId: this.agentId,
        sessionId: this.sessionId,
        fraudCheckLevel: this.fraudCheckLevel
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear comando desde datos serializados
   */
  public static fromSerialized(data: SerializedCommand): ProcessPaymentCommand {
    if (data.commandType !== 'ProcessPaymentCommand') {
      throw new Error('Invalid command type for ProcessPaymentCommand');
    }

    const payload = data.payload as {
      orderId: string;
      customerId?: string;
      currency: string;
      paymentMethod: string;
      amount: number;
      sessionId?: string;
      paymentDetails?: Record<string, unknown>;
      billingAddress?: BillingAddress;
      savePaymentMethod?: boolean;
      agentId?: string;
      fraudCheckLevel?: FraudCheckLevel;
    };
    return new ProcessPaymentCommand(
      payload.orderId,
      payload.customerId || '',
      payload.amount,
      payload.currency,
      payload.paymentMethod as PaymentMethod,
      payload.paymentDetails as unknown as PaymentDetails,
      payload.billingAddress,
      payload.savePaymentMethod,
      payload.agentId,
      payload.sessionId,
      payload.fraudCheckLevel,
      data.commandId
    );
  }

  /**
   * 🎯 PATRÓN: Command Builder Pattern
   * Builder para construcción fluida de comandos
   */
  public static builder(): ProcessPaymentCommandBuilder {
    return new ProcessPaymentCommandBuilder();
  }

  /**
   * 🔍 PATRÓN: Command Inspection Pattern
   * Verificar si el comando afecta un recurso específico
   */
  public affectsResource(resourceType: string, resourceId?: string): boolean {
    switch (resourceType) {
      case 'order':
        return resourceId ? this.orderId === resourceId : true;
      case 'customer':
        return resourceId ? this.customerId === resourceId : true;
      case 'agent':
        return this.agentId ? (resourceId ? this.agentId === resourceId : true) : false;
      case 'session':
        return this.sessionId ? (resourceId ? this.sessionId === resourceId : true) : false;
      default:
        return false;
    }
  }

  /**
   * 📊 PATRÓN: Priority Calculation Pattern
   * Calcular prioridad basada en monto
   */
  private getPriorityByAmount(): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    if (this.amount >= 1000) return 'CRITICAL';
    if (this.amount >= 500) return 'HIGH';
    if (this.amount >= 100) return 'NORMAL';
    return 'LOW';
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de procesamiento
   */
  private getEstimatedDuration(): number {
    let baseDuration = 3000; // 3 segundos base

    // Ajustar por método de pago
    switch (this.paymentMethod) {
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        baseDuration += 2000; // +2s para procesamiento de tarjeta
        break;
      case 'PAYPAL':
        baseDuration += 4000; // +4s para redirección PayPal
        break;
      case 'APPLE_PAY':
      case 'GOOGLE_PAY':
        baseDuration += 1000; // +1s para wallets digitales
        break;
    }

    // Ajustar por nivel de verificación de fraude
    switch (this.fraudCheckLevel) {
      case 'ENHANCED':
        baseDuration += 3000; // +3s para verificación mejorada
        break;
      case 'STRICT':
        baseDuration += 5000; // +5s para verificación estricta
        break;
      case 'BASIC':
        baseDuration += 1000; // +1s para verificación básica
        break;
    }

    // Ajustar por monto alto
    if (this.amount >= 500) {
      baseDuration += 2000; // +2s para montos altos
    }

    return baseDuration;
  }

  /**
   * 🔄 PATRÓN: Data Serialization Pattern
   * Serializar detalles de pago de forma segura
   */
  private serializePaymentDetails(): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};

    if (this.paymentMethod === 'CREDIT_CARD' || this.paymentMethod === 'DEBIT_CARD') {
      const cardDetails = this.paymentDetails as CreditCardDetails;
      serialized.cardNumber = this.maskCardNumber(cardDetails.cardNumber);
      serialized.expirationMonth = cardDetails.expirationMonth;
      serialized.expirationYear = cardDetails.expirationYear;
      serialized.cardholderName = cardDetails.cardholderName;
      // CVV nunca se serializa por seguridad
    }

    if (this.paymentMethod === 'PAYPAL') {
      const paypalDetails = this.paymentDetails as PayPalDetails;
      serialized.email = paypalDetails.email;
    }

    return serialized;
  }

  /**
   * 🔒 PATRÓN: Data Masking Pattern
   * Enmascarar número de tarjeta para seguridad
   */
  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 4) return '****';
    return '**** **** **** ' + cardNumber.slice(-4);
  }

  /**
   * 🎨 PATRÓN: Command Decoration Pattern
   * Crear variantes del comando
   */
  public withFraudCheck(level: FraudCheckLevel): ProcessPaymentCommand {
    return new ProcessPaymentCommand(
      this.orderId,
      this.customerId,
      this.amount,
      this.currency,
      this.paymentMethod,
      this.paymentDetails,
      this.billingAddress,
      this.savePaymentMethod,
      this.agentId,
      this.sessionId,
      level,
      this.commandId
    );
  }

  public fromAgent(agentId: string): ProcessPaymentCommand {
    return new ProcessPaymentCommand(
      this.orderId,
      this.customerId,
      this.amount,
      this.currency,
      this.paymentMethod,
      this.paymentDetails,
      this.billingAddress,
      this.savePaymentMethod,
      agentId,
      this.sessionId,
      this.fraudCheckLevel,
      this.commandId
    );
  }

  public withBillingAddress(address: BillingAddress): ProcessPaymentCommand {
    return new ProcessPaymentCommand(
      this.orderId,
      this.customerId,
      this.amount,
      this.currency,
      this.paymentMethod,
      this.paymentDetails,
      address,
      this.savePaymentMethod,
      this.agentId,
      this.sessionId,
      this.fraudCheckLevel,
      this.commandId
    );
  }

  /**
   * 🔍 PATRÓN: Payment Analysis Pattern
   * Analizar características del pago
   */
  public getPaymentAnalysis(): PaymentAnalysis {
    return {
      isHighValue: this.amount >= 500,
      isCriticalValue: this.amount >= 1000,
      requiresEnhancedFraud: this.amount >= 200 || this.fraudCheckLevel === 'ENHANCED',
      isCardPayment: ['CREDIT_CARD', 'DEBIT_CARD'].includes(this.paymentMethod),
      isDigitalWallet: ['APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL'].includes(this.paymentMethod),
      hasStoredPayment: !!this.savePaymentMethod,
      riskLevel: this.calculateRiskLevel(),
      estimatedSuccessRate: this.calculateSuccessRate()
    };
  }

  /**
   * ⚠️ PATRÓN: Risk Assessment Pattern
   * Calcular nivel de riesgo del pago
   */
  private calculateRiskLevel(): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Factores de riesgo por monto
    if (this.amount >= 1000) riskScore += 3;
    else if (this.amount >= 500) riskScore += 2;
    else if (this.amount >= 100) riskScore += 1;

    // Factores de riesgo por método de pago
    if (this.paymentMethod === 'CREDIT_CARD') riskScore += 1;
    if (this.paymentMethod === 'DEBIT_CARD') riskScore += 0.5;

    // Sin dirección de facturación
    if (!this.billingAddress) riskScore += 1;

    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 📊 PATRÓN: Success Rate Calculation Pattern
   * Calcular tasa de éxito estimada
   */
  private calculateSuccessRate(): number {
    let baseRate = 95; // 95% base

    // Ajustar por método de pago
    switch (this.paymentMethod) {
      case 'APPLE_PAY':
      case 'GOOGLE_PAY':
        baseRate += 3; // Wallets digitales tienen mayor éxito
        break;
      case 'PAYPAL':
        baseRate += 1;
        break;
      case 'DEBIT_CARD':
        baseRate -= 2; // Débito puede tener más rechazos
        break;
    }

    // Ajustar por monto
    if (this.amount >= 1000) baseRate -= 5;
    else if (this.amount >= 500) baseRate -= 2;

    // Ajustar por dirección de facturación
    if (this.billingAddress) baseRate += 2;

    return Math.max(Math.min(baseRate, 99), 70); // Entre 70% y 99%
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de ProcessPaymentCommand
 */
export class ProcessPaymentCommandBuilder {
  private orderId?: string;
  private customerId?: string;
  private amount?: number;
  private currency?: string;
  private paymentMethod?: PaymentMethod;
  private paymentDetails?: PaymentDetails;
  private billingAddress?: BillingAddress;
  private savePaymentMethod?: boolean;
  private agentId?: string;
  private sessionId?: string;
  private fraudCheckLevel?: FraudCheckLevel;

  public forOrder(orderId: string): this {
    this.orderId = orderId;
    return this;
  }

  public byCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public withAmount(amount: number, currency: string = 'USD'): this {
    this.amount = amount;
    this.currency = currency;
    return this;
  }

  public usingCreditCard(details: CreditCardDetails): this {
    this.paymentMethod = 'CREDIT_CARD';
    this.paymentDetails = details;
    return this;
  }

  public usingPayPal(details: PayPalDetails): this {
    this.paymentMethod = 'PAYPAL';
    this.paymentDetails = details;
    return this;
  }

  public withBillingAddress(address: BillingAddress): this {
    this.billingAddress = address;
    return this;
  }

  public savePayment(): this {
    this.savePaymentMethod = true;
    return this;
  }

  public fromAgent(agentId: string): this {
    this.agentId = agentId;
    return this;
  }

  public inSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public withFraudCheck(level: FraudCheckLevel): this {
    this.fraudCheckLevel = level;
    return this;
  }

  public build(): ProcessPaymentCommand {
    if (!this.orderId) throw new Error('Order ID is required');
    if (!this.customerId) throw new Error('Customer ID is required');
    if (!this.amount) throw new Error('Amount is required');
    if (!this.currency) throw new Error('Currency is required');
    if (!this.paymentMethod) throw new Error('Payment method is required');
    if (!this.paymentDetails) throw new Error('Payment details are required');

    return new ProcessPaymentCommand(
      this.orderId,
      this.customerId,
      this.amount,
      this.currency,
      this.paymentMethod,
      this.paymentDetails,
      this.billingAddress,
      this.savePaymentMethod,
      this.agentId,
      this.sessionId,
      this.fraudCheckLevel
    );
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para procesamiento de pagos
 */
export type PaymentMethod = 
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'PAYPAL'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY';

export type FraudCheckLevel = 'BASIC' | 'STANDARD' | 'ENHANCED' | 'STRICT';

/**
 * 📊 PATRÓN: Payment Details Pattern
 * Detalles de pago por método
 */
export type PaymentDetails = CreditCardDetails | PayPalDetails | DigitalWalletDetails;

export interface CreditCardDetails {
  cardNumber: string;
  expirationMonth: number;
  expirationYear: number;
  cvv: string;
  cardholderName: string;
}

export interface PayPalDetails {
  email: string;
  payerId?: string;
}

export interface DigitalWalletDetails {
  walletId: string;
  fingerprint?: string;
}

/**
 * 📊 PATRÓN: Address Pattern
 * Dirección de facturación
 */
export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * 📊 PATRÓN: Analysis Result Pattern
 * Resultado del análisis de pago
 */
export interface PaymentAnalysis {
  isHighValue: boolean;
  isCriticalValue: boolean;
  requiresEnhancedFraud: boolean;
  isCardPayment: boolean;
  isDigitalWallet: boolean;
  hasStoredPayment: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedSuccessRate: number;
}
