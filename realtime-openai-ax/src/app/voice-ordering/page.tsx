/**
 * 🏗️ PATRÓN: Main Application Pattern + State Management Pattern
 * 🎯 PRINCIPIO: Component Composition + Event-Driven Architecture
 * 
 * Voice Ordering Page - Página principal de la aplicación de pedidos por voz
 * Integra todos los componentes UI con la arquitectura del dominio
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MainLayout,
  MenuCarousel,
  VoiceInterface,
  LiveCart,
  CheckoutFlow,
  OrderComplete
} from '@/components';
import type { 
  MenuItemData,
  CartItemData,
  CheckoutData,
  AppView,
  VoiceStatus 
} from '@/components/types';

// Datos del menú (simulados desde menu-data.json)
const MENU_ITEMS: MenuItemData[] = [
  {
    name: "Big Burger Combo",
    price: 14.89,
    image: "/images/menu/combo-postobon.png",
    description: "Classic burger with fries and medium drink - our signature combo meal"
  },
  {
    name: "Double Cheeseburger",
    price: 5.79,
    image: "/images/menu/Double_Cheeseburger.png",
    description: "Two beef patties with American cheese, pickles, onions, ketchup and mustard"
  },
  {
    name: "Cheeseburger",
    price: 3.49,
    image: "/images/menu/Cheeseburger.png",
    description: "Single beef patty with American cheese, pickles, onions, ketchup and mustard"
  },
  {
    name: "Hamburger",
    price: 2.99,
    image: "/images/menu/Hamburger.png",
    description: "Simple and classic - beef patty with pickles, onions, ketchup and mustard"
  },
  {
    name: "Crispy Chicken Sandwich",
    price: 4.99,
    image: "/images/menu/Crispy_Chicken_Sandwich.png",
    description: "Crispy breaded chicken breast with fresh lettuce and creamy mayo"
  },
  {
    name: "Chicken Nuggets (6 pc)",
    price: 4.49,
    image: "/images/menu/Chicken_Nuggets__6_pc.png",
    description: "Six pieces of golden crispy chicken nuggets with your choice of dipping sauce"
  },
  {
    name: "Crispy Fish Sandwich",
    price: 5.29,
    image: "/images/menu/Filet_Fish_Sandwich.png",
    description: "Golden fried fish fillet with tartar sauce and fresh shredded lettuce"
  },
  {
    name: "Fries",
    price: 3.19,
    image: "/images/menu/Fries.png",
    description: "Golden crispy french fries - available in small, medium, or large sizes"
  },
  {
    name: "Baked Apple Pie",
    price: 1.79,
    image: "/images/menu/Apple_Pie.png",
    description: "Warm handheld pie filled with sweet cinnamon apples and flaky crust"
  },
  {
    name: "Manzana Postobon® Drink",
    price: 1.49,
    image: "/images/menu/manzana-postobon-350-RET-1.png",
    description: "Ice-cold, refreshing Colombian apple-flavored soda"
  }
];

export default function VoiceOrderingPage() {
  // Estado principal de la aplicación
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [, setIsVoiceActive] = useState(false);
  const [, setVoiceStatus] = useState<VoiceStatus>('disconnected');
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [activeMenuItem, setActiveMenuItem] = useState<string>(MENU_ITEMS[0]?.name || '');
  const [orderData, setOrderData] = useState<CheckoutData | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');

  // Calcular total del carrito
  const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Generar número de orden
  const generateOrderNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  };

  // Handlers de Voice Interface
  const handleVoiceSessionStart = useCallback(async () => {
    console.log('🎤 Starting voice session...');
    
    // Aquí se integraría con RealtimeApiAdapter
    // const realtimeAdapter = new RealtimeApiAdapter(...);
    // await realtimeAdapter.startSession();
    
    // Simulación por ahora
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🎤 Voice session started');
  }, []);

  const handleVoiceSessionStop = useCallback(() => {
    console.log('🎤 Voice session stopped');
    setIsVoiceActive(false);
    setVoiceStatus('disconnected');
  }, []);

  const handleVoiceStatusChange = useCallback((status: string, isActive: boolean) => {
    console.log('🎤 Voice status:', status, isActive);
    setIsVoiceActive(isActive);
    setVoiceStatus(isActive ? 'connected' : 'disconnected');
  }, []);

  // 🎯 Function Calling Handler - Conectar con Use Cases reales
  const handleFunctionCall = useCallback(async (functionName: string, args: Record<string, unknown>) => {
    console.log(`[VOICE-ORDERING] Function called: ${functionName}`, args);
    
    try {
      switch (functionName) {
        case 'focus_menu_item':
          // Usar FocusMenuItemUseCase
          if (args.item_name) {
            setActiveMenuItem(args.item_name as string);
            console.log(`[VOICE-ORDERING] Focused menu item: ${args.item_name}`);
          }
          break;
          
        case 'order':
          // Usar UpdateCartUseCase
          if (args.item_name && args.quantity) {
            const menuItem = MENU_ITEMS.find(item => item.name === args.item_name);
            if (menuItem) {
              const quantity = parseInt(args.quantity as string) || 1;
              const newItem: CartItemData = {
                menuItemName: menuItem.name,
                quantity: quantity,
                unitPrice: menuItem.price,
                subtotal: menuItem.price * quantity,
                image: menuItem.image
              };
              
              setCartItems(prev => [...prev, newItem]);
              console.log(`[VOICE-ORDERING] Added to cart:`, newItem);
            }
          }
          break;
          
        case 'update_order_data':
          // Actualizar datos del pedido
          if (args.customer_info || args.delivery_address) {
            console.log(`[VOICE-ORDERING] Updating order data:`, args);
            // Aquí se conectaría con UpdateOrderCommand
          }
          break;
          
        case 'transfer_to_menu_agent':
          // Cambiar vista si es necesario
          if (currentView !== 'menu') {
            setCurrentView('menu');
          }
          console.log(`[VOICE-ORDERING] Transferred to menu agent`);
          break;
      }
    } catch (error) {
      console.error(`[VOICE-ORDERING] Error handling function call:`, error);
    }
  }, [currentView]);

  // Handlers de MenuCarousel
  const handleMenuItemFocus = useCallback((itemName: string) => {
    console.log('🎯 Focusing on menu item:', itemName);
    setActiveMenuItem(itemName);
    
    // Aquí se integraría con FocusMenuItemUseCase
    // const focusUseCase = new FocusMenuItemUseCase(...);
    // await focusUseCase.execute(new FocusMenuItemCommand(...));
  }, []);

  // Handlers de LiveCart
  const handleItemUpdate = useCallback((itemName: string, newQuantity: number) => {
    console.log('🛒 Updating item:', itemName, 'quantity:', newQuantity);
    
    if (newQuantity === 0) {
      // Remover item
      setCartItems(prev => prev.filter(item => item.menuItemName !== itemName));
    } else {
      // Actualizar cantidad
      setCartItems(prev => {
        const existingItem = prev.find(item => item.menuItemName === itemName);
        if (existingItem) {
          return prev.map(item =>
            item.menuItemName === itemName
              ? { ...item, quantity: newQuantity, subtotal: item.unitPrice * newQuantity }
              : item
          );
        } else {
          // Agregar nuevo item
          const menuItem = MENU_ITEMS.find(item => item.name === itemName);
          if (menuItem) {
            return [...prev, {
              menuItemName: itemName,
              quantity: newQuantity,
              unitPrice: menuItem.price,
              subtotal: menuItem.price * newQuantity
            }];
          }
        }
        return prev;
      });
    }
  }, []);

  const handleItemRemove = useCallback((itemName: string) => {
    console.log('🗑️ Removing item:', itemName);
    setCartItems(prev => prev.filter(item => item.menuItemName !== itemName));
  }, []);

  const handleCartClear = useCallback(() => {
    console.log('🗑️ Clearing cart');
    setCartItems([]);
  }, []);

  const handleCartCheckout = useCallback(() => {
    console.log('💳 Proceeding to checkout');
    setCurrentView('checkout');
  }, []);

  // Handlers de CheckoutFlow
  const handleOrderComplete = useCallback((checkoutData: CheckoutData) => {
    console.log('✅ Order completed:', checkoutData);
    
    const newOrderNumber = generateOrderNumber();
    setOrderData(checkoutData);
    setOrderNumber(newOrderNumber);
    setCurrentView('complete');
    
    // Limpiar carrito
    setCartItems([]);
    
    // Aquí se integraría con ProcessPaymentUseCase
    // const paymentUseCase = new ProcessPaymentUseCase(...);
    // await paymentUseCase.execute(new ProcessPaymentCommand(...));
  }, []);

  const handleBackToMenu = useCallback(() => {
    console.log('🔙 Back to menu');
    setCurrentView('menu');
  }, []);

  // Handler de OrderComplete
  const handleNewOrder = useCallback(() => {
    console.log('🆕 Starting new order');
    setCurrentView('menu');
    setOrderData(null);
    setOrderNumber('');
    setActiveMenuItem('');
  }, []);

  // 🎯 Efectos para manejar eventos de tool calling
  useEffect(() => {
    // Handler para actualizar orden completa
    const handleUpdateOrder = (event: CustomEvent) => {
      const { cart, customerConfirm } = event.detail;
      console.log('[VOICE-ORDERING] 🛒 Update order event:', { cart, customerConfirm });
      
      if (cart && Array.isArray(cart)) {
        // Convertir formato de cart de tool calling a formato interno
        const newCartItems: CartItemData[] = cart.map(item => {
          const menuItem = MENU_ITEMS.find(m => m.name === item.menu_item);
          return {
            menuItemName: item.menu_item,
            quantity: item.quantity,
            unitPrice: menuItem?.price || 0,
            subtotal: (menuItem?.price || 0) * item.quantity,
            image: menuItem?.image || ''
          };
        });
        
        setCartItems(newCartItems);
      }
    };

    // Handler para proceder a pago
    const handleProceedToPayment = () => {
      console.log('[VOICE-ORDERING] 💳 Proceed to payment event');
      
      // Cambiar vista a checkout
      setCurrentView('checkout');
      
      // Disparar evento para cambiar agente a payment
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'payment', context: 'payment_flow' }
      });
      window.dispatchEvent(transferEvent);
    };

    // Handler para proceder a checkout
    const handleProceedToCheckout = () => {
      console.log('[VOICE-ORDERING] 🛒 Proceed to checkout event');
      
      // Cambiar vista a checkout
      setCurrentView('checkout');
      
      // Disparar evento para cambiar agente a payment
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'payment', context: 'checkout_flow' }
      });
      window.dispatchEvent(transferEvent);
    };

    // Handler para volver al menú
    const handleBackToMenu = () => {
      console.log('[VOICE-ORDERING] 🔙 Back to menu event');
      
      // Cambiar vista a menu
      setCurrentView('menu');
      
      // Disparar evento para cambiar agente a sales
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'sales', context: 'back_to_menu' }
      });
      window.dispatchEvent(transferEvent);
    };

    // Handler para actualizar datos del pedido
    const handleUpdateOrderData = (event: CustomEvent) => {
      const { updatedFields } = event.detail;
      console.log('[VOICE-ORDERING] 📝 Update order data event:', updatedFields);
      
      // Aquí se actualizarían los campos del formulario de checkout
      // Por ahora solo logueamos para debug
    };
    
    // Handlers para cambio directo de vista (desde VoiceInterface)
    const handleDirectViewCheckout = (event: CustomEvent) => {
      console.log('[VOICE-ORDERING] 🔄 Direct view change to checkout:', event.detail);
      setCurrentView('checkout');
    };
    
    const handleDirectViewMenu = (event: CustomEvent) => {
      console.log('[VOICE-ORDERING] 🔄 Direct view change to menu:', event.detail);
      setCurrentView('menu');
    };

    // Handler para orden completa
    const handleOrderComplete = (event: CustomEvent) => {
      const { orderData } = event.detail;
      console.log('[VOICE-ORDERING] ✅ Order complete event:', orderData);
      
      const newOrderNumber = generateOrderNumber();
      setOrderNumber(newOrderNumber);
      setCurrentView('complete');
      setCartItems([]); // Limpiar carrito
    };

    // Handler para cambio de agente
    // Handler para transferencia de agente - REMOVIDO
    // El cambio de agente se maneja directamente en VoiceInterface
    // para evitar event listeners duplicados

    // Registrar event listeners
    window.addEventListener('updateOrder', handleUpdateOrder as EventListener);
    window.addEventListener('proceedToPayment', handleProceedToPayment as EventListener);
    window.addEventListener('proceedToCheckout', handleProceedToCheckout as EventListener);
    window.addEventListener('backToMenu', handleBackToMenu as EventListener);
    window.addEventListener('updateOrderData', handleUpdateOrderData as EventListener);
    window.addEventListener('orderComplete', handleOrderComplete as EventListener);
    window.addEventListener('directViewCheckout', handleDirectViewCheckout as EventListener);
    window.addEventListener('directViewMenu', handleDirectViewMenu as EventListener);
    // window.addEventListener('transferAgent', handleTransferAgent as EventListener); // REMOVIDO - evitar duplicados

    return () => {
      window.removeEventListener('updateOrder', handleUpdateOrder as EventListener);
      window.removeEventListener('proceedToPayment', handleProceedToPayment as EventListener);
      window.removeEventListener('proceedToCheckout', handleProceedToCheckout as EventListener);
      window.removeEventListener('backToMenu', handleBackToMenu as EventListener);
      window.removeEventListener('updateOrderData', handleUpdateOrderData as EventListener);
      window.removeEventListener('orderComplete', handleOrderComplete as EventListener);
      window.removeEventListener('directViewCheckout', handleDirectViewCheckout as EventListener);
      window.removeEventListener('directViewMenu', handleDirectViewMenu as EventListener);
      // window.removeEventListener('transferAgent', handleTransferAgent as EventListener); // REMOVIDO - evitar duplicados
    };
  }, []);

  return (
    <MainLayout>
      {/* Header */}
      <h1>Choose Your Meal</h1>

      {/* Vista Menu */}
      {currentView === 'menu' && (
        <>
          <MenuCarousel
            menuItems={MENU_ITEMS}
            onItemFocus={handleMenuItemFocus}
            activeIndex={activeMenuItem ? MENU_ITEMS.findIndex(item => item.name === activeMenuItem) : 0}
          />
          
          <LiveCart
            isVisible={cartItems.length > 0}
            items={cartItems}
            total={cartTotal}
            onItemUpdate={handleItemUpdate}
            onItemRemove={handleItemRemove}
            onCartClear={handleCartClear}
            onCheckout={handleCartCheckout}
          />
        </>
      )}

      {/* Vista Checkout */}
      {currentView === 'checkout' && (
        <CheckoutFlow
          isVisible={true}
          cartItems={cartItems}
          cartTotal={cartTotal}
          onOrderComplete={handleOrderComplete}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* Vista Order Complete */}
      {currentView === 'complete' && (
        <OrderComplete
          isVisible={true}
          orderNumber={orderNumber}
          customerName={orderData?.customerName}
          estimatedDelivery="4 days"
          onNewOrder={handleNewOrder}
        />
      )}

      {/* Voice Interface (siempre visible) */}
      <VoiceInterface
        onSessionStart={handleVoiceSessionStart}
        onSessionStop={handleVoiceSessionStop}
        onStatusChange={handleVoiceStatusChange}
        onFunctionCall={handleFunctionCall}
      />
    </MainLayout>
  );
}