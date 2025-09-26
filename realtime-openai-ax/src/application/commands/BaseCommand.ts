/**
 * 🏗️ PATRÓN: Base Command Pattern (CQRS)
 * 🎯 PRINCIPIO: Command Base Class + Common Functionality
 * 
 * BaseCommand - Clase base para todos los comandos
 * Proporciona funcionalidad común y estructura consistente
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 🎯 PATRÓN: Abstract Base Class Pattern
 * BaseCommand define la estructura común de todos los comandos
 */
export abstract class BaseCommand {
  
  public readonly commandId: string;
  public readonly timestamp: Date;

  /**
   * 🔧 PATRÓN: Constructor Pattern
   * Constructor base con ID y timestamp automáticos
   */
  constructor(commandId?: string) {
    this.commandId = commandId || uuidv4();
    this.timestamp = new Date();
  }

  /**
   * 🛡️ PATRÓN: Template Method Pattern
   * Método abstracto de validación que deben implementar las subclases
   */
  public abstract validate(): CommandValidationResult;

  /**
   * 📊 PATRÓN: Metadata Pattern
   * Método abstracto para obtener metadatos específicos del comando
   */
  public abstract getMetadata(): CommandMetadata;

  /**
   * 🔄 PATRÓN: Serialization Pattern
   * Método abstracto para serialización específica del comando
   */
  public abstract serialize(): SerializedCommand;

  /**
   * ⏱️ PATRÓN: Age Calculation Pattern
   * Calcular edad del comando en milisegundos
   */
  public getAge(): number {
    return Date.now() - this.timestamp.getTime();
  }

  /**
   * ⏰ PATRÓN: Expiration Pattern
   * Verificar si el comando ha expirado
   */
  public isExpired(maxAgeMs: number = 300000): boolean { // 5 minutos por defecto
    return this.getAge() > maxAgeMs;
  }

  /**
   * 🔍 PATRÓN: Command Inspection Pattern
   * Verificar si el comando es del tipo especificado
   */
  public isOfType(commandType: string): boolean {
    return this.getMetadata().commandType === commandType;
  }

  /**
   * 📊 PATRÓN: Command Summary Pattern
   * Obtener resumen básico del comando
   */
  public getSummary(): CommandSummary {
    const metadata = this.getMetadata();
    return {
      commandId: this.commandId,
      commandType: metadata.commandType,
      timestamp: this.timestamp,
      age: this.getAge(),
      isExpired: this.isExpired(),
      priority: metadata.priority,
      requiresUIUpdate: metadata.requiresUIUpdate
    };
  }

  /**
   * 🎯 PATRÓN: Command Equality Pattern
   * Comparar comandos por ID
   */
  public equals(other: BaseCommand): boolean {
    return this.commandId === other.commandId;
  }

  /**
   * 🔄 PATRÓN: Command Cloning Pattern
   * Crear copia del comando con nuevo ID
   */
  public clone(): BaseCommand {
    // Serialize command for validation
    this.serialize();
    // Las subclases deben implementar fromSerialized
    throw new Error('Clone method must be implemented by subclasses using fromSerialized');
  }

  /**
   * 📝 PATRÓN: String Representation Pattern
   * Representación en string del comando
   */
  public toString(): string {
    const metadata = this.getMetadata();
    return `${metadata.commandType}[${this.commandId}] at ${this.timestamp.toISOString()}`;
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
  sessionId?: string;
  agentId?: string;
  targetResource?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  estimatedDuration?: number;
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

/**
 * 📊 PATRÓN: Summary Pattern
 * Resumen del comando
 */
export interface CommandSummary {
  commandId: string;
  commandType: string;
  timestamp: Date;
  age: number;
  isExpired: boolean;
  priority: string;
  requiresUIUpdate: boolean;
}