/**
 * 🏗️ PATRÓN: Adapter Pattern + Function Calling Integration
 * 🎯 PRINCIPIO: OpenAI Function Calling + Domain Command Mapping
 * 
 * FunctionCallAdapter - Adaptador para manejo de function calling
 * Traduce function calls de OpenAI a comandos del dominio
 */

// Commands removidos - solo se usan en comentarios simulados
// import { FocusMenuItemCommand } from '../../../application/commands/FocusMenuItemCommand';
// import { AddToCartCommand } from '../../../application/commands/AddToCartCommand';
// import { TransferAgentCommand } from '../../../application/commands/TransferAgentCommand';
// import { UpdateOrderCommand } from '../../../application/commands/UpdateOrderCommand';
import { AgentType } from '../../../domain/valueObjects/AgentType';

/**
 * 🎯 PATRÓN: Function Call Adapter Pattern
 * FunctionCallAdapter traduce llamadas de OpenAI a comandos internos
 */
export class FunctionCallAdapter {
  private functionRegistry: Map<string, FunctionHandler> = new Map();
  private callHistory: FunctionCallRecord[] = [];
  private activeSession: string | null = null;

  /**
   * 🔧 PATRÓN: Registry Pattern
   * Constructor con registro de funciones
   */
  constructor() {
    this.registerFunctions();
  }

  /**
   * 📞 PATRÓN: Function Call Processing Pattern
   * Procesar function call de OpenAI
   */
  public async processFunctionCall(
    functionCall: OpenAIFunctionCall,
    sessionId: string,
    agentId?: string
  ): Promise<FunctionCallResult> {
    try {
      this.activeSession = sessionId;

      // 1. Validar function call
      const validation = this.validateFunctionCall(functionCall);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          callId: functionCall.call_id
        };
      }

      // 2. Obtener handler de la función
      const handler = this.functionRegistry.get(functionCall.name);
      if (!handler) {
        return {
          success: false,
          error: `Function '${functionCall.name}' not found`,
          callId: functionCall.call_id
        };
      }

      // 3. Parsear argumentos
      const parsedArgs = this.parseArguments(functionCall.arguments);
      if (!parsedArgs.success) {
        return {
          success: false,
          error: parsedArgs.error,
          callId: functionCall.call_id
        };
      }

      // 4. Ejecutar función
      const startTime = Date.now();
      const result = await handler.execute(parsedArgs.arguments!, sessionId, agentId);
      const executionTime = Date.now() - startTime;

      // 5. Registrar en historial
      this.recordFunctionCall({
        callId: functionCall.call_id,
        functionName: functionCall.name,
        arguments: parsedArgs.arguments!,
        result,
        sessionId,
        agentId,
        executionTime,
        timestamp: new Date()
      });

      return {
        success: result.success,
        result: result.data,
        executionTime,
        callId: functionCall.call_id,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Function call processing failed',
        callId: functionCall.call_id
      };
    }
  }

  /**
   * 🔄 PATRÓN: Batch Processing Pattern
   * Procesar múltiples function calls
   */
  public async processBatchFunctionCalls(
    functionCalls: OpenAIFunctionCall[],
    sessionId: string,
    agentId?: string
  ): Promise<BatchFunctionCallResult> {
    const results: FunctionCallResult[] = [];
    const errors: string[] = [];

    for (const functionCall of functionCalls) {
      try {
        const result = await this.processFunctionCall(functionCall, sessionId, agentId);
        results.push(result);
        
        if (!result.success) {
          errors.push(`${functionCall.name}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${functionCall.name}: ${errorMessage}`);
        
        results.push({
          success: false,
          error: errorMessage,
          callId: functionCall.call_id
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      totalCalls: functionCalls.length,
      successfulCalls: results.filter(r => r.success).length,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 📊 PATRÓN: Function Analytics Pattern
   * Obtener métricas de function calls
   */
  public getFunctionCallMetrics(sessionId?: string): FunctionCallMetrics {
    const relevantCalls = sessionId 
      ? this.callHistory.filter(call => call.sessionId === sessionId)
      : this.callHistory;

    const functionUsage = new Map<string, number>();
    let totalExecutionTime = 0;
    let successfulCalls = 0;

    relevantCalls.forEach(call => {
      functionUsage.set(call.functionName, (functionUsage.get(call.functionName) || 0) + 1);
      totalExecutionTime += call.executionTime;
      if (call.result.success) successfulCalls++;
    });

    return {
      totalCalls: relevantCalls.length,
      successfulCalls,
      failedCalls: relevantCalls.length - successfulCalls,
      averageExecutionTime: relevantCalls.length > 0 ? totalExecutionTime / relevantCalls.length : 0,
      functionUsage: Object.fromEntries(functionUsage),
      mostUsedFunction: this.getMostUsedFunction(functionUsage),
      sessionId
    };
  }

  /**
   * 🧹 PATRÓN: History Management Pattern
   * Limpiar historial de function calls
   */
  public clearCallHistory(sessionId?: string): HistoryClearResult {
    const initialCount = this.callHistory.length;

    if (sessionId) {
      this.callHistory = this.callHistory.filter(call => call.sessionId !== sessionId);
    } else {
      this.callHistory = [];
    }

    const finalCount = this.callHistory.length;
    const clearedCount = initialCount - finalCount;

    return {
      success: true,
      clearedCalls: clearedCount,
      remainingCalls: finalCount
    };
  }

  /**
   * 🔍 PATRÓN: Function Discovery Pattern
   * Obtener funciones disponibles para un agente
   */
  public getAvailableFunctions(agentType: AgentType): FunctionDefinition[] {
    const allFunctions = Array.from(this.functionRegistry.values());
    
    return allFunctions
      .filter(handler => handler.allowedAgents.includes(agentType.getValue()))
      .map(handler => handler.definition);
  }

  /**
   * 🛠️ PATRÓN: Function Registration Pattern
   * Registrar todas las funciones disponibles
   */
  private registerFunctions(): void {
    // Focus Menu Item Function
    this.functionRegistry.set('focus_menu_item', {
      definition: {
        name: 'focus_menu_item',
        description: 'Focus on a specific menu item in the 3D carousel',
        parameters: {
          type: 'object',
          properties: {
            item_name: {
              type: 'string',
              description: 'Name of the menu item to focus on'
            },
            reason: {
              type: 'string',
              description: 'Reason for focusing on this item'
            }
          },
          required: ['item_name']
        }
      },
      allowedAgents: ['sales'],
      execute: this.executeFocusMenuItem.bind(this)
    });

    // Order Function (Add/Remove from Cart)
    this.functionRegistry.set('order', {
      definition: {
        name: 'order',
        description: 'Add or remove items from the customer cart',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['add', 'remove', 'update'],
              description: 'Action to perform on the cart'
            },
            item_name: {
              type: 'string',
              description: 'Name of the menu item'
            },
            quantity: {
              type: 'number',
              description: 'Quantity of the item',
              minimum: 1
            },
            special_instructions: {
              type: 'string',
              description: 'Special instructions for the item'
            }
          },
          required: ['action', 'item_name']
        }
      },
      allowedAgents: ['sales'],
      execute: this.executeOrder.bind(this)
    });

    // Transfer to Payment Agent Function
    this.functionRegistry.set('transfer_to_payment_agent', {
      definition: {
        name: 'transfer_to_payment_agent',
        description: 'Transfer customer to payment specialist',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for transfer'
            },
            cart_summary: {
              type: 'string',
              description: 'Summary of items in cart'
            }
          },
          required: ['reason']
        }
      },
      allowedAgents: ['sales'],
      execute: this.executeTransferToPayment.bind(this)
    });

    // Update Order Data Function
    this.functionRegistry.set('update_order_data', {
      definition: {
        name: 'update_order_data',
        description: 'Update customer information and delivery details',
        parameters: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'Customer full name'
            },
            phone: {
              type: 'string',
              description: 'Customer phone number'
            },
            email: {
              type: 'string',
              description: 'Customer email address'
            },
            delivery_address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipcode: { type: 'string' }
              },
              required: ['street', 'city']
            }
          },
          required: ['customer_name', 'phone']
        }
      },
      allowedAgents: ['payment'],
      execute: this.executeUpdateOrderData.bind(this)
    });

    // Transfer to Sales Agent Function
    this.functionRegistry.set('transfer_to_sales_agent', {
      definition: {
        name: 'transfer_to_sales_agent',
        description: 'Transfer back to sales agent for order modifications',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for transfer back to sales'
            }
          },
          required: ['reason']
        }
      },
      allowedAgents: ['payment'],
      execute: this.executeTransferToSales.bind(this)
    });
  }

  /**
   * 🎯 PATRÓN: Command Execution Pattern
   * Ejecutar focus_menu_item
   */
  private async executeFocusMenuItem(
    args: Record<string, unknown>
  ): Promise<FunctionExecutionResult> {
    try {
      // Simulación de comando - no se ejecuta realmente
      // new FocusMenuItemCommand(sessionId, agentId, args.item_name, ...);

      // En una implementación real, aquí se ejecutaría el comando a través del bus de comandos
      // Por ahora, simulamos la ejecución exitosa
      return {
        success: true,
        data: {
          focused_item: args.item_name,
          carousel_position: Math.floor(Math.random() * 10),
          message: `Focused on ${args.item_name}${args.reason ? ` - ${args.reason}` : ''}`
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to focus menu item'
      };
    }
  }

  /**
   * 🛒 PATRÓN: Command Execution Pattern
   * Ejecutar order (add/remove from cart)
   */
  private async executeOrder(
    args: Record<string, unknown>
  ): Promise<FunctionExecutionResult> {
    try {
      const action = args.action as string;
      const itemName = args.item_name as string;
      const quantity = (args.quantity as number) || 1;

      if (action === 'add') {
        // Simulación de comando - no se ejecuta realmente
        // new AddToCartCommand(cart, customer, item, quantity, session, agent, source, instructions);

        // Simulación de ejecución exitosa
        return {
          success: true,
          data: {
            action: 'added',
            item_name: itemName,
            quantity: quantity,
            cart_total_items: Math.floor(Math.random() * 5) + quantity,
            message: `Added ${quantity}x ${itemName} to cart`
          }
        };
      } else if (action === 'remove') {
        // Simulación de remoción
        return {
          success: true,
          data: {
            action: 'removed',
            item_name: itemName,
            message: `Removed ${itemName} from cart`
          }
        };
      } else {
        return {
          success: false,
          error: `Unsupported action: ${action}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process order'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Command Execution Pattern
   * Ejecutar transfer_to_payment_agent
   */
  private async executeTransferToPayment(
    args: Record<string, unknown>
  ): Promise<FunctionExecutionResult> {
    try {
      // Simulación de comando - no se ejecuta realmente
      // new TransferAgentCommand(session, agent, type, reason, customer, cart, order, context);

      return {
        success: true,
        data: {
          transfer_type: 'sales_to_payment',
          reason: args.reason,
          new_agent: 'Karol (Payment Specialist)',
          message: 'Transferring you to our payment specialist to complete your order'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer to payment agent'
      };
    }
  }

  /**
   * 📝 PATRÓN: Command Execution Pattern
   * Ejecutar update_order_data
   */
  private async executeUpdateOrderData(
    args: Record<string, unknown>
  ): Promise<FunctionExecutionResult> {
    try {
      // Simulación de comando - no se ejecuta realmente
      // new UpdateOrderCommand(orderId, customerId, updateType, updateData, reason, agentId);

      return {
        success: true,
        data: {
          updated_fields: ['customer_name', 'phone', 'email', 'delivery_address'],
          customer_name: args.customer_name,
          delivery_city: 'Simulated City',
          message: 'Order information updated successfully'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order data'
      };
    }
  }

  /**
   * 🔄 PATRÓN: Command Execution Pattern
   * Ejecutar transfer_to_sales_agent
   */
  private async executeTransferToSales(
    args: Record<string, unknown>
  ): Promise<FunctionExecutionResult> {
    try {
      // Simulación de comando - no se ejecuta realmente
      // new TransferAgentCommand(session, agent, type, reason, customer, cart, order, context);

      return {
        success: true,
        data: {
          transfer_type: 'payment_to_sales',
          reason: args.reason,
          new_agent: 'Luxora (Sales Assistant)',
          message: 'Transferring you back to our sales assistant for order modifications'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer to sales agent'
      };
    }
  }

  /**
   * ✅ PATRÓN: Validation Pattern
   * Validar function call
   */
  private validateFunctionCall(functionCall: OpenAIFunctionCall): ValidationResult {
    const errors: string[] = [];

    if (!functionCall.name) {
      errors.push('Function name is required');
    }

    if (!functionCall.call_id) {
      errors.push('Call ID is required');
    }

    if (!functionCall.arguments) {
      errors.push('Function arguments are required');
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  /**
   * 🔄 PATRÓN: Argument Parsing Pattern
   * Parsear argumentos de function call
   */
  private parseArguments(argumentsString: string): ArgumentParseResult {
    try {
      const parsed = JSON.parse(argumentsString);
      return {
        success: true,
        arguments: parsed
      };
    } catch (error) {
      return {
        success: false,
        error: 'Invalid JSON in function arguments'
      };
    }
  }

  /**
   * 📊 PATRÓN: Record Keeping Pattern
   * Registrar function call en historial
   */
  private recordFunctionCall(record: FunctionCallRecord): void {
    this.callHistory.push(record);

    // Mantener solo los últimos 1000 registros para evitar memory leaks
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-1000);
    }
  }

  /**
   * 📊 PATRÓN: Analytics Pattern
   * Obtener función más usada
   */
  private getMostUsedFunction(functionUsage: Map<string, number>): string | null {
    if (functionUsage.size === 0) return null;

    let mostUsed = '';
    let maxUsage = 0;

    for (const [functionName, usage] of functionUsage.entries()) {
      if (usage > maxUsage) {
        maxUsage = usage;
        mostUsed = functionName;
      }
    }

    return mostUsed;
  }
}

/**
 * 📊 PATRÓN: Type Definition Patterns
 * Tipos específicos para function calling
 */
export interface OpenAIFunctionCall {
  name: string;
  call_id: string;
  arguments: string;
}

export interface FunctionCallResult {
  success: boolean;
  result?: unknown;
  executionTime?: number;
  callId: string;
  error?: string;
}

export interface BatchFunctionCallResult {
  success: boolean;
  results: FunctionCallResult[];
  totalCalls: number;
  successfulCalls: number;
  errors?: string[];
}

export interface FunctionCallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  functionUsage: Record<string, number>;
  mostUsedFunction: string | null;
  sessionId?: string;
}

export interface HistoryClearResult {
  success: boolean;
  clearedCalls: number;
  remainingCalls: number;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface FunctionHandler {
  definition: FunctionDefinition;
  allowedAgents: string[];
  execute: (
    args: Record<string, unknown>,
    sessionId: string,
    agentId?: string
  ) => Promise<FunctionExecutionResult>;
}

export interface FunctionExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface FunctionCallRecord {
  callId: string;
  functionName: string;
  arguments: Record<string, unknown>;
  result: FunctionExecutionResult;
  sessionId: string;
  agentId?: string;
  executionTime: number;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ArgumentParseResult {
  success: boolean;
  arguments?: Record<string, unknown>;
  error?: string;
}
