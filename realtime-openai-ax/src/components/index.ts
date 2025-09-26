/**
 * 🏗️ PATRÓN: Barrel Exports Pattern
 * 🎯 PRINCIPIO: Module Consolidation + Clean Imports
 * 
 * Components Index - Exportaciones consolidadas de todos los componentes UI
 */

// Layout Components
export { default as MainLayout } from './layout/MainLayout';

// UI Components
export { default as MenuCarousel } from './ui/MenuCarousel';
export { default as VoiceInterface } from './ui/VoiceInterface';
export { default as LiveCart } from './ui/LiveCart';
export { default as OrderComplete } from './ui/OrderComplete';

// Form Components
export { default as CheckoutFlow } from './forms/CheckoutFlow';

// Types
export type { 
  // MenuCarousel types
  MenuItemData,
  MenuCarouselProps,
  
  // VoiceInterface types
  VoiceInterfaceProps,
  
  // LiveCart types
  CartItemData,
  LiveCartProps,
  
  // CheckoutFlow types
  CheckoutFlowProps,
  CheckoutData,
  
  // OrderComplete types
  OrderCompleteProps
} from './types';

// Re-export common interfaces for convenience
export interface MenuItem {
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}
