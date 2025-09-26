/**
 * 🏗️ PATRÓN: Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Query Responsibility Segregation + Immutable Commands
 * 
 * FocusMenuItemCommand - Comando para enfocar item en carousel 3D
 * Encapsula la intención de cambiar el foco del carousel desde AI
 */

import { BaseCommand } from './BaseCommand';

/**
 * 🎯 PATRÓN: Command Pattern
 * FocusMenuItemCommand representa la intención de enfocar un item específico
 */
export class FocusMenuItemCommand extends BaseCommand {
  
  /**
   * 🔧 PATRÓN: Immutable Command Pattern
   * Constructor que crea comando inmutable
   */
  constructor(
    public readonly sessionId: string,
    public readonly agentId: string,
    public readonly menuItemName: string,
    public readonly customerId?: string,
    public readonly cartId?: string,
    public readonly reason?: string,
    public readonly currentPosition?: number,
    public readonly emphasize?: boolean,
    public readonly animationDuration?: number,
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

    if (!this.sessionId?.trim()) {
      errors.push('Session ID is required');
    }

    if (!this.agentId?.trim()) {
      errors.push('Agent ID is required');
    }

    if (!this.menuItemName?.trim()) {
      errors.push('Menu item name is required');
    }

    if (this.currentPosition !== undefined && this.currentPosition < 0) {
      errors.push('Current position cannot be negative');
    }

    if (this.animationDuration !== undefined && this.animationDuration < 0) {
      errors.push('Animation duration cannot be negative');
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
      commandType: 'FocusMenuItemCommand',
      commandId: this.commandId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      agentId: this.agentId,
      targetResource: this.menuItemName,
      priority: this.emphasize ? 'HIGH' : 'NORMAL',
      estimatedDuration: this.animationDuration || 800,
      requiresUIUpdate: true,
      affectedSystems: ['carousel', 'ui', 'agent']
    };
  }

  /**
   * 🔄 PATRÓN: Command Serialization Pattern
   * Serializar comando para persistencia o transmisión
   */
  public serialize(): SerializedCommand {
    return {
      commandType: 'FocusMenuItemCommand',
      commandId: this.commandId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        sessionId: this.sessionId,
        agentId: this.agentId,
        menuItemName: this.menuItemName,
        customerId: this.customerId,
        cartId: this.cartId,
        reason: this.reason,
        currentPosition: this.currentPosition,
        emphasize: this.emphasize,
        animationDuration: this.animationDuration
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear comando desde datos serializados
   */
  public static fromSerialized(data: SerializedCommand): FocusMenuItemCommand {
    if (data.commandType !== 'FocusMenuItemCommand') {
      throw new Error('Invalid command type for FocusMenuItemCommand');
    }

    const payload = data.payload as {
      sessionId: string;
      agentId?: string;
      menuItemName: string;
      customerId?: string;
      cartId?: string;
      reason?: string;
      currentPosition?: number;
      emphasize?: boolean;
      animationDuration?: number;
      priority?: string;
    };
    return new FocusMenuItemCommand(
      payload.sessionId,
      payload.agentId || '',
      payload.menuItemName,
      payload.customerId,
      payload.cartId,
      payload.reason,
      payload.currentPosition,
      payload.emphasize,
      payload.animationDuration,
      data.commandId
    );
  }

  /**
   * 🎯 PATRÓN: Command Builder Pattern
   * Builder para construcción fluida de comandos
   */
  public static builder(): FocusMenuItemCommandBuilder {
    return new FocusMenuItemCommandBuilder();
  }

  /**
   * 🔍 PATRÓN: Command Inspection Pattern
   * Verificar si el comando afecta un recurso específico
   */
  public affectsResource(resourceType: string, resourceId?: string): boolean {
    switch (resourceType) {
      case 'session':
        return resourceId ? this.sessionId === resourceId : true;
      case 'agent':
        return resourceId ? this.agentId === resourceId : true;
      case 'menuItem':
        return resourceId ? this.menuItemName === resourceId : true;
      case 'customer':
        return this.customerId ? (resourceId ? this.customerId === resourceId : true) : false;
      case 'cart':
        return this.cartId ? (resourceId ? this.cartId === resourceId : true) : false;
      default:
        return false;
    }
  }

  /**
   * 🎨 PATRÓN: Command Decoration Pattern
   * Crear variante del comando con modificaciones
   */
  public withEmphasis(emphasize: boolean = true): FocusMenuItemCommand {
    return new FocusMenuItemCommand(
      this.sessionId,
      this.agentId,
      this.menuItemName,
      this.customerId,
      this.cartId,
      this.reason,
      this.currentPosition,
      emphasize,
      this.animationDuration,
      this.commandId
    );
  }

  public withAnimationDuration(duration: number): FocusMenuItemCommand {
    return new FocusMenuItemCommand(
      this.sessionId,
      this.agentId,
      this.menuItemName,
      this.customerId,
      this.cartId,
      this.reason,
      this.currentPosition,
      this.emphasize,
      duration,
      this.commandId
    );
  }

  public withReason(reason: string): FocusMenuItemCommand {
    return new FocusMenuItemCommand(
      this.sessionId,
      this.agentId,
      this.menuItemName,
      this.customerId,
      this.cartId,
      reason,
      this.currentPosition,
      this.emphasize,
      this.animationDuration,
      this.commandId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de FocusMenuItemCommand
 */
export class FocusMenuItemCommandBuilder {
  private sessionId?: string;
  private agentId?: string;
  private menuItemName?: string;
  private customerId?: string;
  private cartId?: string;
  private reason?: string;
  private currentPosition?: number;
  private emphasize?: boolean;
  private animationDuration?: number;

  public forSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public fromAgent(agentId: string): this {
    this.agentId = agentId;
    return this;
  }

  public focusItem(menuItemName: string): this {
    this.menuItemName = menuItemName;
    return this;
  }

  public forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public withCart(cartId: string): this {
    this.cartId = cartId;
    return this;
  }

  public withReason(reason: string): this {
    this.reason = reason;
    return this;
  }

  public fromPosition(currentPosition: number): this {
    this.currentPosition = currentPosition;
    return this;
  }

  public withEmphasis(emphasize: boolean = true): this {
    this.emphasize = emphasize;
    return this;
  }

  public withAnimationDuration(duration: number): this {
    this.animationDuration = duration;
    return this;
  }

  public build(): FocusMenuItemCommand {
    if (!this.sessionId) throw new Error('Session ID is required');
    if (!this.agentId) throw new Error('Agent ID is required');
    if (!this.menuItemName) throw new Error('Menu item name is required');

    return new FocusMenuItemCommand(
      this.sessionId,
      this.agentId,
      this.menuItemName,
      this.customerId,
      this.cartId,
      this.reason,
      this.currentPosition,
      this.emphasize,
      this.animationDuration
    );
  }
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de validación de comando
 */
export interface CommandValidationResult {
  isValid: boolean;
  errors: string[];
  errorMessage?: string;
}

/**
 * 📊 PATRÓN: Metadata Pattern
 * Metadatos del comando
 */
export interface CommandMetadata {
  commandType: string;
  commandId: string;
  timestamp: Date;
  sessionId: string;
  agentId: string;
  targetResource: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  estimatedDuration: number;
  requiresUIUpdate: boolean;
  affectedSystems: string[];
}

/**
 * 📊 PATRÓN: Serialization Pattern
 * Comando serializado
 */
export interface SerializedCommand {
  commandType: string;
  commandId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
