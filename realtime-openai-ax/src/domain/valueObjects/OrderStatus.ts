/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD) + State Machine
 * 🎯 PRINCIPIO: Immutability + Type Safety + State Validation
 * 
 * OrderStatus - Estado del pedido con transiciones válidas
 * Implementa máquina de estados para validar cambios
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🔄 PATRÓN: State Machine Pattern + Enum Pattern
 * OrderStatus define estados válidos y transiciones permitidas
 */
export enum OrderStatusType {
  CREATING = 'creating',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

/**
 * 🎯 PATRÓN: State Object Pattern
 * OrderStatus encapsula estado y lógica de transiciones
 */
export class OrderStatus extends BaseValueObject<OrderStatusType> {

  constructor(value: OrderStatusType) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Estados predefinidos para creación segura
   */
  public static creating(): OrderStatus {
    return new OrderStatus(OrderStatusType.CREATING);
  }

  public static confirmed(): OrderStatus {
    return new OrderStatus(OrderStatusType.CONFIRMED);
  }

  public static processing(): OrderStatus {
    return new OrderStatus(OrderStatusType.PROCESSING);
  }

  public static shipped(): OrderStatus {
    return new OrderStatus(OrderStatusType.SHIPPED);
  }

  public static delivered(): OrderStatus {
    return new OrderStatus(OrderStatusType.DELIVERED);
  }

  public static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusType.CANCELLED);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(value: string): OrderStatus {
    const statusType = value.toLowerCase() as OrderStatusType;
    if (!Object.values(OrderStatusType).includes(statusType)) {
      throw new Error(`Invalid order status: ${value}`);
    }
    return new OrderStatus(statusType);
  }

  /**
   * 🔄 PATRÓN: State Machine Pattern
   * Validar si puede transicionar a nuevo estado
   */
  public canTransitionTo(newStatus: OrderStatus): boolean {
    const currentStatus = this._value;
    const targetStatus = newStatus._value;

    // Definir transiciones válidas
    const validTransitions: Record<OrderStatusType, OrderStatusType[]> = {
      [OrderStatusType.CREATING]: [
        OrderStatusType.CONFIRMED,
        OrderStatusType.CANCELLED
      ],
      [OrderStatusType.CONFIRMED]: [
        OrderStatusType.PROCESSING,
        OrderStatusType.CANCELLED
      ],
      [OrderStatusType.PROCESSING]: [
        OrderStatusType.SHIPPED,
        OrderStatusType.CANCELLED
      ],
      [OrderStatusType.SHIPPED]: [
        OrderStatusType.DELIVERED
      ],
      [OrderStatusType.DELIVERED]: [],
      [OrderStatusType.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }

  /**
   * 📊 PATRÓN: Query Methods Pattern
   * Métodos de consulta para estados específicos
   */
  public isCreating(): boolean {
    return this._value === OrderStatusType.CREATING;
  }

  public isConfirmed(): boolean {
    return this._value === OrderStatusType.CONFIRMED;
  }

  public isProcessing(): boolean {
    return this._value === OrderStatusType.PROCESSING;
  }

  public isShipped(): boolean {
    return this._value === OrderStatusType.SHIPPED;
  }

  public isDelivered(): boolean {
    return this._value === OrderStatusType.DELIVERED;
  }

  public isCancelled(): boolean {
    return this._value === OrderStatusType.CANCELLED;
  }

  public isCompleted(): boolean {
    return this.isDelivered() || this.isCancelled();
  }

  public isActive(): boolean {
    return !this.isCompleted();
  }

  public canBeModified(): boolean {
    return this.isCreating();
  }

  public canBeCancelled(): boolean {
    return this.isCreating() || this.isConfirmed() || this.isProcessing();
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener descripción legible del estado
   */
  public getDisplayName(): string {
    const displayNames: Record<OrderStatusType, string> = {
      [OrderStatusType.CREATING]: 'Creating Order',
      [OrderStatusType.CONFIRMED]: 'Order Confirmed',
      [OrderStatusType.PROCESSING]: 'Processing Order',
      [OrderStatusType.SHIPPED]: 'Order Shipped',
      [OrderStatusType.DELIVERED]: 'Order Delivered',
      [OrderStatusType.CANCELLED]: 'Order Cancelled'
    };

    return displayNames[this._value];
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener color asociado al estado (para UI)
   */
  public getColor(): string {
    const colors: Record<OrderStatusType, string> = {
      [OrderStatusType.CREATING]: '#ffc107',      // Amarillo
      [OrderStatusType.CONFIRMED]: '#17a2b8',     // Azul
      [OrderStatusType.PROCESSING]: '#fd7e14',    // Naranja
      [OrderStatusType.SHIPPED]: '#6f42c1',       // Púrpura
      [OrderStatusType.DELIVERED]: '#28a745',     // Verde
      [OrderStatusType.CANCELLED]: '#dc3545'      // Rojo
    };

    return colors[this._value];
  }

  /**
   * 📊 PATRÓN: Progress Pattern
   * Obtener porcentaje de progreso (0-100)
   */
  public getProgressPercentage(): number {
    const progressMap: Record<OrderStatusType, number> = {
      [OrderStatusType.CREATING]: 10,
      [OrderStatusType.CONFIRMED]: 25,
      [OrderStatusType.PROCESSING]: 50,
      [OrderStatusType.SHIPPED]: 75,
      [OrderStatusType.DELIVERED]: 100,
      [OrderStatusType.CANCELLED]: 0
    };

    return progressMap[this._value];
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar valor del estado
   */
  protected validate(value: OrderStatusType): void {
    if (!Object.values(OrderStatusType).includes(value)) {
      throw new Error(`Invalid order status: ${value}`);
    }
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Obtener valor del estado
   */
  public getValue(): OrderStatusType {
    return this._value;
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): string {
    return this._value;
  }
}
