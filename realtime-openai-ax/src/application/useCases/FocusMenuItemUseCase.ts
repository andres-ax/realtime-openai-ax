/**
 * 🏗️ PATRÓN: Use Case Pattern (Clean Architecture)
 * 🎯 PRINCIPIO: Single Responsibility + UI Control + Real-time Interaction
 * 
 * FocusMenuItemUseCase - Caso de uso para control de carousel desde AI
 * Maneja la interacción entre agentes AI y el carousel 3D del menú
 */

import { MenuItem } from '../../domain/entities/MenuItem';
import { Agent } from '../../domain/entities/Agent';
import { Customer } from '../../domain/entities/Customer';
import { Cart } from '../../domain/entities/Cart';
// ValidationService and MenuItemId imported in domain
import { AgentId } from '../../domain/valueObjects/AgentId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';
import { CartId } from '../../domain/valueObjects/CartId';

/**
 * 🎯 PATRÓN: Use Case Pattern
 * FocusMenuItemUseCase encapsula la lógica de aplicación para control de carousel
 */
export class FocusMenuItemUseCase {
  
  /**
   * 🔧 PATRÓN: Dependency Injection Pattern
   * Constructor con dependencias inyectadas
   */
  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    private readonly agentRepository: AgentRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly cartRepository: CartRepository,
    private readonly uiControlService: UIControlService
  ) {}

  /**
   * 🎯 PATRÓN: Command Handler Pattern
   * Enfocar item específico en el carousel
   */
  public async focusMenuItem(command: FocusMenuItemCommand): Promise<FocusMenuItemResult> {
    try {
      // 1. Validar entrada
      const inputValidation = this.validateFocusInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          error: inputValidation.error!
        };
      }

      // 2. Cargar contexto necesario
      const context = await this.loadFocusContext(command);
      if (!context.success) {
        return {
          success: false,
          error: context.error!
        };
      }

      const { menuItem, agent, customer, cart } = context;

      // 3. Validar que el agente puede controlar el carousel
      if (!agent!.canFocusMenuItems()) {
        return {
          success: false,
          error: 'Agent does not have carousel control capability'
        };
      }

      // 4. Validar disponibilidad del item
      if (!menuItem!.isAvailable()) {
        return {
          success: false,
          error: `Menu item is not available: ${menuItem!.getName()}`,
          shouldSuggestAlternative: true,
          alternativeItems: await this.findAlternativeItems(menuItem!)
        };
      }

      // 5. Calcular posición en el carousel
      const carouselPosition = await this.calculateCarouselPosition(
        menuItem!,
        command.currentPosition
      );

      // 6. Preparar configuración de animación
      const animationConfig = this.buildAnimationConfig(command, carouselPosition);

      // 7. Ejecutar control del carousel
      const uiResult = await this.uiControlService.focusCarouselItem({
        sessionId: command.sessionId,
        menuItemName: menuItem!.getName(),
        emphasize: command.emphasize,
        animationDuration: animationConfig.duration
      });

      if (!uiResult.success) {
        return {
          success: false,
          error: 'Failed to control carousel UI',
          uiError: uiResult.error
        };
      }

      // 8. Registrar interacción del agente (simulado)
      // agent!.recordMenuInteraction(menuItem!.getName(), 'focus');
      // await this.agentRepository.save(agent!);

      // 9. Preparar información contextual para el agente
      const contextualInfo = await this.buildContextualInfo(menuItem!, customer, cart);

      // 10. Generar sugerencias de interacción
      const interactionSuggestions = this.generateInteractionSuggestions(
        menuItem!,
        customer,
        cart
      );

      return {
        success: true,
        focusedItem: menuItem!,
        carouselPosition: carouselPosition.targetIndex,
        animationDuration: animationConfig.duration,
        contextualInfo,
        interactionSuggestions,
        uiConfiguration: {},
        agentPrompt: this.generateAgentPrompt(menuItem!, contextualInfo)
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to focus menu item'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Command Handler Pattern
   * Navegar carousel por categoría
   */
  public async focusCategory(command: FocusCategoryCommand): Promise<FocusCategoryResult> {
    try {
      // 1. Validar entrada
      if (!command.categoryName || !command.sessionId) {
        return {
          success: false,
          error: 'Category name and session ID are required'
        };
      }

      // 2. Obtener items de la categoría
      const categoryItems = await this.menuItemRepository.findByCategory(command.categoryName);
      if (categoryItems.length === 0) {
        return {
          success: false,
          error: `No items found in category: ${command.categoryName}`
        };
      }

      // 3. Filtrar items disponibles
      const availableItems = categoryItems.filter(item => item.isAvailable());
      if (availableItems.length === 0) {
        return {
          success: false,
          error: `No available items in category: ${command.categoryName}`
        };
      }

      // 4. Seleccionar item destacado de la categoría
      const featuredItem = this.selectFeaturedItemFromCategory(availableItems);

      // 5. Enfocar el item destacado
      const focusResult = await this.focusMenuItem({
        sessionId: command.sessionId,
        agentId: command.agentId,
        menuItemName: featuredItem.getName(),
        reason: `Category focus: ${command.categoryName}`,
        currentPosition: command.currentPosition
      });

      if (!focusResult.success) {
        return {
          success: false,
          error: focusResult.error!
        };
      }

      return {
        success: true,
        categoryName: command.categoryName,
        featuredItem,
        availableItems,
        totalItemsInCategory: categoryItems.length,
        focusResult
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to focus category'
      };
    }
  }

  /**
   * 🔍 PATRÓN: Query Handler Pattern
   * Obtener información del carousel actual
   */
  public async getCarouselStatus(command: GetCarouselStatusCommand): Promise<CarouselStatusResult> {
    try {
      // 1. Obtener estado actual del carousel
      const carouselState = await this.uiControlService.getCarouselState(command.sessionId);

      // 2. Cargar información del item actual
      let currentItem: MenuItem | undefined;
      if (carouselState.currentItem) {
        const foundItem = await this.menuItemRepository.findByName(carouselState.currentItem);
        currentItem = foundItem || undefined;
      }

      // 3. Obtener items disponibles
      const availableItems = await this.menuItemRepository.findAvailable();

      // 4. Calcular navegación posible
      const navigationInfo = this.calculateNavigationOptions(
        carouselState.position,
        availableItems.length
      );

      return {
        success: true,
        currentPosition: carouselState.position,
        totalItems: availableItems.length,
        currentItem,
        canNavigateNext: navigationInfo.canNavigateNext,
        canNavigatePrevious: navigationInfo.canNavigatePrevious,
        availableCategories: await this.getAvailableCategories(),
        isAnimating: carouselState.isAnimating,
        lastInteraction: new Date() // Simulated last interaction
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get carousel status'
      };
    }
  }

  /**
   * 🎨 PATRÓN: Smart Navigation Pattern
   * Navegar carousel inteligentemente
   */
  public async smartNavigate(command: SmartNavigateCommand): Promise<SmartNavigateResult> {
    try {
      // 1. Cargar contexto del customer
      const customer = command.customerId ? 
        await this.customerRepository.findById(CustomerId.fromString(command.customerId)) : 
        undefined;

      // Cart loading (optional for smart navigation)
      // const cart = command.cartId ? 
      //   await this.cartRepository.findById(CartId.fromString(command.cartId)) : 
      //   undefined;

      // 2. Obtener preferencias del customer
      const preferences = customer ? customer.getPreferences().favoriteItems || [] : [];

      // 3. Obtener items recomendados
      const recommendedItems = await this.getRecommendedItems(
        command.intent,
        preferences
      );

      if (recommendedItems.length === 0) {
        return {
          success: false,
          error: 'No recommendations found for the given intent'
        };
      }

      // 4. Seleccionar mejor recomendación
      const bestRecommendation = recommendedItems[0];

      // 5. Enfocar item recomendado
      const focusResult = await this.focusMenuItem({
        sessionId: command.sessionId,
        agentId: command.agentId,
        menuItemName: bestRecommendation.getName(),
        reason: `Smart navigation: ${command.intent}`,
        currentPosition: command.currentPosition
      });

      return {
        success: focusResult.success,
        recommendedItem: bestRecommendation,
        allRecommendations: recommendedItems,
        navigationReason: `Based on intent: ${command.intent}`,
        focusResult,
        error: focusResult.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Smart navigation failed'
      };
    }
  }

  /**
   * 🛡️ PATRÓN: Input Validation Pattern
   * Validar entrada para focus
   */
  private validateFocusInput(command: FocusMenuItemCommand): InputValidationResult {
    const errors: string[] = [];

    if (!command.sessionId) errors.push('Session ID is required');
    if (!command.agentId) errors.push('Agent ID is required');
    if (!command.menuItemName) errors.push('Menu item name is required');

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Context Loading Pattern
   * Cargar contexto para focus
   */
  private async loadFocusContext(command: FocusMenuItemCommand): Promise<FocusContextResult> {
    try {
      // Cargar menu item
      const menuItem = await this.menuItemRepository.findByName(command.menuItemName);
      if (!menuItem) {
        return { success: false, error: `Menu item not found: ${command.menuItemName}` };
      }

      // Cargar agent
      const agent = await this.agentRepository.findById(AgentId.fromString(command.agentId));
      if (!agent) {
        return { success: false, error: 'Agent not found' };
      }

      // Cargar customer (opcional)
      let customer: Customer | undefined;
      if (command.customerId) {
        const foundCustomer = await this.customerRepository.findById(
          CustomerId.fromString(command.customerId)
        );
        customer = foundCustomer || undefined;
      }

      // Cargar cart (opcional)
      // Cart loading (optional) - not used in current implementation
      // if (command.cartId) {
      //   const foundCart = await this.cartRepository.findById(CartId.fromString(command.cartId));
      //   cart = foundCart || undefined;
      // }

      return {
        success: true,
        menuItem,
        agent,
        customer,
        cart: undefined // Not used in current implementation
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load focus context'
      };
    }
  }

  /**
   * 📐 PATRÓN: Position Calculation Pattern
   * Calcular posición en carousel
   */
  private async calculateCarouselPosition(
    menuItem: MenuItem,
    currentPosition?: number
  ): Promise<CarouselPositionInfo> {
    const allItems = await this.menuItemRepository.findAvailable();
    const targetIndex = allItems.findIndex(item => 
      item.getName() === menuItem.getName()
    );

    return {
      targetIndex: targetIndex >= 0 ? targetIndex : 0,
      totalItems: allItems.length,
      currentIndex: currentPosition || 0,
      rotationAngle: targetIndex * (360 / allItems.length)
    };
  }

  /**
   * 🎬 PATRÓN: Animation Configuration Pattern
   * Construir configuración de animación
   */
  private buildAnimationConfig(
    command: FocusMenuItemCommand,
    position: CarouselPositionInfo
  ): AnimationConfig {
    const distance = Math.abs(position.targetIndex - position.currentIndex);
    const baseDuration = 800; // ms
    const durationPerStep = 200; // ms por paso

    return {
      duration: Math.min(baseDuration + (distance * durationPerStep), 2000),
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      highlightDuration: 1500,
      shouldPulse: command.emphasize || false,
      shouldZoom: distance > 3 // Zoom para navegación larga
    };
  }

  /**
   * 📊 PATRÓN: Contextual Information Pattern
   * Construir información contextual
   */
  private async buildContextualInfo(
    menuItem: MenuItem,
    customer?: Customer,
    cart?: Cart
  ): Promise<ContextualInfo> {
    return {
      itemDetails: {
        name: menuItem.getName(),
        price: menuItem.getPrice().toUSDString(),
        category: menuItem.getCategory().getDisplayName(),
        description: menuItem.getDescription(),
        preparationTime: menuItem.getPreparationTime(),
        isPopular: false, // Simulated popularity
        nutritionalInfo: menuItem.getNutritionalInfo() || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      },
      customerContext: customer ? {
        hasOrderedBefore: false, // Simulated order history
        preferenceMatch: true, // Simulated preference match
        loyaltyDiscount: customer.getDiscountPercentage()
      } : undefined,
      cartContext: cart ? {
        isInCart: cart.hasItem(menuItem.getName()),
        currentQuantity: cart.getItemQuantity(menuItem.getName()),
        wouldCreateCombo: this.checkComboOpportunity(menuItem, cart)
      } : undefined
    };
  }

  /**
   * 💡 PATRÓN: Suggestion Engine Pattern
   * Generar sugerencias de interacción
   */
  private generateInteractionSuggestions(
    menuItem: MenuItem,
    customer?: Customer,
    cart?: Cart
  ): InteractionSuggestion[] {
    const suggestions: InteractionSuggestion[] = [];

    // Sugerencia básica de agregar al carrito
    suggestions.push({
      type: 'ADD_TO_CART',
      text: `Add ${menuItem.getName()} to cart`,
      priority: 'HIGH',
      reason: 'Primary action for focused item'
    });

    // Sugerencias basadas en customer
    if (customer && false) { // Simulated order check
      suggestions.push({
        type: 'REORDER_FAVORITE',
        text: 'Order your favorite again',
        priority: 'HIGH',
        reason: 'Customer has ordered this before'
      });
    }

    // Sugerencias de combo
    if (cart && this.checkComboOpportunity(menuItem, cart)) {
      suggestions.push({
        type: 'SUGGEST_COMBO',
        text: 'Complete your combo meal',
        priority: 'MEDIUM',
        reason: 'Combo opportunity detected'
      });
    }

    // Sugerencias de items similares
    suggestions.push({
      type: 'SHOW_SIMILAR',
      text: 'Show similar items',
      priority: 'LOW',
      reason: 'Expand customer options'
    });

    return suggestions;
  }

  /**
   * 🤖 PATRÓN: Agent Prompt Generation Pattern
   * Generar prompt para el agente
   */
  private generateAgentPrompt(
    menuItem: MenuItem,
    contextualInfo: ContextualInfo
  ): string {
    let prompt = `I'm now focusing on ${menuItem.getName()} - ${menuItem.getPrice().toUSDString()}. `;
    
    if (contextualInfo.customerContext?.hasOrderedBefore) {
      prompt += "The customer has ordered this before! ";
    }
    
    if (contextualInfo.cartContext?.isInCart) {
      prompt += `This item is already in the cart (${contextualInfo.cartContext.currentQuantity}x). `;
    }
    
    if (false) { // Simulated popularity check
      prompt += "This is one of our popular items. ";
    }
    
    prompt += `Would you like me to add it to your cart or tell you more about it?`;
    
    return prompt;
  }

  /**
   * 🔍 PATRÓN: Alternative Finder Pattern
   * Encontrar items alternativos
   */
  private async findAlternativeItems(unavailableItem: MenuItem): Promise<MenuItem[]> {
    const sameCategory = await this.menuItemRepository.findByCategory(
      unavailableItem.getCategory().getValue()
    );
    
    return sameCategory
      .filter(item => item.isAvailable() && item.getName() !== unavailableItem.getName())
      .slice(0, 3); // Top 3 alternatives
  }

  /**
   * ⭐ PATRÓN: Featured Selection Pattern
   * Seleccionar item destacado de categoría
   */
  private selectFeaturedItemFromCategory(items: MenuItem[]): MenuItem {
    // Priorizar items populares
    const popularItems = items.filter(() => false); // Simulated popularity filter
    if (popularItems.length > 0) {
      return popularItems[0];
    }
    
    // Si no hay populares, tomar el primero disponible
    return items[0];
  }

  /**
   * 🧭 PATRÓN: Navigation Calculator Pattern
   * Calcular opciones de navegación
   */
  private calculateNavigationOptions(
    currentPosition: number,
    totalItems: number
  ): NavigationOptions {
    return {
      canNavigateNext: currentPosition < totalItems - 1,
      canNavigatePrevious: currentPosition > 0,
      nextPosition: Math.min(currentPosition + 1, totalItems - 1),
      previousPosition: Math.max(currentPosition - 1, 0)
    };
  }

  /**
   * 📂 PATRÓN: Category Aggregator Pattern
   * Obtener categorías disponibles
   */
  private async getAvailableCategories(): Promise<string[]> {
    const allItems = await this.menuItemRepository.findAvailable();
    const categories = new Set(allItems.map(item => item.getCategory().getValue()));
    return Array.from(categories);
  }

  /**
   * 🎯 PATRÓN: Recommendation Engine Pattern
   * Obtener items recomendados
   */
  private async getRecommendedItems(
    intent: string,
    preferences: string[]
  ): Promise<MenuItem[]> {
    const allItems = await this.menuItemRepository.findAvailable();
    
    // Filtrar por intent
    let filtered = allItems;
    if (intent.toLowerCase().includes('burger')) {
      filtered = allItems.filter(item => 
        item.getCategory().getValue().toLowerCase().includes('burger')
      );
    } else if (intent.toLowerCase().includes('drink')) {
      filtered = allItems.filter(item => 
        item.getCategory().getValue().toLowerCase().includes('drink')
      );
    }
    
    // Aplicar preferencias del customer
    if (preferences.length > 0) {
      filtered = filtered.filter(item => 
        preferences.some(pref => 
          item.getName().toLowerCase().includes(pref.toLowerCase())
        )
      );
    }
    
    // Ordenar por popularidad
    return filtered.sort(() => {
      // Simulated popularity sorting
      return 0;
    });
  }

  /**
   * 🍽️ PATRÓN: Combo Detector Pattern
   * Verificar oportunidad de combo
   */
  private checkComboOpportunity(menuItem: MenuItem, cart: Cart): boolean {
    const cartItems = cart.getItems().map(item => item.getMenuItemName().toLowerCase());
    const itemName = menuItem.getName().toLowerCase();
    
    // Lógica simple de combo
    if (itemName.includes('burger')) {
      return !cartItems.some(name => name.includes('fries') || name.includes('drink'));
    }
    
    if (itemName.includes('fries')) {
      return cartItems.some(name => name.includes('burger')) && 
             !cartItems.some(name => name.includes('drink'));
    }
    
    return false;
  }
}

/**
 * 📊 PATRÓN: Command Pattern
 * Comandos para control de carousel
 */
export interface FocusMenuItemCommand {
  sessionId: string;
  agentId: string;
  menuItemName: string;
  customerId?: string;
  cartId?: string;
  reason?: string;
  currentPosition?: number;
  emphasize?: boolean;
}

export interface FocusCategoryCommand {
  sessionId: string;
  agentId: string;
  categoryName: string;
  currentPosition?: number;
}

export interface GetCarouselStatusCommand {
  sessionId: string;
}

export interface SmartNavigateCommand {
  sessionId: string;
  agentId: string;
  intent: string;
  customerId?: string;
  cartId?: string;
  currentPosition?: number;
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultados de operaciones de carousel
 */
export interface FocusMenuItemResult {
  success: boolean;
  focusedItem?: MenuItem;
  carouselPosition?: number;
  animationDuration?: number;
  contextualInfo?: ContextualInfo;
  interactionSuggestions?: InteractionSuggestion[];
  uiConfiguration?: UIConfiguration;
  agentPrompt?: string;
  error?: string;
  shouldSuggestAlternative?: boolean;
  alternativeItems?: MenuItem[];
  uiError?: string;
}

export interface FocusCategoryResult {
  success: boolean;
  categoryName?: string;
  featuredItem?: MenuItem;
  availableItems?: MenuItem[];
  totalItemsInCategory?: number;
  focusResult?: FocusMenuItemResult;
  error?: string;
}

export interface CarouselStatusResult {
  success: boolean;
  currentPosition?: number;
  totalItems?: number;
  currentItem?: MenuItem;
  canNavigateNext?: boolean;
  canNavigatePrevious?: boolean;
  availableCategories?: string[];
  isAnimating?: boolean;
  lastInteraction?: Date;
  error?: string;
}

export interface SmartNavigateResult {
  success: boolean;
  recommendedItem?: MenuItem;
  allRecommendations?: MenuItem[];
  navigationReason?: string;
  focusResult?: FocusMenuItemResult;
  error?: string;
}

/**
 * 📊 PATRÓN: Data Structure Patterns
 * Estructuras de datos específicas
 */
export interface ContextualInfo {
  itemDetails: {
    name: string;
    price: string;
    category: string;
    description: string;
    preparationTime: number;
    isPopular: boolean;
    nutritionalInfo: NutritionalInfo;
  };
  customerContext?: {
    hasOrderedBefore: boolean;
    preferenceMatch: boolean;
    loyaltyDiscount: number;
  };
  cartContext?: {
    isInCart: boolean;
    currentQuantity: number;
    wouldCreateCombo: boolean;
  };
}

export interface InteractionSuggestion {
  type: 'ADD_TO_CART' | 'REORDER_FAVORITE' | 'SUGGEST_COMBO' | 'SHOW_SIMILAR';
  text: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

interface CarouselPositionInfo {
  targetIndex: number;
  totalItems: number;
  currentIndex: number;
  rotationAngle: number;
}

interface AnimationConfig {
  duration: number;
  easing: string;
  highlightDuration: number;
  shouldPulse: boolean;
  shouldZoom: boolean;
}

interface NavigationOptions {
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
  nextPosition: number;
  previousPosition: number;
}

interface InputValidationResult {
  isValid: boolean;
  error?: string;
}

interface FocusContextResult {
  success: boolean;
  error?: string;
  menuItem?: MenuItem;
  agent?: Agent;
  customer?: Customer;
  cart?: Cart;
}

/**
 * 🏪 PATRÓN: Repository Pattern (Interfaces)
 * Interfaces de repositorios y servicios
 */
export interface MenuItemRepository {
  findByName(name: string): Promise<MenuItem | null>;
  findById(id: string): Promise<MenuItem | null>;
  findByCategory(category: string): Promise<MenuItem[]>;
  findAvailable(): Promise<MenuItem[]>;
}

export interface AgentRepository {
  findById(id: AgentId): Promise<Agent | null>;
  save(agent: Agent): Promise<Agent>;
}

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
}

export interface CartRepository {
  findById(id: CartId): Promise<Cart | null>;
}

export interface UIControlService {
  focusCarouselItem(request: CarouselFocusRequest): Promise<CarouselFocusResponse>;
  getCarouselState(sessionId: string): Promise<CarouselState>;
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para UI y contexto
 */
export interface UIConfiguration {
  theme?: string;
  layout?: string;
  animations?: boolean;
  focusEffects?: boolean;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
}

export interface CarouselFocusRequest {
  sessionId: string;
  menuItemName: string;
  emphasize?: boolean;
  animationDuration?: number;
}

export interface CarouselFocusResponse {
  success: boolean;
  focusedItem?: string;
  position?: number;
  error?: string;
}

export interface CarouselState {
  currentItem?: string;
  position: number;
  totalItems: number;
  isAnimating: boolean;
}
