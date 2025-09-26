/**
 * 🏗️ PATRÓN: Type Definition Pattern
 * 🎯 PRINCIPIO: Type Safety + Interface Segregation
 * 
 * Component Types - Definiciones de tipos para todos los componentes UI
 */

// MenuCarousel Types
export interface MenuItemData {
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface MenuCarouselProps {
  menuItems: MenuItemData[];
  onItemFocus?: (itemName: string) => void;
  activeIndex?: number;
  className?: string;
}

// VoiceInterface Types
export interface VoiceInterfaceProps {
  onSessionStart?: () => Promise<void>;
  onSessionStop?: () => void;
  onStatusChange?: (status: string, isActive: boolean) => void;
  className?: string;
}

// LiveCart Types
export interface CartItemData {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

export interface LiveCartProps {
  isVisible?: boolean;
  items?: CartItemData[];
  total?: number;
  onItemUpdate?: (itemName: string, newQuantity: number) => void;
  onItemRemove?: (itemName: string) => void;
  onCartClear?: () => void;
  onCheckout?: () => void;
  className?: string;
}

// CheckoutFlow Types
export interface CheckoutData {
  // Customer info
  customerName?: string;
  email?: string;
  phone?: string;
  
  // Delivery info
  deliveryAddress?: string;
  
  // Payment info
  cardNumber?: string;
  expirationDate?: string;
  cvv?: string;
  
  // Order info
  deliveryMethod?: string;
}

export interface CheckoutFlowProps {
  isVisible?: boolean;
  cartItems?: CartItemData[];
  cartTotal?: number;
  onOrderComplete?: (orderData: CheckoutData) => void;
  onBackToMenu?: () => void;
  className?: string;
}

// OrderComplete Types
export interface OrderCompleteProps {
  isVisible?: boolean;
  orderNumber?: string;
  customerName?: string;
  estimatedDelivery?: string;
  onNewOrder?: () => void;
  className?: string;
}

// MainLayout Types
export interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Common State Types
export type AppView = 'menu' | 'cart' | 'checkout' | 'complete';

export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AppState {
  currentView: AppView;
  isVoiceActive: boolean;
  voiceStatus: VoiceStatus;
  cartItems: CartItemData[];
  cartTotal: number;
  activeMenuItem?: string;
  orderData?: CheckoutData;
  orderNumber?: string;
}
