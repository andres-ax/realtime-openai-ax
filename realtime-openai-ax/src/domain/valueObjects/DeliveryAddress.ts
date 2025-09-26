/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Validation + Encapsulation
 * 
 * DeliveryAddress - Dirección de entrega con validaciones
 * Encapsula datos de dirección con formato y validación
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 📍 PATRÓN: Composite Value Object Pattern
 * DeliveryAddress agrupa múltiples campos relacionados con dirección
 */
export interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  additionalInfo?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * 🏠 PATRÓN: Address Pattern
 * DeliveryAddress maneja direcciones de entrega con validación completa
 */
export class DeliveryAddress extends BaseValueObject<AddressData> {

  constructor(addressData: AddressData) {
    super(addressData);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear dirección desde componentes individuales
   */
  public static create(
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string = 'US',
    additionalInfo?: string
  ): DeliveryAddress {
    return new DeliveryAddress({
      street,
      city,
      state,
      zipCode,
      country,
      additionalInfo
    });
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear dirección con coordenadas GPS
   */
  public static createWithCoordinates(
    street: string,
    city: string,
    state: string,
    zipCode: string,
    latitude: number,
    longitude: number,
    country: string = 'US',
    additionalInfo?: string
  ): DeliveryAddress {
    return new DeliveryAddress({
      street,
      city,
      state,
      zipCode,
      country,
      additionalInfo,
      coordinates: { latitude, longitude }
    });
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string de dirección completa (parsing básico)
   */
  public static fromString(addressString: string): DeliveryAddress {
    // Parsing básico - en producción usaríamos una API de geocoding
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length < 3) {
      throw new Error('Address string must contain at least street, city, and state');
    }

    return new DeliveryAddress({
      street: parts[0],
      city: parts[1],
      state: parts[2],
      zipCode: parts[3] || '',
      country: parts[4] || 'US'
    });
  }

  /**
   * 📍 PATRÓN: Coordinate Management Pattern
   * Agregar coordenadas GPS a la dirección
   */
  public withCoordinates(latitude: number, longitude: number): DeliveryAddress {
    return new DeliveryAddress({
      ...this._value,
      coordinates: { latitude, longitude }
    });
  }

  /**
   * 📝 PATRÓN: Information Enhancement Pattern
   * Agregar información adicional
   */
  public withAdditionalInfo(info: string): DeliveryAddress {
    return new DeliveryAddress({
      ...this._value,
      additionalInfo: info
    });
  }

  /**
   * 🎯 PATRÓN: Formatting Pattern
   * Obtener dirección formateada para mostrar
   */
  public toDisplayString(): string {
    const { street, city, state, zipCode, country, additionalInfo } = this._value;
    
    let address = `${street}, ${city}, ${state} ${zipCode}`;
    
    if (country !== 'US') {
      address += `, ${country}`;
    }
    
    if (additionalInfo) {
      address += ` (${additionalInfo})`;
    }
    
    return address;
  }

  /**
   * 🎯 PATRÓN: Formatting Pattern
   * Obtener dirección formateada para envío
   */
  public toShippingFormat(): string {
    const { street, city, state, zipCode, country } = this._value;
    
    return [
      street,
      `${city}, ${state} ${zipCode}`,
      country
    ].join('\n');
  }

  /**
   * 🗺️ PATRÓN: Geographic Pattern
   * Obtener URL para Google Maps
   */
  public toGoogleMapsUrl(): string {
    if (this._value.coordinates) {
      const { latitude, longitude } = this._value.coordinates;
      return `https://www.google.com/maps?q=${latitude},${longitude}`;
    }
    
    const encodedAddress = encodeURIComponent(this.toDisplayString());
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  /**
   * 📊 PATRÓN: Query Methods Pattern
   * Métodos de consulta para propiedades específicas
   */
  public hasCoordinates(): boolean {
    return Boolean(this._value.coordinates);
  }

  public hasAdditionalInfo(): boolean {
    return Boolean(this._value.additionalInfo);
  }

  public isInternational(): boolean {
    return this._value.country !== 'US';
  }

  public isComplete(): boolean {
    const { street, city, state, zipCode } = this._value;
    return Boolean(street && city && state && zipCode);
  }

  /**
   * 📏 PATRÓN: Distance Calculation Pattern
   * Calcular distancia a otra dirección (si ambas tienen coordenadas)
   */
  public distanceTo(other: DeliveryAddress): number | null {
    if (!this.hasCoordinates() || !other.hasCoordinates()) {
      return null;
    }

    const thisCoords = this._value.coordinates!;
    const otherCoords = other._value.coordinates!;

    return this.calculateHaversineDistance(
      thisCoords.latitude,
      thisCoords.longitude,
      otherCoords.latitude,
      otherCoords.longitude
    );
  }

  /**
   * 🧮 PATRÓN: Geographic Calculation Pattern
   * Calcular distancia usando fórmula de Haversine
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar datos de dirección
   */
  protected validate(value: AddressData): void {
    const { street, city, state, zipCode, country, coordinates } = value;

    // Validar campos requeridos
    if (!street || street.trim().length === 0) {
      throw new Error('Street address is required');
    }

    if (!city || city.trim().length === 0) {
      throw new Error('City is required');
    }

    if (!state || state.trim().length === 0) {
      throw new Error('State is required');
    }

    if (!zipCode || zipCode.trim().length === 0) {
      throw new Error('ZIP code is required');
    }

    if (!country || country.trim().length === 0) {
      throw new Error('Country is required');
    }

    // Validar longitudes
    if (street.length > 100) {
      throw new Error('Street address cannot exceed 100 characters');
    }

    if (city.length > 50) {
      throw new Error('City cannot exceed 50 characters');
    }

    if (state.length > 20) {
      throw new Error('State cannot exceed 20 characters');
    }

    // Validar ZIP code básico
    if (country === 'US') {
      const zipPattern = /^\d{5}(-\d{4})?$/;
      if (!zipPattern.test(zipCode)) {
        throw new Error('Invalid US ZIP code format');
      }
    }

    // Validar coordenadas si están presentes
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
    }
  }

  // Getters públicos (solo lectura)
  public getStreet(): string {
    return this._value.street;
  }

  public getCity(): string {
    return this._value.city;
  }

  public getState(): string {
    return this._value.state;
  }

  public getZipCode(): string {
    return this._value.zipCode;
  }

  public getCountry(): string {
    return this._value.country;
  }

  public getAdditionalInfo(): string | undefined {
    return this._value.additionalInfo;
  }

  public getCoordinates(): { latitude: number; longitude: number } | undefined {
    return this._value.coordinates;
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this.toDisplayString();
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): AddressData {
    return { ...this._value };
  }
}
