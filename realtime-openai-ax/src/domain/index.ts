/**
 * 🏗️ PATRÓN: Barrel Export Pattern
 * 🎯 PRINCIPIO: Domain Layer Entry Point
 * 
 * Domain Layer - Punto de entrada único
 * Exporta todas las entidades, value objects, eventos y servicios del dominio
 */

// Entities
export { Order } from './entities/Order';
export { Customer } from './entities/Customer';
export { MenuItem } from './entities/MenuItem';
export { Agent } from './entities/Agent';
export { Cart } from './entities/Cart';
export { CartItem } from './entities/CartItem';
export { BaseEntity } from './entities/BaseEntity';

// Value Objects
export { OrderId } from './valueObjects/OrderId';
export { CustomerId } from './valueObjects/CustomerId';
export { MenuItemId } from './valueObjects/MenuItemId';
export { AgentId } from './valueObjects/AgentId';
export { CartId } from './valueObjects/CartId';
export { Price } from './valueObjects/Price';
export { Quantity } from './valueObjects/Quantity';
export { OrderStatus } from './valueObjects/OrderStatus';
export { MenuCategory } from './valueObjects/MenuCategory';
export { AgentType } from './valueObjects/AgentType';
export { DeliveryAddress } from './valueObjects/DeliveryAddress';
export { Email } from './valueObjects/Email';
export { PhoneNumber } from './valueObjects/PhoneNumber';

// Domain Events
export { OrderCreatedEvent } from './events/OrderCreatedEvent';
export { OrderUpdatedEvent } from './events/OrderUpdatedEvent';
export { OrderConfirmedEvent } from './events/OrderConfirmedEvent';
export { CartUpdatedEvent } from './events/CartUpdatedEvent';
export { AgentSwitchedEvent } from './events/AgentSwitchedEvent';
export { PaymentProcessedEvent } from './events/PaymentProcessedEvent';
export { BaseDomainEvent } from './events/DomainEvent';

// Domain Services
export { OrderService } from './services/OrderService';
export { PricingService } from './services/PricingService';
export { ValidationService } from './services/ValidationService';
export { AgentService } from './services/AgentService';

// Repository Interfaces
export { BaseRepository } from './repositories/BaseRepository';

// Types
export type { DomainEvent } from './events/DomainEvent';
export type { RepositoryResult } from './repositories/BaseRepository';
export type { OrderStatusType } from './valueObjects/OrderStatus';
export type { AgentTypeEnum } from './valueObjects/AgentType';
export type { MenuCategoryType } from './valueObjects/MenuCategory';
