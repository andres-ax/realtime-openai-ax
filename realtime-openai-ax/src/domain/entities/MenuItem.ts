/**
 * 🏗️ PATRÓN: Entity Pattern (DDD)
 * 🎯 PRINCIPIO: Single Responsibility + Immutability + Business Logic
 * 
 * MenuItem - Entidad que representa un item del menú
 * Encapsula información del producto, precios y disponibilidad
 */

import { BaseEntity } from './BaseEntity';
import { MenuItemId } from '../valueObjects/MenuItemId';
import { Price } from '../valueObjects/Price';
import { MenuCategory } from '../valueObjects/MenuCategory';

/**
 * 🍔 PATRÓN: Product Catalog Pattern
 * MenuItem representa un producto en el catálogo de menú
 */
export class MenuItem extends BaseEntity<MenuItemId> {
  private _name: string;
  private _description: string;
  private _price: Price;
  private _category: MenuCategory;
  private _imagePath: string;
  private _isAvailable: boolean;
  private _nutritionalInfo?: NutritionalInfo;
  private _allergens: string[];
  private _preparationTime: number; // en minutos

  constructor(
    id: MenuItemId,
    name: string,
    description: string,
    price: Price,
    category: MenuCategory,
    imagePath: string,
    preparationTime: number = 10
  ) {
    super(id);
    
    this._name = name;
    this._description = description;
    this._price = price;
    this._category = category;
    this._imagePath = imagePath;
    this._isAvailable = true;
    this._allergens = [];
    this._preparationTime = preparationTime;
    
    this.validate();
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear MenuItem desde datos del menú original
   */
  public static fromMenuData(menuData: OriginalMenuData): MenuItem {
    const id = MenuItemId.fromString(menuData.name.toLowerCase().replace(/\s+/g, '-'));
    const name = menuData.name;
    const description = menuData.description || '';
    const price = Price.fromDollars(menuData.price);
    const category = MenuCategory.fromString(menuData.category || 'main');
    const imagePath = menuData.image;
    const preparationTime = menuData.preparationTime || 10;

    const menuItem = new MenuItem(
      id,
      name,
      description,
      price,
      category,
      imagePath,
      preparationTime
    );

    // Agregar información nutricional si está disponible
    if (menuData.nutritionalInfo) {
      menuItem.setNutritionalInfo(menuData.nutritionalInfo);
    }

    // Agregar alérgenos si están disponibles
    if (menuData.allergens) {
      menuItem.setAllergens(menuData.allergens);
    }

    return menuItem;
  }

  /**
   * 💰 PATRÓN: Price Management Pattern
   * Actualizar precio con validaciones de negocio
   */
  public updatePrice(newPrice: Price): void {
    if (!newPrice.isPositive()) {
      throw new Error('Menu item price must be positive');
    }

    if (newPrice.isGreaterThan(Price.fromDollars(999.99))) {
      throw new Error('Menu item price cannot exceed $999.99');
    }

    this._price = newPrice;
    this.updateTimestamp();
  }

  /**
   * 📝 PATRÓN: Information Update Pattern
   * Actualizar información del item
   */
  public updateInfo(name?: string, description?: string): void {
    if (name && name.trim().length > 0) {
      this._name = name.trim();
    }

    if (description !== undefined) {
      this._description = description.trim();
    }

    this.updateTimestamp();
  }

  /**
   * 🖼️ PATRÓN: Asset Management Pattern
   * Actualizar imagen del item
   */
  public updateImage(imagePath: string): void {
    if (!imagePath || imagePath.trim().length === 0) {
      throw new Error('Image path cannot be empty');
    }

    this._imagePath = imagePath.trim();
    this.updateTimestamp();
  }

  /**
   * ⏱️ PATRÓN: Service Time Management Pattern
   * Actualizar tiempo de preparación
   */
  public updatePreparationTime(minutes: number): void {
    if (minutes < 1 || minutes > 60) {
      throw new Error('Preparation time must be between 1 and 60 minutes');
    }

    this._preparationTime = minutes;
    this.updateTimestamp();
  }

  /**
   * 🔄 PATRÓN: Availability Management Pattern
   * Cambiar disponibilidad del item
   */
  public setAvailability(isAvailable: boolean): void {
    this._isAvailable = isAvailable;
    this.updateTimestamp();
  }

  /**
   * 📊 PATRÓN: Nutritional Information Pattern
   * Establecer información nutricional
   */
  public setNutritionalInfo(info: NutritionalInfo): void {
    this._nutritionalInfo = { ...info };
    this.updateTimestamp();
  }

  /**
   * 🚨 PATRÓN: Allergen Management Pattern
   * Establecer lista de alérgenos
   */
  public setAllergens(allergens: string[]): void {
    this._allergens = [...allergens];
    this.updateTimestamp();
  }

  /**
   * 🎯 PATRÓN: Search and Filter Pattern
   * Verificar si el item coincide con términos de búsqueda
   */
  public matchesSearch(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return (
      this._name.toLowerCase().includes(term) ||
      this._description.toLowerCase().includes(term) ||
      this._category.getValue().toLowerCase().includes(term)
    );
  }

  /**
   * 🏷️ PATRÓN: Tag System Pattern
   * Verificar si contiene un alérgeno específico
   */
  public hasAllergen(allergen: string): boolean {
    return this._allergens.some(a => 
      a.toLowerCase() === allergen.toLowerCase()
    );
  }

  /**
   * 💡 PATRÓN: Recommendation Pattern
   * Verificar si es recomendado (basado en criterios simples)
   */
  public isRecommended(): boolean {
    // Lógica simple: items populares con buen tiempo de preparación
    return this._isAvailable && 
           this._preparationTime <= 15 && 
           this._price.isLessThan(Price.fromDollars(20));
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener información para mostrar en UI
   */
  public getDisplayInfo(): MenuItemDisplayInfo {
    return {
      id: this.id.toString(),
      name: this._name,
      description: this._description,
      price: this._price.toUSDString(),
      priceValue: this._price.getValue(),
      category: this._category.getDisplayName(),
      imagePath: this._imagePath,
      isAvailable: this._isAvailable,
      preparationTime: this._preparationTime,
      hasAllergens: this._allergens.length > 0,
      allergens: [...this._allergens],
      isRecommended: this.isRecommended()
    };
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Validación específica de MenuItem
   */
  protected validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Menu item name is required');
    }

    if (this._name.length > 100) {
      throw new Error('Menu item name cannot exceed 100 characters');
    }

    if (this._description.length > 500) {
      throw new Error('Menu item description cannot exceed 500 characters');
    }

    if (!this._price.isPositive()) {
      throw new Error('Menu item price must be positive');
    }

    if (!this._imagePath || this._imagePath.trim().length === 0) {
      throw new Error('Menu item image path is required');
    }

    if (this._preparationTime < 1 || this._preparationTime > 60) {
      throw new Error('Preparation time must be between 1 and 60 minutes');
    }
  }

  // Getters públicos (solo lectura)
  public getName(): string {
    return this._name;
  }

  public getDescription(): string {
    return this._description;
  }

  public getPrice(): Price {
    return this._price;
  }

  public getCategory(): MenuCategory {
    return this._category;
  }

  public getImagePath(): string {
    return this._imagePath;
  }

  public isAvailable(): boolean {
    return this._isAvailable;
  }

  public getPreparationTime(): number {
    return this._preparationTime;
  }

  public getNutritionalInfo(): NutritionalInfo | undefined {
    return this._nutritionalInfo ? { ...this._nutritionalInfo } : undefined;
  }

  public getAllergens(): readonly string[] {
    return [...this._allergens];
  }
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Información para mostrar en UI
 */
export interface MenuItemDisplayInfo {
  id: string;
  name: string;
  description: string;
  price: string;
  priceValue: number;
  category: string;
  imagePath: string;
  isAvailable: boolean;
  preparationTime: number;
  hasAllergens: boolean;
  allergens: string[];
  isRecommended: boolean;
}

/**
 * 📊 PATRÓN: Nutritional Information Pattern
 * Información nutricional del item
 */
export interface NutritionalInfo {
  calories: number;
  protein: number;    // gramos
  carbs: number;      // gramos
  fat: number;        // gramos
  fiber?: number;     // gramos
  sodium?: number;    // miligramos
  sugar?: number;     // gramos
}

/**
 * 🔄 PATRÓN: Legacy Data Adapter Pattern
 * Estructura de datos del menú original
 */
export interface OriginalMenuData {
  name: string;
  price: number;
  description?: string;
  image: string;
  category?: string;
  preparationTime?: number;
  nutritionalInfo?: NutritionalInfo;
  allergens?: string[];
}
