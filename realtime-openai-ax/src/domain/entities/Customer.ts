/**
 * 🏗️ PATRÓN: Entity Pattern (DDD)
 * 🎯 PRINCIPIO: Single Responsibility + Data Integrity + Privacy
 * 
 * Customer - Entidad cliente con información personal y preferencias
 * Maneja datos de contacto, direcciones y historial de pedidos
 */

import { BaseEntity } from './BaseEntity';
import { CustomerId } from '../valueObjects/CustomerId';
import { DeliveryAddress } from '../valueObjects/DeliveryAddress';
import { PhoneNumber } from '../valueObjects/PhoneNumber';
import { Email } from '../valueObjects/Email';

/**
 * 👤 PATRÓN: Customer Profile Pattern
 * Customer encapsula toda la información del cliente
 */
export class Customer extends BaseEntity<CustomerId> {
  private _firstName: string;
  private _lastName: string;
  private _email: Email;
  private _phoneNumber: PhoneNumber;
  private _preferredAddress?: DeliveryAddress;
  private _alternativeAddresses: DeliveryAddress[];
  private _preferences: CustomerPreferences;
  private _isActive: boolean;
  private _totalOrders: number;
  private _totalSpent: number;
  private _loyaltyPoints: number;

  constructor(
    id: CustomerId,
    firstName: string,
    lastName: string,
    email: Email,
    phoneNumber: PhoneNumber
  ) {
    super(id);
    
    this._firstName = firstName;
    this._lastName = lastName;
    this._email = email;
    this._phoneNumber = phoneNumber;
    this._alternativeAddresses = [];
    this._preferences = this.createDefaultPreferences();
    this._isActive = true;
    this._totalOrders = 0;
    this._totalSpent = 0;
    this._loyaltyPoints = 0;
    
    this.validate();
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cliente desde datos de registro
   */
  public static createFromRegistration(
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string
  ): Customer {
    const id = CustomerId.generate();
    const emailVO = Email.fromString(email);
    const phoneVO = PhoneNumber.fromString(phoneNumber);
    
    return new Customer(id, firstName, lastName, emailVO, phoneVO);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear cliente invitado (sin registro completo)
   */
  public static createGuest(phoneNumber: string): Customer {
    const id = CustomerId.generate();
    const phoneVO = PhoneNumber.fromString(phoneNumber);
    const guestEmail = Email.fromString(`guest-${Date.now()}@temp.com`);
    
    const customer = new Customer(id, 'Guest', 'User', guestEmail, phoneVO);
    customer._preferences.isGuest = true;
    
    return customer;
  }

  /**
   * 📝 PATRÓN: Information Update Pattern
   * Actualizar información personal
   */
  public updatePersonalInfo(
    firstName?: string,
    lastName?: string,
    email?: string,
    phoneNumber?: string
  ): void {
    if (firstName && firstName.trim().length > 0) {
      this._firstName = firstName.trim();
    }

    if (lastName && lastName.trim().length > 0) {
      this._lastName = lastName.trim();
    }

    if (email) {
      this._email = Email.fromString(email);
    }

    if (phoneNumber) {
      this._phoneNumber = PhoneNumber.fromString(phoneNumber);
    }

    this.updateTimestamp();
  }

  /**
   * 📍 PATRÓN: Address Management Pattern
   * Establecer dirección preferida
   */
  public setPreferredAddress(address: DeliveryAddress): void {
    this._preferredAddress = address;
    this.updateTimestamp();
  }

  /**
   * 📍 PATRÓN: Address Management Pattern
   * Agregar dirección alternativa
   */
  public addAlternativeAddress(address: DeliveryAddress): void {
    // Evitar duplicados
    const exists = this._alternativeAddresses.some(addr => 
      addr.equals(address)
    );

    if (!exists) {
      this._alternativeAddresses.push(address);
      this.updateTimestamp();
    }
  }

  /**
   * 📍 PATRÓN: Address Management Pattern
   * Remover dirección alternativa
   */
  public removeAlternativeAddress(address: DeliveryAddress): void {
    const index = this._alternativeAddresses.findIndex(addr => 
      addr.equals(address)
    );

    if (index !== -1) {
      this._alternativeAddresses.splice(index, 1);
      this.updateTimestamp();
    }
  }

  /**
   * ⚙️ PATRÓN: Preferences Management Pattern
   * Actualizar preferencias del cliente
   */
  public updatePreferences(preferences: Partial<CustomerPreferences>): void {
    this._preferences = {
      ...this._preferences,
      ...preferences
    };
    this.updateTimestamp();
  }

  /**
   * 📊 PATRÓN: Order History Pattern
   * Registrar nuevo pedido completado
   */
  public recordCompletedOrder(orderTotal: number): void {
    this._totalOrders += 1;
    this._totalSpent += orderTotal;
    
    // Calcular puntos de lealtad (1 punto por cada $1)
    const newPoints = Math.floor(orderTotal);
    this._loyaltyPoints += newPoints;
    
    this.updateTimestamp();
  }

  /**
   * 🎁 PATRÓN: Loyalty Program Pattern
   * Redimir puntos de lealtad
   */
  public redeemLoyaltyPoints(points: number): boolean {
    if (points <= 0 || points > this._loyaltyPoints) {
      return false;
    }

    this._loyaltyPoints -= points;
    this.updateTimestamp();
    return true;
  }

  /**
   * 🔄 PATRÓN: Account Management Pattern
   * Activar/desactivar cuenta
   */
  public setActiveStatus(isActive: boolean): void {
    this._isActive = isActive;
    this.updateTimestamp();
  }

  /**
   * 🏆 PATRÓN: Customer Segmentation Pattern
   * Obtener nivel de cliente basado en gastos
   */
  public getCustomerTier(): CustomerTier {
    if (this._totalSpent >= 1000) {
      return 'PLATINUM';
    } else if (this._totalSpent >= 500) {
      return 'GOLD';
    } else if (this._totalSpent >= 100) {
      return 'SILVER';
    } else {
      return 'BRONZE';
    }
  }

  /**
   * 💰 PATRÓN: Discount Calculation Pattern
   * Calcular descuento basado en nivel de cliente
   */
  public getDiscountPercentage(): number {
    const tier = this.getCustomerTier();
    const discounts: Record<CustomerTier, number> = {
      'BRONZE': 0,
      'SILVER': 5,
      'GOLD': 10,
      'PLATINUM': 15
    };
    
    return discounts[tier];
  }

  /**
   * 📊 PATRÓN: Analytics Pattern
   * Obtener estadísticas del cliente
   */
  public getCustomerStats(): CustomerStats {
    return {
      totalOrders: this._totalOrders,
      totalSpent: this._totalSpent,
      averageOrderValue: this._totalOrders > 0 ? this._totalSpent / this._totalOrders : 0,
      loyaltyPoints: this._loyaltyPoints,
      customerTier: this.getCustomerTier(),
      discountPercentage: this.getDiscountPercentage(),
      isActive: this._isActive,
      isGuest: this._preferences.isGuest,
      memberSince: this.createdAt
    };
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener información para mostrar en UI
   */
  public getDisplayInfo(): CustomerDisplayInfo {
    return {
      id: this.id.toString(),
      fullName: this.getFullName(),
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email.getValue(),
      phoneNumber: this._phoneNumber.getFormatted(),
      preferredAddress: this._preferredAddress?.toDisplayString(),
      customerTier: this.getCustomerTier(),
      loyaltyPoints: this._loyaltyPoints,
      totalOrders: this._totalOrders,
      isActive: this._isActive,
      isGuest: this._preferences.isGuest
    };
  }

  /**
   * 🎯 PATRÓN: Name Formatting Pattern
   * Obtener nombre completo
   */
  public getFullName(): string {
    return `${this._firstName} ${this._lastName}`.trim();
  }

  /**
   * 📞 PATRÓN: Contact Validation Pattern
   * Verificar si tiene información de contacto completa
   */
  public hasCompleteContactInfo(): boolean {
    return Boolean(
      this._firstName &&
      this._lastName &&
      this._email &&
      this._phoneNumber &&
      !this._preferences.isGuest
    );
  }

  /**
   * 📍 PATRÓN: Address Validation Pattern
   * Verificar si tiene dirección de entrega
   */
  public hasDeliveryAddress(): boolean {
    return Boolean(this._preferredAddress);
  }

  /**
   * 🏆 PATRÓN: VIP Status Pattern
   * Verificar si es cliente VIP
   */
  public isVIP(): boolean {
    const tier = this.getCustomerTier();
    return tier === 'GOLD' || tier === 'PLATINUM';
  }

  /**
   * 🎯 PATRÓN: Default Configuration Pattern
   * Crear preferencias por defecto
   */
  private createDefaultPreferences(): CustomerPreferences {
    return {
      isGuest: false,
      emailNotifications: true,
      smsNotifications: true,
      marketingEmails: false,
      preferredContactMethod: 'email',
      dietaryRestrictions: [],
      favoriteItems: [],
      defaultTipPercentage: 15
    };
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Validación específica de Customer
   */
  protected validate(): void {
    if (!this._firstName || this._firstName.trim().length === 0) {
      throw new Error('Customer first name is required');
    }

    if (!this._lastName || this._lastName.trim().length === 0) {
      throw new Error('Customer last name is required');
    }

    if (this._firstName.length > 50) {
      throw new Error('First name cannot exceed 50 characters');
    }

    if (this._lastName.length > 50) {
      throw new Error('Last name cannot exceed 50 characters');
    }

    if (this._totalOrders < 0) {
      throw new Error('Total orders cannot be negative');
    }

    if (this._totalSpent < 0) {
      throw new Error('Total spent cannot be negative');
    }

    if (this._loyaltyPoints < 0) {
      throw new Error('Loyalty points cannot be negative');
    }
  }

  // Getters públicos (solo lectura)
  public getFirstName(): string {
    return this._firstName;
  }

  public getLastName(): string {
    return this._lastName;
  }

  public getEmail(): Email {
    return this._email;
  }

  public getPhoneNumber(): PhoneNumber {
    return this._phoneNumber;
  }

  public getPreferredAddress(): DeliveryAddress | undefined {
    return this._preferredAddress;
  }

  public getAlternativeAddresses(): readonly DeliveryAddress[] {
    return [...this._alternativeAddresses];
  }

  public getPreferences(): CustomerPreferences {
    return { ...this._preferences };
  }

  public isActive(): boolean {
    return this._isActive;
  }

  public getTotalOrders(): number {
    return this._totalOrders;
  }

  public getTotalSpent(): number {
    return this._totalSpent;
  }

  public getLoyaltyPoints(): number {
    return this._loyaltyPoints;
  }
}

/**
 * 🎯 PATRÓN: Data Transfer Object
 * Información para mostrar en UI
 */
export interface CustomerDisplayInfo {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  preferredAddress?: string;
  customerTier: CustomerTier;
  loyaltyPoints: number;
  totalOrders: number;
  isActive: boolean;
  isGuest: boolean;
}

/**
 * 📊 PATRÓN: Statistics Pattern
 * Estadísticas del cliente
 */
export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  loyaltyPoints: number;
  customerTier: CustomerTier;
  discountPercentage: number;
  isActive: boolean;
  isGuest: boolean;
  memberSince: Date;
}

/**
 * ⚙️ PATRÓN: Preferences Pattern
 * Preferencias del cliente
 */
export interface CustomerPreferences {
  isGuest: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  preferredContactMethod: 'email' | 'sms' | 'phone';
  dietaryRestrictions: string[];
  favoriteItems: string[];
  defaultTipPercentage: number;
}

/**
 * 🏆 PATRÓN: Tier System Pattern
 * Niveles de cliente
 */
export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
