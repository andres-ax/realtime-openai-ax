/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Validation + Formatting
 * 
 * PhoneNumber - Número de teléfono con validación y formato
 * Maneja diferentes formatos internacionales y validaciones
 */

import { BaseValueObject } from './BaseValueObject';

/**
 * 📞 PATRÓN: Phone Number Pattern
 * PhoneNumber encapsula lógica de números telefónicos
 */
export class PhoneNumber extends BaseValueObject<string> {
  private readonly _countryCode: string;
  private readonly _areaCode: string;
  private readonly _number: string;
  private readonly _extension?: string;

  constructor(value: string, countryCode: string = '+1') {
    const cleanValue = PhoneNumber.cleanPhoneNumber(value);
    super(cleanValue);
    
    const parsed = PhoneNumber.parsePhoneNumber(cleanValue, countryCode);
    this._countryCode = parsed.countryCode;
    this._areaCode = parsed.areaCode;
    this._number = parsed.number;
    this._extension = parsed.extension;
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear desde string con detección automática de formato
   */
  public static fromString(phoneNumber: string, countryCode: string = '+1'): PhoneNumber {
    return new PhoneNumber(phoneNumber, countryCode);
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear número US estándar
   */
  public static createUS(areaCode: string, number: string, extension?: string): PhoneNumber {
    let fullNumber = `${areaCode}${number}`;
    if (extension) {
      fullNumber += `x${extension}`;
    }
    return new PhoneNumber(fullNumber, '+1');
  }

  /**
   * 🏭 PATRÓN: Factory Method Pattern
   * Crear número internacional
   */
  public static createInternational(
    countryCode: string,
    areaCode: string,
    number: string
  ): PhoneNumber {
    const fullNumber = `${areaCode}${number}`;
    return new PhoneNumber(fullNumber, countryCode);
  }

  /**
   * 🎨 PATRÓN: Formatting Pattern
   * Formatear para mostrar (US format)
   */
  public getFormatted(): string {
    if (this._countryCode === '+1' && this._number.length === 7) {
      // Formato US: (555) 123-4567
      return `(${this._areaCode}) ${this._number.substring(0, 3)}-${this._number.substring(3)}`;
    } else if (this._countryCode === '+1' && this._number.length === 10) {
      // Formato US completo: (555) 123-4567
      const area = this._number.substring(0, 3);
      const first = this._number.substring(3, 6);
      const last = this._number.substring(6);
      return `(${area}) ${first}-${last}`;
    } else {
      // Formato internacional: +1 555 123 4567
      return `${this._countryCode} ${this._areaCode} ${this._number}`;
    }
  }

  /**
   * 🎨 PATRÓN: Formatting Pattern
   * Formatear para enlaces tel:
   */
  public getTelLink(): string {
    let telNumber = `${this._countryCode}${this._areaCode}${this._number}`;
    if (this._extension) {
      telNumber += `,${this._extension}`;
    }
    return `tel:${telNumber}`;
  }

  /**
   * 🎨 PATRÓN: Formatting Pattern
   * Formatear para SMS
   */
  public getSMSLink(message?: string): string {
    const smsNumber = `${this._countryCode}${this._areaCode}${this._number}`;
    if (message) {
      return `sms:${smsNumber}?body=${encodeURIComponent(message)}`;
    }
    return `sms:${smsNumber}`;
  }

  /**
   * 🌍 PATRÓN: International Format Pattern
   * Formatear en formato internacional estándar
   */
  public getInternationalFormat(): string {
    return `${this._countryCode} ${this._areaCode} ${this._number}`;
  }

  /**
   * 🔢 PATRÓN: Numeric Format Pattern
   * Obtener solo números (para APIs)
   */
  public getNumericOnly(): string {
    return `${this._countryCode.replace('+', '')}${this._areaCode}${this._number}`;
  }

  /**
   * 📊 PATRÓN: Validation Pattern
   * Verificar si es número móvil US
   */
  public isMobile(): boolean {
    if (this._countryCode !== '+1') {
      return false; // Solo validamos US por simplicidad
    }

    // Códigos de área móviles comunes en US
    const mobileAreaCodes = [
      '201', '202', '203', '205', '206', '207', '208', '209', '210',
      '212', '213', '214', '215', '216', '217', '218', '219', '224',
      '225', '228', '229', '231', '234', '239', '240', '248', '251',
      '252', '253', '254', '256', '260', '262', '267', '269', '270',
      '276', '281', '301', '302', '303', '304', '305', '307', '308',
      '309', '310', '312', '313', '314', '315', '316', '317', '318',
      '319', '320', '321', '323', '325', '330', '331', '334', '336',
      '337', '339', '347', '351', '352', '360', '361', '386', '401',
      '402', '404', '405', '406', '407', '408', '409', '410', '412',
      '413', '414', '415', '417', '419', '423', '424', '425', '430',
      '432', '434', '435', '440', '443', '469', '470', '475', '478',
      '479', '480', '484', '501', '502', '503', '504', '505', '507',
      '508', '509', '510', '512', '513', '515', '516', '517', '518',
      '520', '530', '540', '541', '551', '559', '561', '562', '563',
      '567', '570', '571', '573', '574', '575', '580', '585', '586',
      '601', '602', '603', '605', '606', '607', '608', '609', '610',
      '612', '614', '615', '616', '617', '618', '619', '620', '623',
      '626', '630', '631', '636', '641', '646', '650', '651', '660',
      '661', '662', '667', '678', '682', '701', '702', '703', '704',
      '706', '707', '708', '712', '713', '714', '715', '716', '717',
      '718', '719', '720', '724', '727', '731', '732', '734', '737',
      '740', '747', '754', '757', '760', '763', '765', '770', '772',
      '773', '774', '775', '781', '785', '786', '801', '802', '803',
      '804', '805', '806', '808', '810', '812', '813', '814', '815',
      '816', '817', '818', '828', '830', '831', '832', '843', '845',
      '847', '848', '850', '856', '857', '858', '859', '860', '862',
      '863', '864', '865', '870', '872', '878', '901', '903', '904',
      '906', '907', '908', '909', '910', '912', '913', '914', '915',
      '916', '917', '918', '919', '920', '925', '928', '929', '931',
      '936', '937', '940', '941', '947', '949', '951', '952', '954',
      '956', '959', '970', '971', '972', '973', '978', '979', '980',
      '985', '989'
    ];

    return mobileAreaCodes.includes(this._areaCode);
  }

  /**
   * 📊 PATRÓN: Regional Validation Pattern
   * Verificar si es número US
   */
  public isUS(): boolean {
    return this._countryCode === '+1';
  }

  /**
   * 📊 PATRÓN: Extension Detection Pattern
   * Verificar si tiene extensión
   */
  public hasExtension(): boolean {
    return Boolean(this._extension);
  }

  /**
   * 🔧 PATRÓN: Utility Method Pattern
   * Limpiar número de teléfono de caracteres especiales
   */
  private static cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[^\d+x]/g, '');
  }

  /**
   * 🔧 PATRÓN: Parser Pattern
   * Parsear número de teléfono en componentes
   */
  private static parsePhoneNumber(
    cleanNumber: string,
    countryCode: string
  ): ParsedPhoneNumber {
    // Extraer extensión si existe
    const extensionMatch = cleanNumber.match(/x(\d+)$/);
    const extension = extensionMatch ? extensionMatch[1] : undefined;
    const numberWithoutExtension = cleanNumber.replace(/x\d+$/, '');

    // Remover código de país si está presente
    let workingNumber = numberWithoutExtension;
    if (workingNumber.startsWith(countryCode.replace('+', ''))) {
      workingNumber = workingNumber.substring(countryCode.length - 1);
    } else if (workingNumber.startsWith(countryCode)) {
      workingNumber = workingNumber.substring(countryCode.length);
    }

    // Para números US (10 dígitos)
    if (countryCode === '+1' && workingNumber.length === 10) {
      return {
        countryCode,
        areaCode: workingNumber.substring(0, 3),
        number: workingNumber.substring(3),
        extension
      };
    }

    // Para números US (7 dígitos, asumimos área local)
    if (countryCode === '+1' && workingNumber.length === 7) {
      return {
        countryCode,
        areaCode: '555', // Área por defecto
        number: workingNumber,
        extension
      };
    }

    // Para otros formatos, dividir en área y número
    if (workingNumber.length >= 7) {
      const areaLength = Math.max(2, workingNumber.length - 7);
      return {
        countryCode,
        areaCode: workingNumber.substring(0, areaLength),
        number: workingNumber.substring(areaLength),
        extension
      };
    }

    throw new Error('Invalid phone number format');
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validar número de teléfono
   */
  protected validate(value: string): void {
    if (!value || value.length === 0) {
      throw new Error('Phone number cannot be empty');
    }

    // Validar que contenga solo números, +, y x
    if (!/^[\d+x]+$/.test(value)) {
      throw new Error('Phone number contains invalid characters');
    }

    // Validar longitud mínima
    if (value.replace(/[+x\d]/g, '').length < 7) {
      throw new Error('Phone number is too short');
    }

    // Validar longitud máxima
    if (value.length > 20) {
      throw new Error('Phone number is too long');
    }
  }

  // Getters públicos
  public getCountryCode(): string {
    return this._countryCode;
  }

  public getAreaCode(): string {
    return this._areaCode;
  }

  public getNumber(): string {
    return this._number;
  }

  public getExtension(): string | undefined {
    return this._extension;
  }

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación como string
   */
  public toString(): string {
    return this.getFormatted();
  }

  /**
   * 🔄 PATRÓN: JSON Serialization Pattern
   * Serialización para JSON
   */
  public toJSON(): string {
    return this.getInternationalFormat();
  }
}

/**
 * 📊 PATRÓN: Data Structure Pattern
 * Estructura de número parseado
 */
interface ParsedPhoneNumber {
  countryCode: string;
  areaCode: string;
  number: string;
  extension?: string;
}
