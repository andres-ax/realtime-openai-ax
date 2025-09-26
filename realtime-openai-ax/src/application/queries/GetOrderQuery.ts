/**
 * 🏗️ PATRÓN: Query Pattern (CQRS)
 * 🎯 PRINCIPIO: Query Responsibility + Browser Storage + Real-time Demo
 * 
 * GetOrderQuery - Query para obtener información de pedidos
 * Optimizada para demostración en navegador sin base de datos
 */

import { BaseQuery, QueryValidationResult, QueryMetadata, SerializedQuery } from './BaseQuery';
import { Order } from '../../domain/entities/Order';
import { OrderId } from '../../domain/valueObjects/OrderId';
import { CustomerId } from '../../domain/valueObjects/CustomerId';

/**
 * 🎯 PATRÓN: Query Pattern
 * GetOrderQuery encapsula la consulta de información de pedidos
 */
export class GetOrderQuery extends BaseQuery {
  
  /**
   * 🔧 PATRÓN: Immutable Query Pattern
   * Constructor que crea query inmutable
   */
  constructor(
    public readonly orderId?: string,
    public readonly customerId?: string,
    public readonly sessionId?: string,
    public readonly includeItems: boolean = true,
    public readonly includeHistory: boolean = false,
    public readonly includePaymentInfo: boolean = false,
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

    // Al menos uno de los identificadores debe estar presente
    if (!this.orderId && !this.customerId && !this.sessionId) {
      errors.push('At least one identifier (orderId, customerId, or sessionId) is required');
    }

    // Validar formato de IDs si están presentes
    if (this.orderId && !this.isValidUUID(this.orderId)) {
      errors.push('Invalid order ID format');
    }

    if (this.customerId && !this.isValidUUID(this.customerId)) {
      errors.push('Invalid customer ID format');
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
      queryType: 'GetOrderQuery',
      queryId: this.queryId,
      timestamp: this.timestamp,
      sessionId: this.sessionId,
      customerId: this.customerId,
      targetResource: this.orderId || 'orders',
      isCacheable: true,
      cacheKey: this.generateCacheKey(),
      estimatedDuration: this.getEstimatedDuration(),
      requiresRealTimeData: false,
      dataSource: 'BROWSER_STORAGE'
    };
  }

  /**
   * 🔄 PATRÓN: Query Serialization Pattern
   * Serializar query para cache o transmisión
   */
  public serialize(): SerializedQuery {
    return {
      queryType: 'GetOrderQuery',
      queryId: this.queryId,
      timestamp: this.timestamp.toISOString(),
      parameters: {
        orderId: this.orderId,
        customerId: this.customerId,
        sessionId: this.sessionId,
        includeItems: this.includeItems,
        includeHistory: this.includeHistory,
        includePaymentInfo: this.includePaymentInfo
      }
    };
  }

  /**
   * 🏭 PATRÓN: Factory Pattern
   * Crear query desde datos serializados
   */
  public static fromSerialized(data: SerializedQuery): GetOrderQuery {
    if (data.queryType !== 'GetOrderQuery') {
      throw new Error('Invalid query type for GetOrderQuery');
    }

    const params = data.parameters as {
      orderId?: string;
      customerId?: string;
      sessionId?: string;
      includeItems: boolean;
      includeHistory: boolean;
      includePaymentInfo: boolean;
    };
    return new GetOrderQuery(
      params.orderId,
      params.customerId,
      params.sessionId,
      params.includeItems,
      params.includeHistory,
      params.includePaymentInfo,
      data.queryId
    );
  }

  /**
   * 🎯 PATRÓN: Query Builder Pattern
   * Builder para construcción fluida de queries
   */
  public static builder(): GetOrderQueryBuilder {
    return new GetOrderQueryBuilder();
  }

  /**
   * 📊 PATRÓN: Query Execution Pattern
   * Ejecutar query y obtener resultados desde browser storage
   */
  public async execute(): Promise<GetOrderResult> {
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

      // 2. Intentar obtener desde cache si es aplicable
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

      // 3. Ejecutar query específica
      let result: GetOrderResult;

      if (this.orderId) {
        result = await this.getOrderById();
      } else if (this.customerId) {
        result = await this.getOrdersByCustomer();
      } else if (this.sessionId) {
        result = await this.getOrdersBySession();
      } else {
        return {
          success: false,
          error: 'No valid identifier provided'
        };
      }

      // 4. Cache del resultado si es exitoso
      if (result.success && this.getMetadata().isCacheable) {
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
   * 🔍 PATRÓN: Single Order Retrieval Pattern
   * Obtener pedido específico por ID
   */
  private async getOrderById(): Promise<GetOrderResult> {
    const orderKey = this.getStorageKey('order', this.orderId);
    const orderData = this.getBrowserStorage(orderKey) as Record<string, unknown>;

    if (!orderData) {
      return {
        success: false,
        error: `Order not found: ${this.orderId}`
      };
    }

    // Reconstruir orden desde datos almacenados
    const order = this.reconstructOrderFromStorage(orderData);

    return {
      success: true,
      order,
      orders: [order],
      totalCount: 1,
      queryMetadata: this.getMetadata()
    };
  }

  /**
   * 📋 PATRÓN: Multiple Orders Retrieval Pattern
   * Obtener pedidos por cliente
   */
  private async getOrdersByCustomer(): Promise<GetOrderResult> {
    const customerOrdersKey = this.getStorageKey('customer-orders', this.customerId);
    const orderIds = this.getBrowserStorage(customerOrdersKey) as string[] || [];

    const orders: Order[] = [];
    for (const orderId of orderIds) {
      const orderKey = this.getStorageKey('order', orderId);
      const orderData = this.getBrowserStorage(orderKey) as Record<string, unknown>;
      
      if (orderData) {
        orders.push(this.reconstructOrderFromStorage(orderData));
      }
    }

    return {
      success: true,
      orders,
      totalCount: orders.length,
      queryMetadata: this.getMetadata()
    };
  }

  /**
   * 🎮 PATRÓN: Session Orders Retrieval Pattern
   * Obtener pedidos por sesión
   */
  private async getOrdersBySession(): Promise<GetOrderResult> {
    const sessionOrderKey = this.getStorageKey('session-order', this.sessionId);
    const orderId = this.getBrowserStorage(sessionOrderKey) as string;

    if (!orderId) {
      return {
        success: true,
        orders: [],
        totalCount: 0,
        queryMetadata: this.getMetadata()
      };
    }

    // Reutilizar lógica de obtener por ID
    const tempQuery = new GetOrderQuery(orderId, undefined, this.sessionId);
    return await tempQuery.getOrderById();
  }

  /**
   * 🏗️ PATRÓN: Object Reconstruction Pattern
   * Reconstruir entidad Order desde datos de storage
   */
  private reconstructOrderFromStorage(data: Record<string, unknown>): Order {
    // En una implementación real, aquí reconstruiríamos la entidad completa
    // Por ahora, creamos un objeto que simula la estructura
    const orderId = OrderId.fromString(data.id as string);
    const customerId = CustomerId.fromString(data.customerId as string);
    
    // Crear orden básica (en implementación real usaríamos factory methods)
    const order = new Order(orderId, customerId);
    
    // Agregar items si están incluidos
    if (this.includeItems && data.items) {
      (data.items as Array<Record<string, unknown>>).forEach((item: Record<string, unknown>) => {
        order.addItem(item.menuItemName as string, item.quantity as number, item.unitPrice as number);
      });
    }

    return order;
  }

  /**
   * 🗂️ PATRÓN: Cache Management Pattern
   * Gestión de cache para queries
   */
  private getCachedResult(): GetOrderResult | null {
    const cacheKey = this.generateCacheKey();
    const cached = this.getBrowserStorage(cacheKey, true) as Record<string, unknown>;
    
    if (cached && !this.isCacheExpired(cached.timestamp as number)) {
      return cached.result as GetOrderResult;
    }
    
    return null;
  }

  private cacheResult(result: GetOrderResult): void {
    const cacheKey = this.generateCacheKey();
    const cacheData = {
      timestamp: Date.now(),
      result
    };
    
    this.setBrowserStorage(cacheKey, cacheData, true);
  }

  private isCacheExpired(timestamp: number): boolean {
    const maxAge = 30000; // 30 segundos
    return Date.now() - timestamp > maxAge;
  }

  /**
   * 🔑 PATRÓN: Cache Key Generation Pattern
   * Generar clave única para cache
   */
  private generateCacheKey(): string {
    const parts = [
      'query-cache',
      'GetOrderQuery',
      this.orderId || 'no-order',
      this.customerId || 'no-customer',
      this.sessionId || 'no-session',
      this.includeItems ? 'with-items' : 'no-items',
      this.includeHistory ? 'with-history' : 'no-history'
    ];
    
    return this.getStorageKey(parts.join('-'));
  }

  /**
   * ⏱️ PATRÓN: Duration Estimation Pattern
   * Estimar duración de ejecución
   */
  private getEstimatedDuration(): number {
    let baseDuration = 50; // 50ms base para browser storage

    if (this.includeItems) baseDuration += 20;
    if (this.includeHistory) baseDuration += 30;
    if (this.includePaymentInfo) baseDuration += 15;

    return baseDuration;
  }

  /**
   * 🛡️ PATRÓN: UUID Validation Pattern
   * Validar formato UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 🎨 PATRÓN: Query Decoration Pattern
   * Crear variantes de la query
   */
  public withItems(): GetOrderQuery {
    return new GetOrderQuery(
      this.orderId,
      this.customerId,
      this.sessionId,
      true,
      this.includeHistory,
      this.includePaymentInfo,
      this.queryId
    );
  }

  public withHistory(): GetOrderQuery {
    return new GetOrderQuery(
      this.orderId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      true,
      this.includePaymentInfo,
      this.queryId
    );
  }

  public withPaymentInfo(): GetOrderQuery {
    return new GetOrderQuery(
      this.orderId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      this.includeHistory,
      true,
      this.queryId
    );
  }
}

/**
 * 🏗️ PATRÓN: Builder Pattern
 * Builder para construcción fluida de GetOrderQuery
 */
export class GetOrderQueryBuilder {
  private orderId?: string;
  private customerId?: string;
  private sessionId?: string;
  private includeItems: boolean = true;
  private includeHistory: boolean = false;
  private includePaymentInfo: boolean = false;

  public forOrder(orderId: string): this {
    this.orderId = orderId;
    return this;
  }

  public forCustomer(customerId: string): this {
    this.customerId = customerId;
    return this;
  }

  public inSession(sessionId: string): this {
    this.sessionId = sessionId;
    return this;
  }

  public withItems(): this {
    this.includeItems = true;
    return this;
  }

  public withHistory(): this {
    this.includeHistory = true;
    return this;
  }

  public withPaymentInfo(): this {
    this.includePaymentInfo = true;
    return this;
  }

  public build(): GetOrderQuery {
    return new GetOrderQuery(
      this.orderId,
      this.customerId,
      this.sessionId,
      this.includeItems,
      this.includeHistory,
      this.includePaymentInfo
    );
  }
}

/**
 * 📊 PATRÓN: Result Pattern
 * Resultado de la query de pedidos
 */
export interface GetOrderResult {
  success: boolean;
  order?: Order;
  orders?: Order[];
  totalCount?: number;
  error?: string;
  validationErrors?: string[];
  queryMetadata?: QueryMetadata;
  fromCache?: boolean;
  cacheAge?: number;
}
