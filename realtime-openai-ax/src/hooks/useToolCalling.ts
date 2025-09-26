'use client';

import { useCallback, useEffect } from 'react';

/**
 * 🔧 TOOL CALLING HOOK
 * 
 * Basado en el proyecto exitoso - 6 funciones ejemplo
 * Implementación directa sin capas de abstracción
 */

export interface ToolFunction {
  name: string;
  description: string;
  parameters: any;
  handler: (args: any) => Promise<any> | any;
}

interface UseToolCallingOptions {
  onToolCall?: (name: string, args: any, result: any) => void;
  onError?: (error: Error) => void;
}

// 🎯 Funciones de herramientas disponibles (basadas en proyecto exitoso)
export const TOOL_FUNCTIONS: Record<string, ToolFunction> = {
  // 🍔 Funciones específicas de nuestro dominio (pedidos de comida)
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
    handler: (args: { menu_item: string }) => {
      console.log(`[TOOL] 🎯 FOCUS_MENU_ITEM CALLED! Item: ${args.menu_item}`);
      console.log(`[TOOL] 🎯 Args received:`, args);
      
      // Disparar evento para que el MenuCarousel React lo maneje
      const focusEvent = new CustomEvent('focusMenuItem', {
        detail: { itemName: args.menu_item }
      });
      
      console.log(`[TOOL] 📡 Dispatching focusMenuItem event for: ${args.menu_item}`);
      window.dispatchEvent(focusEvent);
      
      // También buscar elemento DOM para compatibilidad con vanilla JS
      const itemElement = document.querySelector(`[data-menu-item="${args.menu_item}"]`);
      
      if (itemElement) {
        console.log(`[TOOL] ✅ Found DOM element for: ${args.menu_item}`);
        itemElement.classList.add('focused');
        setTimeout(() => itemElement.classList.remove('focused'), 2000);
      } else {
        console.log(`[TOOL] ⚠️ DOM element not found for: ${args.menu_item}`);
      }
      
      // Verificar que el evento se disparó
      console.log(`[TOOL] 🎉 Focus event dispatched successfully for: ${args.menu_item}`);
      
      return { 
        success: true, 
        message: `Showing this menu item to the user:\n• ${args.menu_item}`,
        focused_item: args.menu_item
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
    handler: (args: { cart: Array<{menu_item: string, quantity: number}>; customer_confirm: string }) => {
      console.log(`[TOOL] 🛒 Updating order:`, args);
      
      // Disparar evento para actualizar el carrito completo
      const orderEvent = new CustomEvent('updateOrder', {
        detail: {
          cart: args.cart,
          customerConfirm: args.customer_confirm
        }
      });
      
      window.dispatchEvent(orderEvent);
      
      // Si el cliente confirma, disparar evento para ir a pago
      if (args.customer_confirm === 'yes') {
        const paymentEvent = new CustomEvent('proceedToPayment', {
          detail: { cart: args.cart }
        });
        window.dispatchEvent(paymentEvent);
      }
      
      const total = args.cart.reduce((sum, item) => sum + item.quantity, 0);
      
      return { 
        success: true, 
        message: `Order updated: ${args.cart.length} items, Total items: ${total}`,
        cart: args.cart,
        customer_confirm: args.customer_confirm
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
    handler: (args: any) => {
      console.log('[TOOL] 📝 Updating order data:', args);
      
      // Disparar evento para actualizar datos del pedido y UI
      const orderEvent = new CustomEvent('updateOrderData', { 
        detail: args  // Pasar args directamente como detail
      });
      window.dispatchEvent(orderEvent);
      
      // Si el cliente confirma el pedido final
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
    handler: (args: any) => {
      console.log('[TOOL] 💳 Transferring to payment agent:', args);
      
      // Disparar evento para cambio de vista a checkout
      const checkoutEvent = new CustomEvent('proceedToCheckout', {
        detail: { context: args }
      });
      window.dispatchEvent(checkoutEvent);
      
      // Disparar evento para cambio de agente
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'payment', context: args }
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
    handler: (args: any) => {
      console.log('[TOOL] 🛍️ Transferring to menu/sales agent:', args);
      
      // Disparar evento para volver al menú
      const menuEvent = new CustomEvent('backToMenu', {
        detail: { context: args }
      });
      window.dispatchEvent(menuEvent);
      
      // Disparar evento para cambio de agente
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

  // 🎉 Funciones adicionales inspiradas en el proyecto exitoso
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
      console.log('[TOOL] 🎉 Party mode activated!');
      
      const duration = (args.duration || 5) * 1000;
      
      // Agregar clase de party mode al body
      document.body.classList.add('party-mode');
      
      // Remover después del tiempo especificado
      setTimeout(() => {
        document.body.classList.remove('party-mode');
      }, duration);
      
      return { success: true, message: `Party mode activated for ${duration/1000} seconds!` };
    }
  }
};

export function useToolCalling(options: UseToolCallingOptions = {}) {
  
  // 🔧 Ejecutar función de herramienta
  const executeToolFunction = useCallback(async (name: string, args: any = {}) => {
    try {
      console.log(`[TOOL-CALLING] 🔧 Executing: ${name}`, args);
      
      const toolFunction = TOOL_FUNCTIONS[name];
      if (!toolFunction) {
        throw new Error(`Tool function '${name}' not found`);
      }
      
      const result = await toolFunction.handler(args);
      
      console.log(`[TOOL-CALLING] ✅ Result:`, result);
      options.onToolCall?.(name, args, result);
      
      return result;
      
    } catch (error) {
      console.error(`[TOOL-CALLING] ❌ Error executing ${name}:`, error);
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }, [options]);

  // 📋 Obtener definiciones de herramientas para OpenAI Functions API
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

  // 📋 Obtener definiciones de herramientas para OpenAI Realtime API (formato session)
  const getRealtimeToolDefinitions = useCallback(() => {
    return Object.values(TOOL_FUNCTIONS).map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }, []);

  // 🎯 Procesar mensaje de function call de OpenAI
  const processFunctionCall = useCallback(async (message: any) => {
    console.log('[TOOL-CALLING] 🔍 Processing message:', message.type);
    
    // Log específico para response.output_item.done
    if (message.type === 'response.output_item.done') {
      console.log('[TOOL-CALLING] 📦 Output item done - checking for function call...');
      console.log('[TOOL-CALLING] 📋 Item type:', message.item?.type);
      console.log('[TOOL-CALLING] 📋 Full item:', JSON.stringify(message.item, null, 2));
      
      if (message.item?.type !== 'function_call') {
        console.log('[TOOL-CALLING] ⚠️ Item is not a function_call, skipping...');
        return null;
      }
    }
    
    // Manejar diferentes formatos de function calls
    if (message.type === 'response.function_call_delta' && message.function_call) {
      const { name, arguments: args } = message.function_call;
      console.log('[TOOL-CALLING] 🔧 Function call delta:', name, args);
      
      try {
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        console.log('[TOOL-CALLING] 📋 Parsed args:', parsedArgs);
        return await executeToolFunction(name, parsedArgs);
      } catch (error) {
        console.error('[TOOL-CALLING] ❌ Error parsing function call args:', error);
        return { success: false, error: 'Invalid function call arguments' };
      }
    }
    
    // Manejar formato unificado de function calls
    if (message.type === 'response.output_item.done' && message.item?.type === 'function_call') {
      const { name, arguments: args, call_id } = message.item;
      console.log('[TOOL-CALLING] 🔧 Unified function call detected!');
      console.log('[TOOL-CALLING] 📋 Full message.item:', JSON.stringify(message.item, null, 2));
      console.log('[TOOL-CALLING] 🎯 Function name:', name);
      console.log('[TOOL-CALLING] 📝 Raw arguments:', args);
      console.log('[TOOL-CALLING] 🆔 Call ID:', call_id);
      
      try {
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        console.log('[TOOL-CALLING] ✅ Parsed unified args:', parsedArgs);
        const result = await executeToolFunction(name, parsedArgs);
        console.log('[TOOL-CALLING] 🎉 Function execution result:', result);
        return result;
      } catch (error) {
        console.error('[TOOL-CALLING] ❌ Error parsing unified function call args:', error);
        console.error('[TOOL-CALLING] 💥 Error details:', error instanceof Error ? error.message : String(error));
        return { success: false, error: 'Invalid unified function call arguments' };
      }
    }
    
    // Manejar formato legacy
    if (message.type === 'response.function_call' && message.function_call) {
      const { name, arguments: args } = message.function_call;
      console.log('[TOOL-CALLING] 🔧 Legacy function call:', name, args);
      
      try {
        const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
        console.log('[TOOL-CALLING] 📋 Parsed legacy args:', parsedArgs);
        return await executeToolFunction(name, parsedArgs);
      } catch (error) {
        console.error('[TOOL-CALLING] ❌ Error parsing legacy function call args:', error);
        return { success: false, error: 'Invalid legacy function call arguments' };
      }
    }
    
    return null;
  }, [executeToolFunction]);

  // Exponer processFunctionCall globalmente para testing
  useEffect(() => {
    (window as any).processFunctionCall = processFunctionCall;
    (window as any).executeToolFunction = executeToolFunction;
    
    return () => {
      delete (window as any).processFunctionCall;
      delete (window as any).executeToolFunction;
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
