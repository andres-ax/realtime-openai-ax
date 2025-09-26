'use client';

import { useCallback, useEffect } from 'react';

/**
 * useToolCalling - React hook for managing and executing tool (function) calls.
 *
 * Features:
 * - Registration and definition of available tool functions.
 * - Safe and validated execution of tool functions.
 * - Robust JSON argument parsing.
 * - Utilities for integration with OpenAI APIs (Functions and Realtime).
 *
 * Inspired by a successful project, with example functions for a food ordering system.
 */

/**
 * Represents a function call message received from the API.
 */
interface FunctionCallMessage {
  type: string;
  item?: {
    type: string;
    name?: string;
    arguments?: string | Record<string, unknown>;
    call_id?: string;
  };
  function_call?: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
  delta?: {
    name?: string;
    arguments?: string | Record<string, unknown>;
  };
}

/**
 * Standard result of a tool function execution.
 */
interface ToolExecutionResult {
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
  data?: unknown;
  message?: string;
  [key: string]: unknown; // Allows additional properties for flexibility.
}

/**
 * Result of safe JSON parsing, including error and context information.
 */
interface JsonParsingResult {
  error?: string;
  raw?: string;
  context?: string;
  sanitized?: string;
  [key: string]: unknown;
}

/**
 * Extends the Window object to expose global functions for testing/debugging.
 */
interface WindowWithGlobals extends Window {
  processFunctionCall?: (message: FunctionCallMessage) => Promise<ToolExecutionResult | null>;
  executeToolFunction?: (name: string, args: Record<string, unknown>) => Promise<ToolExecutionResult>;
}

/**
 * Definition of a tool function.
 */
export interface ToolFunction {
  /** Unique function name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Parameters schema (JSON Schema compatible) */
  parameters: Record<string, unknown>;
  /** Function execution handler */
  handler: (args: Record<string, unknown>) => Promise<ToolExecutionResult> | ToolExecutionResult;
}

/**
 * Options for the useToolCalling hook.
 */
interface UseToolCallingOptions {
  /** Optional callback when a tool function is executed */
  onToolCall?: (name: string, args: Record<string, unknown>, result: ToolExecutionResult) => void;
  /** Optional callback for error handling */
  onError?: (error: Error) => void;
}

/**
 * Registry of all available tool functions.
 * Each function includes its definition, parameters, and execution logic.
 */
export const TOOL_FUNCTIONS: Record<string, ToolFunction> = {
  focus_menu_item: {
    name: 'focus_menu_item',
    description: 'Focus on a specific menu item in the 3D carousel',
    parameters: {
      type: 'object',
      properties: {
        menu_item: {
          type: 'string',
          enum: [
            'Big Burger Combo',
            'Double Cheeseburger',
            'Cheeseburger',
            'Hamburger',
            'Crispy Chicken Sandwich',
            'Chicken Nuggets (6 pc)',
            'Crispy Fish Sandwich',
            'Fries',
            'Baked Apple Pie',
            'Manzana Postobon® Drink'
          ],
          description: 'Name of the menu item to focus on'
        }
      },
      required: ['menu_item']
    },
    handler: (args: Record<string, unknown>): ToolExecutionResult => {
      const { menu_item } = args as { menu_item: string };
      // Dispatch event for React component to handle focus
      const focusEvent = new CustomEvent('focusMenuItem', {
        detail: { itemName: menu_item }
      });
      window.dispatchEvent(focusEvent);

      // Vanilla JS compatibility: highlight the DOM element
      const itemElement = document.querySelector(`[data-menu-item="${menu_item}"]`);
      if (itemElement) {
        itemElement.classList.add('focused');
        setTimeout(() => itemElement.classList.remove('focused'), 2000);
      }

      return {
        success: true,
        message: `Showing this menu item to the user:\n• ${menu_item}`,
        focused_item: menu_item
      };
    }
  },

  order: {
    name: 'order',
    description: 'Update the customer cart and manage order items',
    parameters: {
      type: 'object',
      properties: {
        cart: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menu_item: {
                type: 'string',
                enum: [
                  'Big Burger Combo',
                  'Double Cheeseburger',
                  'Cheeseburger',
                  'Hamburger',
                  'Crispy Chicken Sandwich',
                  'Chicken Nuggets (6 pc)',
                  'Crispy Fish Sandwich',
                  'Fries',
                  'Baked Apple Pie',
                  'Manzana Postobon® Drink'
                ],
                description: 'The name of the menu item to purchase'
              },
              quantity: {
                type: 'integer',
                minimum: 1,
                description: 'Number of units'
              }
            },
            required: ['menu_item', 'quantity']
          },
          description: 'The cart items in the customer order'
        },
        customer_confirm: {
          type: 'string',
          enum: ['yes', 'no', 'review'],
          description: 'Customer confirm the order to purchase'
        }
      },
      required: ['cart', 'customer_confirm']
    },
    handler: (args: Record<string, unknown>): ToolExecutionResult => {
      const { cart, customer_confirm } = args as { cart: Array<{ menu_item: string, quantity: number }>; customer_confirm: string };
      // Dispatch event to update the cart
      const orderEvent = new CustomEvent('updateOrder', {
        detail: {
          cart: cart,
          customerConfirm: customer_confirm
        }
      });
      window.dispatchEvent(orderEvent);

      // If customer confirms, dispatch event to proceed to payment
      if (customer_confirm === 'yes') {
        const paymentEvent = new CustomEvent('proceedToPayment', {
          detail: { cart: cart }
        });
        window.dispatchEvent(paymentEvent);
      }

      const total = cart.reduce((sum, item) => sum + item.quantity, 0);

      return {
        success: true,
        message: `Order updated: ${cart.length} items, Total items: ${total}`,
        cart: cart,
        customer_confirm: customer_confirm
      };
    }
  },

  update_order_data: {
    name: 'update_order_data',
    description: 'Update one or more fields of the customer order (cart, contact info, payment info) and guide the customer through the process',
    parameters: {
      type: 'object',
      properties: {
        cart: {
          type: 'array',
          description: 'List of menu items and quantities in the customer cart',
          items: {
            type: 'object',
            properties: {
              menu_item: {
                type: 'string',
                enum: [
                  'Big Burger Combo',
                  'Double Cheeseburger',
                  'Cheeseburger',
                  'Hamburger',
                  'Crispy Chicken Sandwich',
                  'Chicken Nuggets (6 pc)',
                  'Crispy Fish Sandwich',
                  'Fries',
                  'Baked Apple Pie',
                  'Manzana Postobon® Drink'
                ],
                description: 'Name of the menu item'
              },
              quantity: {
                type: 'integer',
                minimum: 1,
                description: 'Number of units'
              }
            },
            required: ['menu_item', 'quantity']
          }
        },
        name: { type: 'string', description: 'Customer full name' },
        address: { type: 'string', description: 'Shipping address' },
        contact_phone: { type: 'string', description: 'Phone for shipping notifications' },
        credit_card_number: { type: 'string', description: 'Customer credit card number' },
        expiration_date: { type: 'string', description: 'Credit card expiration date (MM/YY)' },
        cvv: { type: 'string', description: 'Credit card CVV code (3 or 4 digits)' },
        delivery_method: { type: 'string', description: 'Delivery method preference' },
        confirm: {
          type: 'string',
          enum: ['yes', 'no'],
          description: 'Customer confirms everything is correct and wants to proceed with payment'
        }
      },
      required: ['confirm']
    },
    handler: (args: Record<string, unknown>): ToolExecutionResult => {
      // Dispatch event to update order data and UI
      const orderEvent = new CustomEvent('updateOrderData', {
        detail: args
      });
      window.dispatchEvent(orderEvent);

      // If customer confirms the final order
      if (args.confirm === 'yes') {
        const completeEvent = new CustomEvent('orderComplete', {
          detail: { orderData: args }
        });
        window.dispatchEvent(completeEvent);

        return {
          success: true,
          message: 'Thank you! Your order is confirmed and will ship in about 4 days.',
          order_confirmed: true,
          updatedFields: args
        };
      }

      return {
        success: true,
        message: 'Order data updated successfully. Please continue providing any missing information.',
        updatedFields: args
      };
    }
  },

  transfer_to_payment: {
    name: 'transfer_to_payment',
    description: 'Transfer customer to payment agent and proceed to checkout',
    parameters: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context for the transfer' },
        cart_summary: { type: 'object', description: 'Current cart summary' }
      }
    },
    handler: (args: Record<string, unknown>): ToolExecutionResult => {
      // Dispatch event to change agent and view
      const transferEvent = new CustomEvent('transferAgent', {
        detail: {
          targetAgent: 'payment',
          context: args,
          changeView: 'checkout'
        }
      });
      window.dispatchEvent(transferEvent);

      return {
        success: true,
        message: 'Transferred to payment agent. Now proceeding to checkout.',
        agent: 'payment',
        view_changed: 'checkout'
      };
    }
  },

  transfer_to_menu_agent: {
    name: 'transfer_to_menu_agent',
    description: 'Transfer the conversation to a menu-specialist agent so they can help the customer choose which menu item to buy',
    parameters: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Context for the transfer' }
      }
    },
    handler: (args: Record<string, unknown>): ToolExecutionResult => {
      // Dispatch event to return to menu
      const menuEvent = new CustomEvent('backToMenu', {
        detail: { context: args }
      });
      window.dispatchEvent(menuEvent);

      // Dispatch event to change agent
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'sales', context: args }
      });
      window.dispatchEvent(transferEvent);

      return {
        success: true,
        message: 'Returning control to the menu-specialist agent. Give him the welcome as the new agent',
        agent: 'sales',
        view_changed: 'menu'
      };
    }
  },

  get_current_time: {
    name: 'get_current_time',
    description: 'Get the current time',
    parameters: { type: 'object', properties: {} },
    handler: () => {
      const now = new Date();
      return {
        success: true,
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        timestamp: now.toISOString()
      };
    }
  },

  party_mode: {
    name: 'party_mode',
    description: 'Activate party mode with visual effects',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'number', description: 'Duration in seconds', default: 5 }
      }
    },
    handler: (args: { duration?: number }) => {
      const duration = (args.duration || 5) * 1000;
      document.body.classList.add('party-mode');
      setTimeout(() => {
        document.body.classList.remove('party-mode');
      }, duration);

      return { success: true, message: `Party mode activated for ${duration / 1000} seconds!` };
    }
  }
};

/**
 * Main hook for tool calling management.
 *
 * @param options Configuration options and callbacks.
 * @returns Methods and utilities for tool calling.
 */
export function useToolCalling(options: UseToolCallingOptions = {}) {
  /**
   * Executes a tool function by name, validating existence and handling errors.
   * @param name Name of the tool function to execute.
   * @param args Arguments for the function.
   * @returns Result of the execution.
   */
  const executeToolFunction = useCallback(async (name: string, args: Record<string, unknown> = {}) => {
    try {
      const toolFunction = TOOL_FUNCTIONS[name];
      if (!toolFunction) {
        throw new Error(`Tool function '${name}' not found`);
      }
      const result = await toolFunction.handler(args);
      options.onToolCall?.(name, args, result);
      return result;
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, [options]);

  /**
   * Gets tool definitions in OpenAI Functions API format.
   * @returns Array of function definitions.
   */
  const getToolDefinitions = useCallback(() => {
    return Object.values(TOOL_FUNCTIONS).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }, []);

  /**
   * Gets tool definitions in OpenAI Realtime API (session) format.
   * @returns Array of function definitions.
   */
  const getRealtimeToolDefinitions = useCallback(() => {
    return Object.values(TOOL_FUNCTIONS).map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }, []);

  /**
   * safeJsonParser - Robust and safe JSON argument parser.
   * Tries multiple parsing strategies and returns error info if parsing fails.
   *
   * @param rawArgs Arguments as a string or already as an object.
   * @param context Context for logs and debugging.
   * @returns Parsed object or error information.
   */
  const safeJsonParser = useCallback((rawArgs: unknown, context: string): JsonParsingResult | Record<string, unknown> => {
    if (typeof rawArgs !== 'string') {
      return rawArgs as Record<string, unknown>;
    }

    const trimmed = rawArgs.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return { error: 'Invalid JSON structure', raw: rawArgs };
    }

    let sanitized = trimmed;
    const openQuotes = (sanitized.match(/"/g) || []).length;
    if (openQuotes % 2 !== 0) {
      const lastQuoteIndex = sanitized.lastIndexOf('"');
      const afterLastQuote = sanitized.substring(lastQuoteIndex + 1);
      if (afterLastQuote && !afterLastQuote.includes('"')) {
        sanitized = sanitized + '"';
      }
    }

    const parsingStrategies = [
      () => JSON.parse(sanitized),
      () => JSON.parse(sanitized.replace(/,(\s*[}\]])/g, '$1')),
      () => JSON.parse(sanitized.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')),
      () => ({
        error: 'JSON parsing failed',
        raw: rawArgs,
        context: context,
        sanitized: sanitized
      })
    ];

    for (let i = 0; i < parsingStrategies.length; i++) {
      try {
        return parsingStrategies[i]();
      } catch (error) {
        if (i === parsingStrategies.length - 1) {
          // Last strategy, return structured error
        }
      }
    }
    return { error: 'Unexpected parsing failure', raw: rawArgs, context: context };
  }, []);

  /**
   * Processes a function call message received from the API and executes the corresponding function.
   * Supports multiple message formats (unified, delta, legacy).
   *
   * @param message Message received from the API.
   * @returns Result of the execution or null if not relevant.
   */
  const processFunctionCall = useCallback(async (message: FunctionCallMessage): Promise<ToolExecutionResult | null> => {
    // Unified format (OpenAI Realtime)
    if (message.type === 'response.output_item.done' && message.item?.type === 'function_call') {
      const { name, arguments: args } = message.item;
      try {
        const parsedArgs = safeJsonParser(args, 'unified_function_call');
        if (parsedArgs?.error) {
          return { success: false, error: 'Invalid unified function call arguments', details: parsedArgs };
        }
        return await executeToolFunction(name || '', parsedArgs);
      } catch {
        return { success: false, error: 'Unified function call processing failed' };
      }
    }

    // Delta format (OpenAI streaming)
    if (message.type === 'response.function_call_delta' && message.function_call) {
      const { name, arguments: args } = message.function_call;
      try {
        const parsedArgs = safeJsonParser(args, 'function_call_delta');
        if (parsedArgs?.error) {
          return { success: false, error: 'Invalid function call arguments', details: parsedArgs };
        }
        return await executeToolFunction(name, parsedArgs);
      } catch {
        return { success: false, error: 'Function call delta processing failed' };
      }
    }

    // Legacy format
    if (message.type === 'response.function_call' && message.function_call) {
      const { name, arguments: args } = message.function_call;
      try {
        const parsedArgs = safeJsonParser(args, 'legacy_function_call');
        if (parsedArgs?.error) {
          return { success: false, error: 'Invalid legacy function call arguments', details: parsedArgs };
        }
        return await executeToolFunction(name, parsedArgs);
      } catch {
        return { success: false, error: 'Legacy function call processing failed' };
      }
    }

    // If not a relevant message, return null
    return null;
  }, [executeToolFunction, safeJsonParser]);

  /**
   * Exposes processFunctionCall and executeToolFunction globally on window for testing/debugging.
   */
  useEffect(() => {
    const globalWindow = window as WindowWithGlobals;
    globalWindow.processFunctionCall = processFunctionCall;
    globalWindow.executeToolFunction = executeToolFunction;
    return () => {
      const globalWindow = window as WindowWithGlobals;
      delete globalWindow.processFunctionCall;
      delete globalWindow.executeToolFunction;
    };
  }, [processFunctionCall, executeToolFunction]);

  return {
    executeToolFunction,
    getToolDefinitions,
    getRealtimeToolDefinitions,
    processFunctionCall,
    availableTools: Object.keys(TOOL_FUNCTIONS)
  };
}
