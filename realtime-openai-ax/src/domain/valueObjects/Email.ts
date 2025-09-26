/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Validation + Security
 * 
 * Email - Dirección de correo electrónico con validación
 * Maneja validación, normalización y seguridad
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 📧 PATRÓN: Email Pattern
 * Email encapsula lógica de direcciones de correo electrónico
 */
export class Email extends BaseValueObject<string> {
  private readonly _localPart: string;
  private readonly _domain: string;

  constructor(value: string) {
    const normalizedValue = Email.normalizeEmail(value);
    super(normalizedValue);
    
    const parsed = Email.parseEmail(normalizedValue);
    this._localPart = parsed.localPart;
    this._domain = parsed.domain;
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con validación
   */
  public static fromString(email: string): Email {
    return new Email(email);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear email temporal para invitados
   */
  public static createTemporary(identifier?: string): Email {
    const id = identifier || Date.now().toString();
    return new Email(`temp-${id}@guest.local`);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear email de sistema
   */
  public static createSystem(purpose: string): Email {
    const validPurposes = ['noreply', 'support', 'admin', 'notifications'];
    if (!validPurposes.includes(purpose)) {
      throw new Error('Invalid system email purpose');
    }
    return new Email(`${purpose}@system.local`);
  }

  /**
   * 📊 PATRÓN: Domain Analysis Pattern
   * Verificar si es email corporativo
   */
  public isCorporate(): boolean {
    const corporateDomains = [
      'company.com', 'business.com', 'corp.com', 'enterprise.com',
      'office.com', 'work.com', 'professional.com'
    ];
    
    return corporateDomains.some(domain => 
      this._domain.toLowerCase().includes(domain)
    );
  }

  /**
   * 📊 PATRÓN: Domain Analysis Pattern
   * Verificar si es email temporal/desechable
   */
  public isTemporary(): boolean {
    const temporaryDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'temp-mail.org', 'throwaway.email',
      'guest.local', 'temp.local', 'system.local'
    ];
    
    return temporaryDomains.some(domain => 
      this._domain.toLowerCase().includes(domain)
    );
  }

  /**
   * 📊 PATRÓN: Provider Detection Pattern
   * Obtener proveedor de email
   */
  public getProvider(): EmailProvider {
    const domain = this._domain.toLowerCase();
    
    if (domain.includes('gmail')) return 'GMAIL';
    if (domain.includes('yahoo')) return 'YAHOO';
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'OUTLOOK';
    if (domain.includes('apple') || domain.includes('icloud')) return 'APPLE';
    if (domain.includes('protonmail')) return 'PROTON';
    if (this.isCorporate()) return 'CORPORATE';
    if (this.isTemporary()) return 'TEMPORARY';
    
    return 'OTHER';
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener versión ofuscada para mostrar
   */
  public getObfuscated(): string {
    const localLength = this._localPart.length;
    if (localLength <= 2) {
      return `${this._localPart[0]}***@${this._domain}`;
    }
    
    const visibleChars = Math.max(1, Math.floor(localLength / 3));
    const start = this._localPart.substring(0, visibleChars);
    const end = this._localPart.substring(localLength - visibleChars);
    
    return `${start}***${end}@${this._domain}`;
  }

  /**
   * 🎨 PATRÓN: Display Pattern
   * Obtener versión parcialmente oculta
   */
  public getMasked(): string {
    const domainParts = this._domain.split('.');
    const maskedDomain = domainParts.length > 1 
      ? `***${domainParts[domainParts.length - 1]}`
      : '***';
    
    return `${this._localPart.substring(0, 2)}***@${maskedDomain}`;
  }

  /**
   * 🔗 PATRÓN: Link Generation Pattern
   * Generar enlace mailto
   */
  public getMailtoLink(subject?: string, body?: string): string {
    let mailto = `mailto:${this._value}`;
    const params: string[] = [];
    
    if (subject) {
      params.push(`subject=${encodeURIComponent(subject)}`);
    }
    
    if (body) {
      params.push(`body=${encodeURIComponent(body)}`);
    }
    
    if (params.length > 0) {
      mailto += `?${params.join('&')}`;
    }
    
    return mailto;
  }

  /**
   * 🔍 PATRÓN: Hash Generation Pattern
   * Generar hash para Gravatar
   */
  public getGravatarHash(): string {
    // Implementación simple de hash MD5 (en producción usar librería crypto)
    return this.simpleHash(this._value.toLowerCase().trim());
  }

  /**
   * 🖼️ PATRÓN: Avatar Pattern
   * Obtener URL de Gravatar
   */
  public getGravatarUrl(size: number = 80, defaultImage: string = 'identicon'): string {
    const hash = this.getGravatarHash();
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
  }

  /**
   * 📊 PATRÓN: Security Analysis Pattern
   * Verificar si el dominio es seguro
   */
  public isSecureDomain(): boolean {
    const secureDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'icloud.com', 'protonmail.com', 'company.com'
    ];
    
    return secureDomains.includes(this._domain.toLowerCase());
  }

  /**
   * 🔧 PATRÓN: Normalization Pattern
   * Normalizar email (lowercase, trim)
   */
  private static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * 🔧 PATRÓN: Parser Pattern
   * Parsear email en componentes
   */
  private static parseEmail(email: string): ParsedEmail {
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
      throw new Error('Invalid email format: missing @');
    }
    
    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    
    if (localPart.length === 0) {
      throw new Error('Invalid email format: empty local part');
    }
    
    if (domain.length === 0) {
      throw new Error('Invalid email format: empty domain');
    }
    
    return { localPart, domain };
  }

  /**
   * 🔧 PATRÓN: Simple Hash Pattern
   * Hash simple para Gravatar (implementación básica)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar formato de email
   */
  protected validate(value: string): void {
    if (!value || value.length === 0) {
      throw new Error('Email cannot be empty');
    }

    // Validación básica de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }

    // Validar longitud
    if (value.length > 254) {
      throw new Error('Email address is too long');
    }

    // Validar partes del email
    const atIndex = value.lastIndexOf('@');
    const localPart = value.substring(0, atIndex);
    const domain = value.substring(atIndex + 1);

    // Validar parte local
    if (localPart.length > 64) {
      throw new Error('Email local part is too long');
    }

    // Validar dominio
    if (domain.length > 253) {
      throw new Error('Email domain is too long');
    }

    // Validar caracteres especiales
    if (localPart.includes('..') || localPart.startsWith('.') || localPart.endsWith('.')) {
      throw new Error('Invalid email format: invalid dot usage');
    }

    // Validar dominio tiene al menos un punto
    if (!domain.includes('.')) {
      throw new Error('Invalid email format: domain must contain a dot');
    }
  }

  // Getters públicos
  public getLocalPart(): string {
    return this._localPart;
  }

  public getDomain(): string {
    return this._domain;
  }

  public getValue(): string {
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

/**
 * 📊 PATRÓN: Data Structure Pattern
 * Estructura de email parseado
 */
interface ParsedEmail {
  localPart: string;
  domain: string;
}

/**
 * 📊 PATRÓN: Enum Pattern
 * Proveedores de email
 */
export type EmailProvider = 
  | 'GMAIL' 
  | 'YAHOO' 
  | 'OUTLOOK' 
  | 'APPLE' 
  | 'PROTON' 
  | 'CORPORATE' 
  | 'TEMPORARY' 
  | 'OTHER';
