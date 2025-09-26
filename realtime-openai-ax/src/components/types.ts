/**
 * ==========================
 * 📚 Global UI Types (TypeScript)
 * --------------------------
 * Type and prop definitions for the main app components.
 * Each interface is clearly documented for ease of use and maintenance.
 * ==========================
 */

/* --- MenuCarousel --- */

/**
 * Represents a single menu item.
 */
export interface MenuItemData {
  /** Product name */
  name: string;
  /** Price in USD */
  price: number;
  /** Product image URL */
  image: string;
  /** Short product description */
  description: string;
}

/**
 * Props for the MenuCarousel component.
 */
export interface MenuCarouselProps {
  /** List of menu items to display in the carousel */
  menuItems: MenuItemData[];
  /** Optional callback when an item receives focus */
  onItemFocus?: (itemName: string) => void;
  /** Index of the currently active item */
  activeIndex?: number;
  /** Optional CSS class for custom styling */
  className?: string;
}

/* --- VoiceInterface --- */

/**
 * Props for the voice interface component.
 */
export interface VoiceInterfaceProps {
  /** Callback when the voice session starts */
  onSessionStart?: () => Promise<void>;
  /** Callback when the voice session stops */
  onSessionStop?: () => void;
  /** Callback when the voice status changes */
  onStatusChange?: (status: string, isActive: boolean) => void;
  /** Optional CSS class */
  className?: string;
}

/* --- LiveCart --- */

/**
 * Represents an item in the shopping cart.
 */
export interface CartItemData {
  /** Name of the menu product */
  menuItemName: string;
  /** Selected quantity */
  quantity: number;
  /** Unit price */
  unitPrice: number;
  /** Subtotal (unitPrice * quantity) */
  subtotal: number;
  /** Optional product image */
  image?: string;
}

/**
 * Props for the LiveCart component.
 */
export interface LiveCartProps {
  /** Whether the cart is visible */
  isVisible?: boolean;
  /** List of items in the cart */
  items?: CartItemData[];
  /** Cart total */
  total?: number;
  /** Callback to update the quantity of an item */
  onItemUpdate?: (itemName: string, newQuantity: number) => void;
  /** Callback to remove an item */
  onItemRemove?: (itemName: string) => void;
  /** Callback to clear the cart */
  onCartClear?: () => void;
  /** Callback to proceed to checkout */
  onCheckout?: () => void;
  /** Optional CSS class */
  className?: string;
}

/* --- CheckoutFlow --- */

/**
 * Data collected during the checkout process.
 */
export interface CheckoutData {
  /** Customer's full name */
  customerName?: string;
  /** Customer's email (optional, may be omitted in some flows) */
  email?: string;
  /** Contact phone number */
  phone?: string;
  /** Delivery address */
  deliveryAddress?: string;
  /** Credit card number */
  cardNumber?: string;
  /** Card expiration date (MM/YY) */
  expirationDate?: string;
  /** Card security code */
  cvv?: string;
  /** Selected delivery method */
  deliveryMethod?: string;
}

/**
 * Props for the checkout flow component.
 */
export interface CheckoutFlowProps {
  /** Whether the checkout flow is visible */
  isVisible?: boolean;
  /** Current cart items */
  cartItems?: CartItemData[];
  /** Cart total */
  cartTotal?: number;
  /** Callback when the order is completed */
  onOrderComplete?: (orderData: CheckoutData) => void;
  /** Callback to return to the menu */
  onBackToMenu?: () => void;
  /** Optional CSS class */
  className?: string;
}

/* --- OrderComplete --- */

/**
 * Props for the order confirmation component.
 */
export interface OrderCompleteProps {
  /** Whether the order complete screen is visible */
  isVisible?: boolean;
  /** Generated order number */
  orderNumber?: string;
  /** Customer's name */
  customerName?: string;
  /** Estimated delivery time */
  estimatedDelivery?: string;
  /** Callback to start a new order */
  onNewOrder?: () => void;
  /** Optional CSS class */
  className?: string;
}

/* --- MainLayout --- */

/**
 * Props for the main app layout.
 */
export interface MainLayoutProps {
  /** Child elements to render */
  children: React.ReactNode;
  /** Optional CSS class */
  className?: string;
}

/* --- Global State Types --- */

/**
 * Possible application views.
 */
export type AppView = 'menu' | 'cart' | 'checkout' | 'complete';

/**
 * Possible voice connection statuses.
 */
export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Global application state.
 */
export interface AppState {
  /** Current view */
  currentView: AppView;
  /** Whether voice is active */
  isVoiceActive: boolean;
  /** Voice connection status */
  voiceStatus: VoiceStatus;
  /** Current items in the cart */
  cartItems: CartItemData[];
  /** Cart total */
  cartTotal: number;
  /** Currently focused menu item (optional) */
  activeMenuItem?: string;
  /** Ongoing order data (optional) */
  orderData?: CheckoutData;
  /** Order number (optional) */
  orderNumber?: string;
}
