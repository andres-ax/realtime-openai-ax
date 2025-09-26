/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD) + Enum Pattern
 * 🎯 PRINCIPIO: Immutability + Type Safety + Business Rules
 * 
 * MenuCategory - Categoría de items del menú
 * Define categorías válidas y comportamientos asociados
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 🔄 PATRÓN: Enumeration Pattern
 * Categorías válidas del menú
 */
export enum MenuCategoryType {
  BURGER = 'burger',
  SIDES = 'sides',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage',
  COMBO = 'combo',
  SANDWICH = 'sandwich',
  SALAD = 'salad',
  APPETIZER = 'appetizer'
}

/**
 * 🍔 PATRÓN: Category Classification Pattern
 * MenuCategory encapsula lógica de categorización de productos
 */
export class MenuCategory extends BaseValueObject<MenuCategoryType> {

  constructor(value: MenuCategoryType) {
    super(value);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Categorías predefinidas para creación segura
   */
  public static burger(): MenuCategory {
    return new MenuCategory(MenuCategoryType.BURGER);
  }

  public static sides(): MenuCategory {
    return new MenuCategory(MenuCategoryType.SIDES);
  }

  public static dessert(): MenuCategory {
    return new MenuCategory(MenuCategoryType.DESSERT);
  }

  public static beverage(): MenuCategory {
    return new MenuCategory(MenuCategoryType.BEVERAGE);
  }

  public static combo(): MenuCategory {
    return new MenuCategory(MenuCategoryType.COMBO);
  }

  public static sandwich(): MenuCategory {
    return new MenuCategory(MenuCategoryType.SANDWICH);
  }

  public static salad(): MenuCategory {
    return new MenuCategory(MenuCategoryType.SALAD);
  }

  public static appetizer(): MenuCategory {
    return new MenuCategory(MenuCategoryType.APPETIZER);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con mapeo inteligente
   */
  public static fromString(value: string): MenuCategory {
    const normalizedValue = value.toLowerCase().trim();
    
    // Mapeo de strings comunes a categorías
    const categoryMappings: Record<string, MenuCategoryType> = {
      'burger': MenuCategoryType.BURGER,
      'hamburger': MenuCategoryType.BURGER,
      'cheeseburger': MenuCategoryType.BURGER,
      'sandwich': MenuCategoryType.SANDWICH,
      'sides': MenuCategoryType.SIDES,
      'side': MenuCategoryType.SIDES,
      'fries': MenuCategoryType.SIDES,
      'dessert': MenuCategoryType.DESSERT,
      'desert': MenuCategoryType.DESSERT,
      'sweet': MenuCategoryType.DESSERT,
      'pie': MenuCategoryType.DESSERT,
      'beverage': MenuCategoryType.BEVERAGE,
      'drink': MenuCategoryType.BEVERAGE,
      'soda': MenuCategoryType.BEVERAGE,
      'combo': MenuCategoryType.COMBO,
      'meal': MenuCategoryType.COMBO,
      'salad': MenuCategoryType.SALAD,
      'appetizer': MenuCategoryType.APPETIZER,
      'starter': MenuCategoryType.APPETIZER,
      'main': MenuCategoryType.BURGER // Default para "main"
    };

    const categoryType = categoryMappings[normalizedValue];
    if (!categoryType) {
      // Si no encuentra mapeo, intentar match directo con enum
      const enumValue = normalizedValue as MenuCategoryType;
      if (Object.values(MenuCategoryType).includes(enumValue)) {
        return new MenuCategory(enumValue);
      }
      
      // Default fallback
      return MenuCategory.burger();
    }

    return new MenuCategory(categoryType);
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener nombre de categoría para mostrar
   */
  public getDisplayName(): string {
    const displayNames: Record<MenuCategoryType, string> = {
      [MenuCategoryType.BURGER]: 'Burgers',
      [MenuCategoryType.SANDWICH]: 'Sandwiches',
      [MenuCategoryType.SIDES]: 'Sides',
      [MenuCategoryType.DESSERT]: 'Desserts',
      [MenuCategoryType.BEVERAGE]: 'Beverages',
      [MenuCategoryType.COMBO]: 'Combo Meals',
      [MenuCategoryType.SALAD]: 'Salads',
      [MenuCategoryType.APPETIZER]: 'Appetizers'
    };

    return displayNames[this._value];
  }

  /**
   * 🎨 PATRÓN: Icon Pattern
   * Obtener emoji/icono asociado a la categoría
   */
  public getIcon(): string {
    const icons: Record<MenuCategoryType, string> = {
      [MenuCategoryType.BURGER]: '🍔',
      [MenuCategoryType.SANDWICH]: '🥪',
      [MenuCategoryType.SIDES]: '🍟',
      [MenuCategoryType.DESSERT]: '🥧',
      [MenuCategoryType.BEVERAGE]: '🥤',
      [MenuCategoryType.COMBO]: '🍽️',
      [MenuCategoryType.SALAD]: '🥗',
      [MenuCategoryType.APPETIZER]: '🍤'
    };

    return icons[this._value];
  }

  /**
   * 🎨 PATRÓN: Color Scheme Pattern
   * Obtener color asociado a la categoría (para UI)
   */
  public getColor(): string {
    const colors: Record<MenuCategoryType, string> = {
      [MenuCategoryType.BURGER]: '#e74c3c',      // Rojo
      [MenuCategoryType.SANDWICH]: '#f39c12',    // Naranja
      [MenuCategoryType.SIDES]: '#f1c40f',       // Amarillo
      [MenuCategoryType.DESSERT]: '#e91e63',     // Rosa
      [MenuCategoryType.BEVERAGE]: '#3498db',    // Azul
      [MenuCategoryType.COMBO]: '#9b59b6',       // Púrpura
      [MenuCategoryType.SALAD]: '#2ecc71',       // Verde
      [MenuCategoryType.APPETIZER]: '#1abc9c'    // Turquesa
    };

    return colors[this._value];
  }

  /**
   * 📊 PATRÓN: Sorting Pattern
   * Obtener orden de clasificación para menús
   */
  public getSortOrder(): number {
    const sortOrders: Record<MenuCategoryType, number> = {
      [MenuCategoryType.COMBO]: 1,
      [MenuCategoryType.BURGER]: 2,
      [MenuCategoryType.SANDWICH]: 3,
      [MenuCategoryType.SALAD]: 4,
      [MenuCategoryType.APPETIZER]: 5,
      [MenuCategoryType.SIDES]: 6,
      [MenuCategoryType.BEVERAGE]: 7,
      [MenuCategoryType.DESSERT]: 8
    };

    return sortOrders[this._value];
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es categoría principal
   */
  public isMainCourse(): boolean {
    return [
      MenuCategoryType.BURGER,
      MenuCategoryType.SANDWICH,
      MenuCategoryType.COMBO,
      MenuCategoryType.SALAD
    ].includes(this._value);
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es complemento
   */
  public isSide(): boolean {
    return [
      MenuCategoryType.SIDES,
      MenuCategoryType.APPETIZER
    ].includes(this._value);
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es bebida
   */
  public isBeverage(): boolean {
    return this._value === MenuCategoryType.BEVERAGE;
  }

  /**
   * 📊 PATRÓN: Business Logic Pattern
   * Verificar si es postre
   */
  public isDessert(): boolean {
    return this._value === MenuCategoryType.DESSERT;
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar valor de categoría
   */
  protected validate(value: MenuCategoryType): void {
    if (!Object.values(MenuCategoryType).includes(value)) {
      throw new Error(`Invalid menu category: ${value}`);
    }
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Obtener valor de la categoría
   */
  public getValue(): MenuCategoryType {
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
