/**
 * 🏗️ PATRÓN: Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Query Responsibility Segregation + Cart Operations
 * 
 * AddToCartCommand - Comando para agregar items al carrito
 * Encapsula la intención de añadir un producto específico al carrito
 */

import { BaseCommand, CommandValidationResult, CommandMetadata, SerializedCommand } from './BaseCommand';

/**
 * 🎯 PATRÓN: Command Pattern
 * AddToCartCommand representa la intención de agregar un item al carrito
 */
export class AddToCartCommand extends BaseCommand {
  
  /**
   * 🔧 PATRÓN: Immutable Command Pattern
   * Constructor que crea comando inmutable
   */
  constructor(
    public readonly cartId: string,
    public readonly customerId: string,
    public readonly menuItemName: string,
    public readonly quantity: number,
    public readonly sessionId?: string,
    public readonly agentId?: string,
    public readonly source?: CartItemSource,
    public readonly specialInstructions?: string,
    public readonly replacePrevious?: boolean,
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

    if (!this.cartId?.trim()) {
      errors.push('Cart ID is required');
    }

    if (!this.customerId?.trim()) {
      errors.push('Customer ID is required');
    }

    if (!this.menuItemName?.trim()) {
      errors.push('Menu item name is required');
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (this.quantity > 99) {
      errors.push('Quantity cannot exceed 99 items');
    }

    if (this.specialInstructions && this.specialInstructions.length > 500) {
      errors.push('Special instructions cannot exceed 500 characters');
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
      commandType: 'AddToCartCommand',
      commandId: this.commandId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      agentId: this.agentId,
      targetResource: this.cartId,
      priority: this.getPriorityBySource(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresUIUpdate: true,
      affectedSystems: ['cart-service', 'pricing-service', 'ui-service']
    };
  }

  /**
   * 🔄 PATRÓN: Command Serialization Pattern
   * Serializar comando para persistencia o transmisión
   */
  public serialize(): SerializedCommand {
    return {
      commandType: 'AddToCartCommand',
      commandId: this.commandId,
      timestamp: this.timestamp.toISOString(),
      payload: {
        cartId: this.cartId,
        customerId: this.customerId,
        menuItemName: this.menuItemName,
        quantity: this.quantity,
        sessionId: this.sessionId,
        agentId: this.agentId,
        source: this.source,
        specialInstructions: this.specialInstructions,
        replacePrevious: this.replacePrevious
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear comando desde datos serializados
   */
  public static fromSerialized(data: SerializedCommand): AddToCartCommand {
    if (data.commandType !== 'AddToCartCommand') {
      throw new Error('Invalid command type for AddToCartCommand');
    }

    const payload = data.payload as {
      cartId: string;
      customerId?: string;
      menuItemName: string;
      quantity: number;
      unitPrice: number;
      source: CartItemSource;
      sessionId?: string;
      agentId?: string;
      specialInstructions?: string;
      replacePrevious?: boolean;
    };
    return new AddToCartCommand(
      payload.cartId,
      payload.customerId || '',
      payload.menuItemName,
      payload.quantity,
      payload.sessionId,
      payload.agentId,
      payload.source,
      payload.specialInstructions,
      payload.replacePrevious,
      data.commandId
    );
  }

  /**
   * 🎯 PATRÓN: Command Builder Pattern
   * Builder para construcción fluida de comandos
   */
  public static builder(): AddToCartCommandBuilder {
    return new AddToCartCommandBuilder();
  }

  /**
   * 🔍 PATRÓN: Command Inspection Pattern
   * Verificar si el comando afecta un recurso específico
   */
  public affectsResource(resourceType: string, resourceId?: string): boolean {
    switch (resourceType) {
      case 'cart':
        return resourceId ? this.cartId === resourceId : true;
      case 'customer':
        return resourceId ? this.customerId === resourceId : true;
      case 'menuItem':
        return resourceId ? this.menuItemName === resourceId : true;
      case 'session':
        return this.sessionId ? (resourceId ? this.sessionId === resourceId : true) : false;
      case 'agent':
        return this.agentId ? (resourceId ? this.agentId === resourceId : true) : false;
      default:
        return false;
    }
  }

  /**
   * 📊 PATRÓN: Priority Calculation Pattern
   * Calcular prioridad basada en fuente del comando
   */
  private getPriorityBySource(): 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' {
    switch (this.source) {
      case 'AGENT_RECOMMENDATION':
        return 'HIGH';
      case 'USER_VOICE_COMMAND':
        return 'HIGH';
      case 'USER_CLICK':
        return 'NORMAL';
      case 'CAROUSEL_FOCUS':
        return 'NORMAL';
      case 'REORDER':
        return 'NORMAL';
      case 'COMBO_SUGGESTION':
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
    let baseDuration = 1000; // 1 segundo base

    // Ajustar por cantidad
    if (this.quantity > 5) {
      baseDuration += 500; // +0.5s para cantidades grandes
    }

    // Ajustar por instrucciones especiales
    if (this.specialInstructions) {
      baseDuration += 300; // +0.3s para procesar instrucciones
    }

    // Ajustar por fuente
    switch (this.source) {
      case 'AGENT_RECOMMENDATION':
        baseDuration += 200; // +0.2s para validaciones adicionales
        break;
      case 'USER_VOICE_COMMAND':
        baseDuration += 400; // +0.4s para procesamiento de voz
        break;
      case 'COMBO_SUGGESTION':
        baseDuration += 600; // +0.6s para validar combo
        break;
    }

    return baseDuration;
  }

  /**
   * 🎨 PATRÓN: Command Decoration Pattern
   * Crear variantes del comando
   */
  public withSpecialInstructions(instructions: string): AddToCartCommand {
    return new AddToCartCommand(
      this.cartId,
      this.customerId,
      this.menuItemName,
      this.quantity,
      this.sessionId,
      this.agentId,
      this.source,
      instructions,
      this.replacePrevious,
      this.commandId
    );
  }

  public fromAgent(agentId: string): AddToCartCommand {
    return new AddToCartCommand(
      this.cartId,
      this.customerId,
      this.menuItemName,
      this.quantity,
      this.sessionId,
      agentId,
      'AGENT_RECOMMENDATION',
      this.specialInstructions,
      this.replacePrevious,
      this.commandId
    );
  }

  public asReplacement(): AddToCartCommand {
    return new AddToCartCommand(
      this.cartId,
      this.customerId,
      this.menuItemName,
      this.quantity,
      this.sessionId,
      this.agentId,
      this.source,
      this.specialInstructions,
      true,
      this.commandId
    );
  }

  public withQuantity(quantity: number): AddToCartCommand {
    return new AddToCartCommand(
      this.cartId,
      this.customerId,
      this.menuItemName,
      quantity,
      this.sessionId,
      this.agentId,
      this.source,
      this.specialInstructions,
      this.replacePrevious,
      this.commandId
    );
  }

  /**
   * 🔍 PATRÓN: Command Analysis Pattern
   * Analizar características del comando
   */
  public getCommandAnalysis(): CartCommandAnalysis {
    return {
      isHighQuantity: this.quantity >= 5,
      hasSpecialInstructions: !!this.specialInstructions,
      isAgentInitiated: !!this.agentId,
      isVoiceCommand: this.source === 'USER_VOICE_COMMAND',
      isRecommendation: this.source === 'AGENT_RECOMMENDATION',
      isReplacement: !!this.replacePrevious,
      estimatedCartImpact: this.getEstimatedCartImpact(),
      requiresValidation: this.requiresSpecialValidation()
    };
  }

  /**
   * 📊 PATRÓN: Impact Assessment Pattern
   * Evaluar impacto estimado en el carrito
   */
  private getEstimatedCartImpact(): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (this.quantity >= 10) return 'HIGH';
    if (this.quantity >= 5 || this.replacePrevious) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 🛡️ PATRÓN: Validation Requirements Pattern
   * Determinar si requiere validación especial
   */
  private requiresSpecialValidation(): boolean {
    return !!(
      this.quantity >= 10 ||
      this.specialInstructions ||
      this.source === 'AGENT_RECOMMENDATION' ||
      this.replacePrevious
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de AddToCartCommand
 */
export class AddToCartCommandBuilder {
  private cartId?: string;
  private customerId?: string;
  private menuItemName?: string;
  private quantity?: number;
  private sessionId?: string;
  private agentId?: string;
  private source?: CartItemSource;
  private specialInstructions?: string;
  private replacePrevious?: boolean;

  public toCart(cartId: string): this {
    this.cartId = cartId;
    return this;
  }

  public forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public addItem(menuItemName: string): this {
    this.menuItemName = menuItemName;
    return this;
  }

  public withQuantity(quantity: number): this {
    this.quantity = quantity;
    return this;
  }

  public inSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public fromAgent(agentId: string): this {
    this.agentId = agentId;
    this.source = 'AGENT_RECOMMENDATION';
    return this;
  }

  public fromSource(source: CartItemSource): this {
    this.source = source;
    return this;
  }

  public withInstructions(instructions: string): this {
    this.specialInstructions = instructions;
    return this;
  }

  public asReplacement(): this {
    this.replacePrevious = true;
    return this;
  }

  public build(): AddToCartCommand {
    if (!this.cartId) throw new Error('Cart ID is required');
    if (!this.customerId) throw new Error('Customer ID is required');
    if (!this.menuItemName) throw new Error('Menu item name is required');
    if (!this.quantity) throw new Error('Quantity is required');

    return new AddToCartCommand(
      this.cartId,
      this.customerId,
      this.menuItemName,
      this.quantity,
      this.sessionId,
      this.agentId,
      this.source,
      this.specialInstructions,
      this.replacePrevious
    );
  }
}

/**
 * 📊 PATRÓN: Type Definition Pattern
 * Fuentes posibles para agregar items al carrito
 */
export type CartItemSource = 
  | 'USER_CLICK'
  | 'USER_VOICE_COMMAND'
  | 'AGENT_RECOMMENDATION'
  | 'CAROUSEL_FOCUS'
  | 'REORDER'
  | 'COMBO_SUGGESTION';

/**
 * 📊 PATRÓN: Analysis Result Pattern
 * Resultado del análisis del comando de carrito
 */
export interface CartCommandAnalysis {
  isHighQuantity: boolean;
  hasSpecialInstructions: boolean;
  isAgentInitiated: boolean;
  isVoiceCommand: boolean;
  isRecommendation: boolean;
  isReplacement: boolean;
  estimatedCartImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresValidation: boolean;
}
