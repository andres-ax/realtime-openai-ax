/**
 * 🏗️ PATRÓN: Query Pattern (CQRS)
 * 🎯 PRINCIPIO: Query Responsibility + Static Menu Data + Real-time Demo
 * 
 * GetMenuItemsQuery - Query para obtener items del menú
 * Optimizada para demostración con datos estáticos del menú original
 */

import { BaseQuery, QueryValidationResult, QueryMetadata, SerializedQuery } from './BaseQuery';
import { MenuItem } from '../../domain/entities/MenuItem';
import { MenuCategory } from '../../domain/valueObjects/MenuCategory';
import { Price } from '../../domain/valueObjects/Price';

/**
 * 🎯 PATRÓN: Query Pattern
 * GetMenuItemsQuery encapsula la consulta de items del menú
 */
export class GetMenuItemsQuery extends BaseQuery {
  
  /**
   * 🔧 PATRÓN: Immutable Query Pattern
   * Constructor que crea query inmutable
   */
  constructor(
    public readonly category?: string,
    public readonly availableOnly: boolean = true,
    public readonly includeNutrition: boolean = false,
    public readonly sortBy: MenuSortOption = 'NAME',
    public readonly searchTerm?: string,
    public readonly maxResults?: number,
    queryId?: string
  ) {
    super(queryId);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar query antes de ejecución
   */
  public validate(): QueryValidationResult {
    const errors: string[] = [];

    if (this.maxResults && this.maxResults <= 0) {
      errors.push('Max results must be greater than 0');
    }

    if (this.maxResults && this.maxResults > 100) {
      errors.push('Max results cannot exceed 100');
    }

    if (this.searchTerm && this.searchTerm.length < 2) {
      errors.push('Search term must be at least 2 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorMessage: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 📊 PATRÓN: Query Metadata Pattern
   * Obtener metadatos de la query
   */
  public getMetadata(): QueryMetadata {
    return {
      queryType: 'GetMenuItemsQuery',
      queryId: this.queryId,
      timestamp: this.timestamp,
      targetResource: 'menu-items',
      isCacheable: true,
      cacheKey: this.generateCacheKey(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresRealTimeData: false,
      dataSource: 'MEMORY' // Datos estáticos en memoria
    };
  }

  /**
   * 🔄 PATRÓN: Query Serialization Pattern
   * Serializar query para cache o transmisión
   */
  public serialize(): SerializedQuery {
    return {
      queryType: 'GetMenuItemsQuery',
      queryId: this.queryId,
      timestamp: this.timestamp.toISOString(),
      parameters: {
        category: this.category,
        availableOnly: this.availableOnly,
        includeNutrition: this.includeNutrition,
        sortBy: this.sortBy,
        searchTerm: this.searchTerm,
        maxResults: this.maxResults
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear query desde datos serializados
   */
  public static fromSerialized(data: SerializedQuery): GetMenuItemsQuery {
    if (data.queryType !== 'GetMenuItemsQuery') {
      throw new Error('Invalid query type for GetMenuItemsQuery');
    }

    const params = data.parameters as {
      category?: string;
      availableOnly: boolean;
      includeNutrition: boolean;
      sortBy: string;
      searchTerm?: string;
      maxResults?: number;
    };
    return new GetMenuItemsQuery(
      params.category,
      params.availableOnly,
      params.includeNutrition,
      params.sortBy,
      params.searchTerm,
      params.maxResults,
      data.queryId
    );
  }

  /**
   * 🎯 PATRÓN: Query Builder Pattern
   * Builder para construcción fluida de queries
   */
  public static builder(): GetMenuItemsQueryBuilder {
    return new GetMenuItemsQueryBuilder();
  }

  /**
   * 📊 PATRÓN: Query Execution Pattern
   * Ejecutar query y obtener resultados desde datos estáticos
   */
  public async execute(): Promise<GetMenuItemsResult> {
    try {
      // 1. Validar query
      const validation = this.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errorMessage!,
          validationErrors: validation.errors
        };
      }

      // 2. Intentar obtener desde cache
      if (this.getMetadata().isCacheable) {
        const cached = this.getCachedResult();
        if (cached) {
          return {
            ...cached,
            fromCache: true,
            cacheAge: this.getAge()
          };
        }
      }

      // 3. Obtener datos del menú estático
      let menuItems = this.getStaticMenuData();

      // 4. Aplicar filtros
      menuItems = this.applyFilters(menuItems);

      // 5. Aplicar ordenamiento
      menuItems = this.applySorting(menuItems);

      // 6. Aplicar límite de resultados
      if (this.maxResults) {
        menuItems = menuItems.slice(0, this.maxResults);
      }

      // 7. Preparar resultado
      const result: GetMenuItemsResult = {
        success: true,
        menuItems,
        totalCount: menuItems.length,
        categories: this.getAvailableCategories(menuItems),
        queryMetadata: this.getMetadata()
      };

      // 8. Cache del resultado
      if (this.getMetadata().isCacheable) {
        this.cacheResult(result);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  /**
   * 🍔 PATRÓN: Static Data Pattern
   * Obtener datos estáticos del menú (basado en los archivos originales)
   */
  private getStaticMenuData(): MenuItem[] {
    const menuData = [
      {
        name: 'Hamburger',
        category: 'BURGERS',
        price: 8.99,
        description: 'Classic beef hamburger with lettuce, tomato, and onion',
        preparationTime: 12,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 540, protein: 25, carbs: 45, fat: 31 }
      },
      {
        name: 'Cheeseburger',
        category: 'BURGERS',
        price: 9.99,
        description: 'Hamburger with melted cheese',
        preparationTime: 12,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 590, protein: 28, carbs: 45, fat: 35 }
      },
      {
        name: 'Double Cheeseburger',
        category: 'BURGERS',
        price: 12.99,
        description: 'Double beef patty with double cheese',
        preparationTime: 15,
        isAvailable: true,
        isPopular: false,
        nutrition: { calories: 780, protein: 45, carbs: 46, fat: 48 }
      },
      {
        name: 'Crispy Chicken Sandwich',
        category: 'CHICKEN',
        price: 10.99,
        description: 'Crispy fried chicken breast with mayo and pickles',
        preparationTime: 14,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 620, protein: 32, carbs: 52, fat: 28 }
      },
      {
        name: 'Chicken Nuggets (6 pc)',
        category: 'CHICKEN',
        price: 7.99,
        description: 'Six pieces of crispy chicken nuggets',
        preparationTime: 8,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 420, protein: 24, carbs: 28, fat: 22 }
      },
      {
        name: 'Filet Fish Sandwich',
        category: 'FISH',
        price: 9.49,
        description: 'Crispy fish fillet with tartar sauce',
        preparationTime: 13,
        isAvailable: true,
        isPopular: false,
        nutrition: { calories: 480, protein: 22, carbs: 48, fat: 22 }
      },
      {
        name: 'Fries',
        category: 'SIDES',
        price: 3.99,
        description: 'Golden crispy french fries',
        preparationTime: 6,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 320, protein: 4, carbs: 43, fat: 15 }
      },
      {
        name: 'Apple Pie',
        category: 'DESSERTS',
        price: 2.99,
        description: 'Warm apple pie with cinnamon',
        preparationTime: 5,
        isAvailable: true,
        isPopular: false,
        nutrition: { calories: 240, protein: 3, carbs: 35, fat: 11 }
      },
      {
        name: 'Combo Postobón',
        category: 'BEVERAGES',
        price: 2.49,
        description: 'Refreshing Colombian soda',
        preparationTime: 2,
        isAvailable: true,
        isPopular: true,
        nutrition: { calories: 150, protein: 0, carbs: 39, fat: 0 }
      },
      {
        name: 'Manzana Postobón',
        category: 'BEVERAGES',
        price: 2.49,
        description: 'Apple flavored soda',
        preparationTime: 2,
        isAvailable: true,
        isPopular: false,
        nutrition: { calories: 160, protein: 0, carbs: 42, fat: 0 }
      }
    ];

    // Convertir datos estáticos a entidades MenuItem
    return menuData.map(item => this.createMenuItemFromData(item));
  }

  /**
   * 🏗️ PATRÓN: Entity Factory Pattern
   * Crear entidad MenuItem desde datos estáticos
   */
  private createMenuItemFromData(data: Record<string, unknown>): MenuItem {
    // En una implementación real, usaríamos el constructor completo de MenuItem
    // Por ahora, simulamos la creación de la entidad
    const menuItem = {
      getName: () => data.name,
      getCategory: () => MenuCategory.fromString(data.category),
      getPrice: () => Price.fromDollars(data.price),
      getDescription: () => data.description,
      getPreparationTime: () => data.preparationTime,
      isAvailable: () => data.isAvailable,
      isPopular: () => data.isPopular,
      getNutritionalInfo: () => this.includeNutrition ? data.nutrition : undefined
    } as MenuItem;

    return menuItem;
  }

  /**
   * 🔍 PATRÓN: Filter Application Pattern
   * Aplicar filtros a los items del menú
   */
  private applyFilters(items: MenuItem[]): MenuItem[] {
    let filtered = items;

    // Filtrar por disponibilidad
    if (this.availableOnly) {
      filtered = filtered.filter(item => item.isAvailable());
    }

    // Filtrar por categoría
    if (this.category) {
      filtered = filtered.filter(item => 
        item.getCategory().getValue().toLowerCase() === this.category!.toLowerCase()
      );
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.getName().toLowerCase().includes(searchLower) ||
        item.getDescription().toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * 📊 PATRÓN: Sorting Pattern
   * Aplicar ordenamiento a los items
   */
  private applySorting(items: MenuItem[]): MenuItem[] {
    return items.sort((a, b) => {
      switch (this.sortBy) {
        case 'NAME':
          return a.getName().localeCompare(b.getName());
        
        case 'PRICE_LOW_HIGH':
          return a.getPrice().getValue() - b.getPrice().getValue();
        
        case 'PRICE_HIGH_LOW':
          return b.getPrice().getValue() - a.getPrice().getValue();
        
        case 'PREPARATION_TIME':
          return a.getPreparationTime() - b.getPreparationTime();
        
        case 'POPULARITY':
          // Populares primero
          if (a.isPopular() && !b.isPopular()) return -1;
          if (!a.isPopular() && b.isPopular()) return 1;
          return a.getName().localeCompare(b.getName());
        
        default:
          return 0;
      }
    });
  }

  /**
   * 📂 PATRÓN: Category Extraction Pattern
   * Obtener categorías disponibles de los items
   */
  private getAvailableCategories(items: MenuItem[]): string[] {
    const categories = new Set(items.map(item => item.getCategory().getValue()));
    return Array.from(categories).sort();
  }

  /**
   * 🗂️ PATRÓN: Cache Management Pattern
   * Gestión de cache para queries de menú
   */
  private getCachedResult(): GetMenuItemsResult | null {
    const cacheKey = this.generateCacheKey();
    const cached = this.getBrowserStorage(cacheKey, true) as Record<string, unknown>;
    
    if (cached && !this.isCacheExpired(cached.timestamp)) {
      return cached.result;
    }
    
    return null;
  }

  private cacheResult(result: GetMenuItemsResult): void {
    const cacheKey = this.generateCacheKey();
    const cacheData = {
      timestamp: Date.now(),
      result
    };
    
    this.setBrowserStorage(cacheKey, cacheData, true);
  }

  private isCacheExpired(timestamp: number): boolean {
    const maxAge = 300000; // 5 minutos para datos de menú
    return Date.now() - timestamp > maxAge;
  }

  /**
   * 🔑 PATRÓN: Cache Key Generation Pattern
   * Generar clave única para cache
   */
  private generateCacheKey(): string {
    const parts = [
      'query-cache',
      'GetMenuItemsQuery',
      this.category || 'all-categories',
      this.availableOnly ? 'available' : 'all',
      this.sortBy.toLowerCase(),
      this.searchTerm || 'no-search',
      this.maxResults?.toString() || 'no-limit'
    ];
    
    return this.getStorageKey(parts.join('-'));
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de ejecución
   */
  private getEstimatedDuration(): number {
    let baseDuration = 20; // 20ms base para datos en memoria

    if (this.searchTerm) baseDuration += 10;
    if (this.category) baseDuration += 5;
    if (this.includeNutrition) baseDuration += 15;

    return baseDuration;
  }

  /**
   * 🎨 PATRÓN: Query Decoration Pattern
   * Crear variantes de la query
   */
  public forCategory(category: string): GetMenuItemsQuery {
    return new GetMenuItemsQuery(
      category,
      this.availableOnly,
      this.includeNutrition,
      this.sortBy,
      this.searchTerm,
      this.maxResults,
      this.queryId
    );
  }

  public withNutrition(): GetMenuItemsQuery {
    return new GetMenuItemsQuery(
      this.category,
      this.availableOnly,
      true,
      this.sortBy,
      this.searchTerm,
      this.maxResults,
      this.queryId
    );
  }

  public sortedBy(sortBy: MenuSortOption): GetMenuItemsQuery {
    return new GetMenuItemsQuery(
      this.category,
      this.availableOnly,
      this.includeNutrition,
      sortBy,
      this.searchTerm,
      this.maxResults,
      this.queryId
    );
  }

  public limitedTo(maxResults: number): GetMenuItemsQuery {
    return new GetMenuItemsQuery(
      this.category,
      this.availableOnly,
      this.includeNutrition,
      this.sortBy,
      this.searchTerm,
      maxResults,
      this.queryId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de GetMenuItemsQuery
 */
export class GetMenuItemsQueryBuilder {
  private category?: string;
  private availableOnly: boolean = true;
  private includeNutrition: boolean = false;
  private sortBy: MenuSortOption = 'NAME';
  private searchTerm?: string;
  private maxResults?: number;

  public inCategory(category: string): this {
    this.category = category;
    return this;
  }

  public includeUnavailable(): this {
    this.availableOnly = false;
    return this;
  }

  public withNutrition(): this {
    this.includeNutrition = true;
    return this;
  }

  public sortBy(option: MenuSortOption): this {
    this.sortBy = option;
    return this;
  }

  public search(term: string): this {
    this.searchTerm = term;
    return this;
  }

  public limit(maxResults: number): this {
    this.maxResults = maxResults;
    return this;
  }

  public build(): GetMenuItemsQuery {
    return new GetMenuItemsQuery(
      this.category,
      this.availableOnly,
      this.includeNutrition,
      this.sortBy,
      this.searchTerm,
      this.maxResults
    );
  }
}

/**
 * 📊 PATRÓN: Type Definition Pattern
 * Opciones de ordenamiento para el menú
 */
export type MenuSortOption = 
  | 'NAME'
  | 'PRICE_LOW_HIGH'
  | 'PRICE_HIGH_LOW'
  | 'PREPARATION_TIME'
  | 'POPULARITY';

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de la query de items del menú
 */
export interface GetMenuItemsResult {
  success: boolean;
  menuItems?: MenuItem[];
  totalCount?: number;
  categories?: string[];
  error?: string;
  validationErrors?: string[];
  queryMetadata?: QueryMetadata;
  fromCache?: boolean;
  cacheAge?: number;
}
