/**
 * 🏗️ PATRÓN: Barrel Export Pattern
 * 🎯 PRINCIPIO: Single Entry Point + Clean Imports
 * 
 * Application Layer - Punto de entrada único
 * Exporta todas las funcionalidades de la capa de aplicación
 */

// Use Cases
export { CreateOrderUseCase } from './useCases/CreateOrderUseCase';
export { ProcessPaymentUseCase } from './useCases/ProcessPaymentUseCase';
export { UpdateCartUseCase } from './useCases/UpdateCartUseCase';
export { SwitchAgentUseCase } from './useCases/SwitchAgentUseCase';
export { FocusMenuItemUseCase } from './useCases/FocusMenuItemUseCase';

// Commands
export { AddToCartCommand } from './commands/AddToCartCommand';
export { ProcessPaymentCommand } from './commands/ProcessPaymentCommand';
export { TransferAgentCommand } from './commands/TransferAgentCommand';
export { UpdateOrderCommand } from './commands/UpdateOrderCommand';
export { FocusMenuItemCommand } from './commands/FocusMenuItemCommand';

// Queries
export { GetOrderQuery } from './queries/GetOrderQuery';
export { GetMenuItemsQuery } from './queries/GetMenuItemsQuery';
export { GetAgentConfigQuery } from './queries/GetAgentConfigQuery';
export { GetCartSummaryQuery } from './queries/GetCartSummaryQuery';

// Event Handlers
export { CartUpdatedEventHandler } from './eventHandlers/CartUpdatedEventHandler';
export { AgentSwitchedEventHandler } from './eventHandlers/AgentSwitchedEventHandler';
export { OrderUpdatedEventHandler } from './eventHandlers/OrderUpdatedEventHandler';

// Base Classes
export { BaseUseCase } from './useCases/BaseUseCase';
export { BaseCommand } from './commands/BaseCommand';
export { BaseQuery } from './queries/BaseQuery';
export { BaseEventHandler } from './eventHandlers/BaseEventHandler';

// Types
export type { UseCaseResult } from './useCases/BaseUseCase';
export type { CommandValidationResult, CommandMetadata, SerializedCommand } from './commands/BaseCommand';
export type { EventHandlerResult, SideEffect } from './eventHandlers/BaseEventHandler';
