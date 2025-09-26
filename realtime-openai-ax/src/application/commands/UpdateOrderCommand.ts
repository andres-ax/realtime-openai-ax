/**
 * 🏗️ PATRÓN: Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Query Responsibility Segregation + Order Mutations
 * 
 * UpdateOrderCommand - Comando para actualizar datos de pedido
 * Encapsula las modificaciones permitidas en un pedido existente
 */

import { BaseCommand, CommandValidationResult, CommandMetadata, SerializedCommand } from './BaseCommand';
import { DeliveryAddress } from '../../domain/valueObjects/DeliveryAddress';

/**
 * 🎯 PATRÓN: Command Pattern
 * UpdateOrderCommand representa la intención de modificar un pedido
 */
export class UpdateOrderCommand extends BaseCommand {
  
  /**
   * 🔧 PATRÓN: Immutable Command Pattern
   * Constructor que crea comando inmutable
   */
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly updateType: OrderUpdateType,
    public readonly updateData: OrderUpdateData,
    public readonly reason?: string,
    public readonly agentId?: string,
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

    if (!this.updateType) {
      errors.push('Update type is required');
    }

    if (!this.updateData) {
      errors.push('Update data is required');
    }

    // Validaciones específicas por tipo de actualización
    switch (this.updateType) {
      case 'DELIVERY_ADDRESS':
        if (!this.updateData.deliveryAddress) {
          errors.push('Delivery address is required for address update');
        }
        break;

      case 'CONTACT_INFO':
        if (!this.updateData.contactPhone && !this.updateData.email) {
          errors.push('At least phone or email is required for contact update');
        }
        break;

      case 'SPECIAL_INSTRUCTIONS':
        if (!this.updateData.specialInstructions?.trim()) {
          errors.push('Special instructions cannot be empty');
        }
        break;

      case 'PAYMENT_METHOD':
        if (!this.updateData.paymentMethod) {
          errors.push('Payment method is required for payment update');
        }
        break;

      case 'DELIVERY_TIME':
        if (!this.updateData.requestedDeliveryTime) {
          errors.push('Requested delivery time is required');
        }
        break;
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
      commandType: 'UpdateOrderCommand',
      commandId: this.commandId,
      timestamp: this.timestamp,
      sessionId: undefined,
      agentId: this.agentId,
      targetResource: this.orderId,
      priority: this.getPriorityByUpdateType(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresUIUpdate: true,
      affectedSystems: this.getAffectedSystems()
    };
  }

  /**
   * 🔄 PATRÓN: Command Serialization Pattern
   * Serializar comando para persistencia o transmisión
   */
  public serialize(): SerializedCommand {
    return {
      commandType: 'UpdateOrderCommand',
      commandId: this.commandId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        orderId: this.orderId,
        customerId: this.customerId,
        updateType: this.updateType,
        updateData: this.serializeUpdateData(),
        reason: this.reason,
        agentId: this.agentId
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear comando desde datos serializados
   */
  public static fromSerialized(data: SerializedCommand): UpdateOrderCommand {
    if (data.commandType !== 'UpdateOrderCommand') {
      throw new Error('Invalid command type for UpdateOrderCommand');
    }

    const payload = data.payload as {
      orderId: string;
      customerId?: string;
      updateType: string;
      updateData: Record<string, unknown>;
      sessionId?: string;
      reason?: string;
    };
    return new UpdateOrderCommand(
      payload.orderId,
      payload.customerId,
      payload.updateType,
      payload.updateData,
      payload.reason,
      payload.agentId,
      data.commandId
    );
  }

  /**
   * 🎯 PATRÓN: Command Builder Pattern
   * Builder para construcción fluida de comandos
   */
  public static builder(): UpdateOrderCommandBuilder {
    return new UpdateOrderCommandBuilder();
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
      default:
        return false;
    }
  }

  /**
   * 📊 PATRÓN: Priority Calculation Pattern
   * Calcular prioridad basada en tipo de actualización
   */
  private getPriorityByUpdateType(): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    switch (this.updateType) {
      case 'PAYMENT_METHOD':
        return 'HIGH';
      case 'DELIVERY_ADDRESS':
        return 'HIGH';
      case 'CONTACT_INFO':
        return 'NORMAL';
      case 'DELIVERY_TIME':
        return 'NORMAL';
      case 'SPECIAL_INSTRUCTIONS':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de procesamiento
   */
  private getEstimatedDuration(): number {
    switch (this.updateType) {
      case 'PAYMENT_METHOD':
        return 3000; // 3 segundos - requiere validación
      case 'DELIVERY_ADDRESS':
        return 2000; // 2 segundos - requiere validación de zona
      case 'CONTACT_INFO':
        return 1000; // 1 segundo - validación simple
      case 'DELIVERY_TIME':
        return 1500; // 1.5 segundos - verificar disponibilidad
      case 'SPECIAL_INSTRUCTIONS':
        return 500;  // 0.5 segundos - solo texto
      default:
        return 1000;
    }
  }

  /**
   * 🏗️ PATRÓN: System Impact Analysis Pattern
   * Determinar sistemas afectados por la actualización
   */
  private getAffectedSystems(): string[] {
    const systems = ['order-service'];

    switch (this.updateType) {
      case 'PAYMENT_METHOD':
        systems.push('payment-service', 'fraud-detection');
        break;
      case 'DELIVERY_ADDRESS':
        systems.push('delivery-service', 'maps-service');
        break;
      case 'CONTACT_INFO':
        systems.push('notification-service');
        break;
      case 'DELIVERY_TIME':
        systems.push('scheduling-service', 'delivery-service');
        break;
      case 'SPECIAL_INSTRUCTIONS':
        systems.push('kitchen-service');
        break;
    }

    return systems;
  }

  /**
   * 🔄 PATRÓN: Data Serialization Pattern
   * Serializar datos de actualización
   */
  private serializeUpdateData(): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};

    if (this.updateData.deliveryAddress) {
      serialized.deliveryAddress = {
        street: this.updateData.deliveryAddress.getStreet(),
        city: this.updateData.deliveryAddress.getCity(),
        state: this.updateData.deliveryAddress.getState(),
        zipCode: this.updateData.deliveryAddress.getZipCode(),
        country: this.updateData.deliveryAddress.getCountry(),
        additionalInfo: this.updateData.deliveryAddress.getAdditionalInfo(),
        coordinates: this.updateData.deliveryAddress.getCoordinates()
      };
    }

    if (this.updateData.contactPhone) {
      serialized.contactPhone = this.updateData.contactPhone;
    }

    if (this.updateData.email) {
      serialized.email = this.updateData.email;
    }

    if (this.updateData.specialInstructions) {
      serialized.specialInstructions = this.updateData.specialInstructions;
    }

    if (this.updateData.paymentMethod) {
      serialized.paymentMethod = this.updateData.paymentMethod;
    }

    if (this.updateData.requestedDeliveryTime) {
      serialized.requestedDeliveryTime = this.updateData.requestedDeliveryTime.toISOString();
    }

    return serialized;
  }

  /**
   * 🎨 PATRÓN: Command Decoration Pattern
   * Crear variantes del comando
   */
  public withReason(reason: string): UpdateOrderCommand {
    return new UpdateOrderCommand(
      this.orderId,
      this.customerId,
      this.updateType,
      this.updateData,
      reason,
      this.agentId,
      this.commandId
    );
  }

  public fromAgent(agentId: string): UpdateOrderCommand {
    return new UpdateOrderCommand(
      this.orderId,
      this.customerId,
      this.updateType,
      this.updateData,
      this.reason,
      agentId,
      this.commandId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de UpdateOrderCommand
 */
export class UpdateOrderCommandBuilder {
  private orderId?: string;
  private customerId?: string;
  private updateType?: OrderUpdateType;
  private updateData?: OrderUpdateData;
  private reason?: string;
  private agentId?: string;

  public forOrder(orderId: string): this {
    this.orderId = orderId;
    return this;
  }

  public byCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public updateDeliveryAddress(address: DeliveryAddress): this {
    this.updateType = 'DELIVERY_ADDRESS';
    this.updateData = { deliveryAddress: address };
    return this;
  }

  public updateContactInfo(phone?: string, email?: string): this {
    this.updateType = 'CONTACT_INFO';
    this.updateData = { contactPhone: phone, email };
    return this;
  }

  public updateSpecialInstructions(instructions: string): this {
    this.updateType = 'SPECIAL_INSTRUCTIONS';
    this.updateData = { specialInstructions: instructions };
    return this;
  }

  public updatePaymentMethod(method: string): this {
    this.updateType = 'PAYMENT_METHOD';
    this.updateData = { paymentMethod: method };
    return this;
  }

  public updateDeliveryTime(time: Date): this {
    this.updateType = 'DELIVERY_TIME';
    this.updateData = { requestedDeliveryTime: time };
    return this;
  }

  public withReason(reason: string): this {
    this.reason = reason;
    return this;
  }

  public fromAgent(agentId: string): this {
    this.agentId = agentId;
    return this;
  }

  public build(): UpdateOrderCommand {
    if (!this.orderId) throw new Error('Order ID is required');
    if (!this.customerId) throw new Error('Customer ID is required');
    if (!this.updateType) throw new Error('Update type is required');
    if (!this.updateData) throw new Error('Update data is required');

    return new UpdateOrderCommand(
      this.orderId,
      this.customerId,
      this.updateType,
      this.updateData,
      this.reason,
      this.agentId
    );
  }
}

/**
 * 📊 PATRÓN: Type Definition Pattern
 * Tipos de actualización permitidos
 */
export type OrderUpdateType = 
  | 'DELIVERY_ADDRESS'
  | 'CONTACT_INFO'
  | 'SPECIAL_INSTRUCTIONS'
  | 'PAYMENT_METHOD'
  | 'DELIVERY_TIME';

/**
 * 📊 PATRÓN: Data Transfer Object Pattern
 * Datos de actualización del pedido
 */
export interface OrderUpdateData {
  deliveryAddress?: DeliveryAddress;
  contactPhone?: string;
  email?: string;
  specialInstructions?: string;
  paymentMethod?: string;
  requestedDeliveryTime?: Date;
}
