/**
 * 🏗️ PATRÓN: Value Object Pattern (DDD)
 * 🎯 PRINCIPIO: Immutability + Equality by Value
 * 
 * Objeto de valor base que garantiza inmutabilidad
 * y comparación por valor, no por referencia
 */

export abstract class BaseValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = Object.freeze(value);
  }

  /**
   * 🎯 PATRÓN: Immutable Pattern
   * Getter inmutable para el valor
   */
  public get value(): T {
    return this._value;
  }

  /**
   * 🛡️ PATRÓN: Equality Pattern
   * Comparación por valor, no por referencia
   */
  public equals(valueObject: BaseValueObject<T>): boolean {
    if (!(valueObject instanceof BaseValueObject)) {
      return false;
    }

    return JSON.stringify(this._value) === JSON.stringify(valueObject._value);
  }

  /**
   * 🔧 PATRÓN: Template Method Pattern
   * Validación específica por tipo de valor
   */
  protected abstract validate(value: T): void;

  /**
   * 🎯 PATRÓN: String Representation Pattern
   * Representación legible del objeto
   */
  public toString(): string {
    return JSON.stringify(this._value);
  }
}
