/**
 * 🏗️ PATRÓN: CQRS (Command Query Responsibility Segregation)
 * 🎯 PRINCIPIO: Single Responsibility + Command Pattern
 * 
 * Interfaz base para todos los comandos del sistema
 * que modifican el estado de la aplicación
 */

/**
 * 🔄 PATRÓN: Command Pattern
 * Interfaz base para comandos
 */
export interface Command {
  readonly commandId: string;
  readonly commandType: string;
  readonly timestamp: Date;
  readonly userId?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * 🏭 PATRÓN: Abstract Factory Pattern
 * Clase base para crear comandos tipados
 */
export abstract class BaseCommand implements Command {
  public readonly commandId: string;
  public readonly commandType: string;
  public readonly timestamp: Date;
  public readonly userId?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    commandType: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ) {
    this.commandId = this.generateCommandId();
    this.commandType = commandType;
    this.timestamp = new Date();
    this.userId = userId;
    this.metadata = metadata ? Object.freeze(metadata) : undefined;
  }

  /**
   * 🎯 PATRÓN: Factory Method Pattern
   * Generación única de identificadores
   */
  private generateCommandId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🛡️ PATRÓN: Validation Pattern
   * Validación del comando antes de ejecución
   */
  public abstract validate(): ValidationResult;
}

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de validación
 */
export type ValidationResult = {
  isValid: true;
} | {
  isValid: false;
  errors: string[];
};

/**
 * 🎯 PATRÓN: Handler Pattern
 * Interfaz para manejadores de comandos
 */
export interface CommandHandler<TCommand extends Command, TResult> {
  handle(command: TCommand): Promise<CommandResult<TResult>>;
}

/**
 * 🔄 PATRÓN: Result Pattern
 * Resultado de ejecución de comando
 */
export type CommandResult<T> = {
  success: true;
  data: T;
  events?: string[];
} | {
  success: false;
  error: string;
  code?: string;
};
