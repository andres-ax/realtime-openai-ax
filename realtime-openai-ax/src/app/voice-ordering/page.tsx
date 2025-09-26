/**
 * VoiceOrderingPage - Main page for the voice ordering application.
 *
 * Architectural Patterns:
 * - Main Application Pattern
 * - State Management Pattern
 * 
 * Principles:
 * - Component Composition
 * - Event-Driven Architecture
 *
 * This page integrates all UI components with the domain architecture for a voice-driven food ordering experience.
 * 
 * Features:
 * - Displays menu items and allows users to add them to a cart.
 * - Supports voice-driven interactions for ordering, navigation, and checkout.
 * - Manages application state for cart, order, and view transitions.
 * - Handles event-driven updates from voice interface and other UI components.
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

/**
 * Static menu data (simulated, would typically come from an API or data file).
 */
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

/**
 * VoiceOrderingPage component.
 * 
 * Manages the main state and event handlers for the voice ordering flow.
 */
export default function VoiceOrderingPage() {
  /**
   * Application state hooks.
   */
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [, setIsVoiceActive] = useState(false);
  const [, setVoiceStatus] = useState<VoiceStatus>('disconnected');
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [activeMenuItem, setActiveMenuItem] = useState<string>(MENU_ITEMS[0]?.name || '');
  const [orderData, setOrderData] = useState<CheckoutData | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');

  /**
   * Calculates the total price of items in the cart.
   */
  const cartTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

  /**
   * Generates a unique order number.
   * @returns {string} The generated order number.
   */
  const generateOrderNumber = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  };

  /**
   * Voice session handlers.
   */
  const handleVoiceSessionStart = useCallback(async () => {
    console.log('🎤 Starting voice session...');
    // Integrate with RealtimeApiAdapter here if needed.
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('🎤 Voice session started');
  }, []);

  const handleVoiceSessionStop = useCallback(() => {
    console.log('🎤 Voice session stopped');
    setIsVoiceActive(false);
    setVoiceStatus('disconnected');
  }, []);

  /**
   * Handles changes in the voice interface status.
   * @param status - The new status string.
   * @param isActive - Whether the voice interface is active.
   */
  const handleVoiceStatusChange = useCallback((status: string, isActive: boolean) => {
    console.log('🎤 Voice status:', status, isActive);
    setIsVoiceActive(isActive);
    setVoiceStatus(isActive ? 'connected' : 'disconnected');
  }, []);

  /**
   * Handles function calls from the voice interface.
   * Connects to real use cases as needed.
   * @param functionName - The name of the function to call.
   * @param args - Arguments for the function.
   */
  const handleFunctionCall = useCallback(async (functionName: string, args: Record<string, unknown>) => {
    console.log(`[VOICE-ORDERING] Function called: ${functionName}`, args);
    try {
      switch (functionName) {
        case 'focus_menu_item':
          if (args.item_name) {
            setActiveMenuItem(args.item_name as string);
            console.log(`[VOICE-ORDERING] Focused menu item: ${args.item_name}`);
          }
          break;
        case 'order':
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
          if (args.customer_info || args.delivery_address) {
            console.log(`[VOICE-ORDERING] Updating order data:`, args);
            // Integrate with UpdateOrderCommand here if needed.
          }
          break;
        case 'transfer_to_menu_agent':
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

  /**
   * Handles focusing a menu item in the carousel.
   * @param itemName - The name of the menu item to focus.
   */
  const handleMenuItemFocus = useCallback((itemName: string) => {
    console.log('🎯 Focusing on menu item:', itemName);
    setActiveMenuItem(itemName);
    // Integrate with FocusMenuItemUseCase here if needed.
  }, []);

  /**
   * Handles updating the quantity of an item in the cart.
   * @param itemName - The name of the item.
   * @param newQuantity - The new quantity.
   */
  const handleItemUpdate = useCallback((itemName: string, newQuantity: number) => {
    console.log('🛒 Updating item:', itemName, 'quantity:', newQuantity);
    if (newQuantity === 0) {
      setCartItems(prev => prev.filter(item => item.menuItemName !== itemName));
    } else {
      setCartItems(prev => {
        const existingItem = prev.find(item => item.menuItemName === itemName);
        if (existingItem) {
          return prev.map(item =>
            item.menuItemName === itemName
              ? { ...item, quantity: newQuantity, subtotal: item.unitPrice * newQuantity }
              : item
          );
        } else {
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

  /**
   * Handles removing an item from the cart.
   * @param itemName - The name of the item to remove.
   */
  const handleItemRemove = useCallback((itemName: string) => {
    console.log('🗑️ Removing item:', itemName);
    setCartItems(prev => prev.filter(item => item.menuItemName !== itemName));
  }, []);

  /**
   * Handles clearing all items from the cart.
   */
  const handleCartClear = useCallback(() => {
    console.log('🗑️ Clearing cart');
    setCartItems([]);
  }, []);

  /**
   * Handles proceeding to the checkout view.
   */
  const handleCartCheckout = useCallback(() => {
    console.log('💳 Proceeding to checkout');
    setCurrentView('checkout');
  }, []);

  /**
   * Handles completion of an order in the checkout flow.
   * @param checkoutData - The completed checkout data.
   */
  const handleOrderComplete = useCallback((checkoutData: CheckoutData) => {
    console.log('✅ Order completed:', checkoutData);
    const newOrderNumber = generateOrderNumber();
    setOrderData(checkoutData);
    setOrderNumber(newOrderNumber);
    setCurrentView('complete');
    setCartItems([]);
    // Integrate with ProcessPaymentUseCase here if needed.
  }, []);

  /**
   * Handles returning to the menu view from checkout or order complete.
   */
  const handleBackToMenu = useCallback(() => {
    console.log('🔙 Back to menu');
    setCurrentView('menu');
  }, []);

  /**
   * Handles starting a new order after order completion.
   */
  const handleNewOrder = useCallback(() => {
    console.log('🆕 Starting new order');
    setCurrentView('menu');
    setOrderData(null);
    setOrderNumber('');
    setActiveMenuItem('');
  }, []);

  /**
   * Effect: Registers and cleans up event listeners for tool-calling and view changes.
   * Handles events such as updating the order, proceeding to payment, and direct view changes.
   */
  useEffect(() => {
    /**
     * Handles updating the cart from an external event.
     */
    const handleUpdateOrder = (event: CustomEvent) => {
      const { cart, customerConfirm } = event.detail;
      console.log('[VOICE-ORDERING] 🛒 Update order event:', { cart, customerConfirm });
      if (cart && Array.isArray(cart)) {
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

    /**
     * Handles proceeding to payment (switches to checkout view and notifies agent).
     */
    const handleProceedToPayment = () => {
      console.log('[VOICE-ORDERING] 💳 Proceed to payment event');
      setCurrentView('checkout');
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'payment', context: 'payment_flow' }
      });
      window.dispatchEvent(transferEvent);
    };

    /**
     * Handles proceeding to checkout (switches to checkout view and notifies agent).
     */
    const handleProceedToCheckout = () => {
      console.log('[VOICE-ORDERING] 🛒 Proceed to checkout event');
      setCurrentView('checkout');
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'payment', context: 'checkout_flow' }
      });
      window.dispatchEvent(transferEvent);
    };

    /**
     * Handles returning to the menu view and notifies agent.
     */
    const handleBackToMenu = () => {
      console.log('[VOICE-ORDERING] 🔙 Back to menu event');
      setCurrentView('menu');
      const transferEvent = new CustomEvent('transferAgent', {
        detail: { targetAgent: 'sales', context: 'back_to_menu' }
      });
      window.dispatchEvent(transferEvent);
    };

    /**
     * Handles updating order data from an external event.
     */
    const handleUpdateOrderData = (event: CustomEvent) => {
      const { updatedFields } = event.detail;
      console.log('[VOICE-ORDERING] 📝 Update order data event:', updatedFields);
      // Update checkout form fields here if needed.
    };
    
    /**
     * Handles direct view change to checkout.
     */
    const handleDirectViewCheckout = (event: CustomEvent) => {
      console.log('[VOICE-ORDERING] 🔄 Direct view change to checkout:', event.detail);
      setCurrentView('checkout');
    };
    
    /**
     * Handles direct view change to menu.
     */
    const handleDirectViewMenu = (event: CustomEvent) => {
      console.log('[VOICE-ORDERING] 🔄 Direct view change to menu:', event.detail);
      setCurrentView('menu');
    };

    /**
     * Handles order completion from an external event.
     */
    const handleOrderComplete = (event: CustomEvent) => {
      const { orderData } = event.detail;
      console.log('[VOICE-ORDERING] ✅ Order complete event:', orderData);
      const newOrderNumber = generateOrderNumber();
      setOrderNumber(newOrderNumber);
      setCurrentView('complete');
      setCartItems([]);
    };

    // Register event listeners
    window.addEventListener('updateOrder', handleUpdateOrder as EventListener);
    window.addEventListener('proceedToPayment', handleProceedToPayment as EventListener);
    window.addEventListener('proceedToCheckout', handleProceedToCheckout as EventListener);
    window.addEventListener('backToMenu', handleBackToMenu as EventListener);
    window.addEventListener('updateOrderData', handleUpdateOrderData as EventListener);
    window.addEventListener('orderComplete', handleOrderComplete as EventListener);
    window.addEventListener('directViewCheckout', handleDirectViewCheckout as EventListener);
    window.addEventListener('directViewMenu', handleDirectViewMenu as EventListener);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('updateOrder', handleUpdateOrder as EventListener);
      window.removeEventListener('proceedToPayment', handleProceedToPayment as EventListener);
      window.removeEventListener('proceedToCheckout', handleProceedToCheckout as EventListener);
      window.removeEventListener('backToMenu', handleBackToMenu as EventListener);
      window.removeEventListener('updateOrderData', handleUpdateOrderData as EventListener);
      window.removeEventListener('orderComplete', handleOrderComplete as EventListener);
      window.removeEventListener('directViewCheckout', handleDirectViewCheckout as EventListener);
      window.removeEventListener('directViewMenu', handleDirectViewMenu as EventListener);
    };
  }, []);

  return (
    <MainLayout>
      {/* Main header */}
      <h1>Choose Your Meal</h1>

      {/* Menu View */}
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

      {/* Checkout View */}
      {currentView === 'checkout' && (
        <CheckoutFlow
          isVisible={true}
          cartItems={cartItems}
          cartTotal={cartTotal}
          onOrderComplete={handleOrderComplete}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* Order Complete View */}
      {currentView === 'complete' && (
        <OrderComplete
          isVisible={true}
          orderNumber={orderNumber}
          customerName={orderData?.customerName}
          estimatedDelivery="4 days"
          onNewOrder={handleNewOrder}
        />
      )}

      {/* Voice Interface (always visible) */}
      <VoiceInterface
        onSessionStart={handleVoiceSessionStart}
        onSessionStop={handleVoiceSessionStop}
        onStatusChange={handleVoiceStatusChange}
        onFunctionCall={handleFunctionCall}
      />
    </MainLayout>
  );
}