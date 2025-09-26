/**
 * 🏗️ PATRÓN: Live Cart Pattern + Observer Pattern
 * 🎯 PRINCIPIO: Real-time Updates + State Synchronization
 * 
 * LiveCart - Panel de carrito en tiempo real
 * Se actualiza automáticamente con eventos del dominio
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './LiveCart.module.css';

interface CartItemData {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

interface LiveCartProps {
  isVisible?: boolean;
  items?: CartItemData[];
  total?: number;
  onItemUpdate?: (itemName: string, newQuantity: number) => void;
  onItemRemove?: (itemName: string) => void;
  onCartClear?: () => void;
  onCheckout?: () => void;
  className?: string;
}

export default function LiveCart({
  isVisible = false,
  items = [],
  total = 0,
  onItemUpdate,
  onItemRemove,
  onCartClear,
  onCheckout,
  className = ''
}: LiveCartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calcular si necesita modo expandido
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const contentHeight = items.length * 80 + 140; // Aproximado
      const viewportHeight = window.innerHeight;
      setIsExpanded(contentHeight > viewportHeight * 0.7);
    }
  }, [items.length]);

  // Manejar resize
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const contentHeight = items.length * 80 + 140;
        const viewportHeight = window.innerHeight;
        setIsExpanded(contentHeight > viewportHeight * 0.7);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [items.length]);

  // Animación de transición a checkout
  const animateToCheckout = useCallback(async () => {
    setIsTransitioning(true);
    
    // Esperar animación
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setIsTransitioning(false);
    onCheckout?.();
  }, [onCheckout]);

  // Formatear precio
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Obtener imagen del item (desde menu-data.json)
  const getItemImage = (itemName: string): string => {
    const imageMap: Record<string, string> = {
      "Big Burger Combo": "/images/menu/combo-postobon.png",
      "Double Cheeseburger": "/images/menu/Double_Cheeseburger.png",
      "Cheeseburger": "/images/menu/Cheeseburger.png",
      "Hamburger": "/images/menu/Hamburger.png",
      "Crispy Chicken Sandwich": "/images/menu/Crispy_Chicken_Sandwich.png",
      "Chicken Nuggets (6 pc)": "/images/menu/Chicken_Nuggets__6_pc.png",
      "Crispy Fish Sandwich": "/images/menu/Filet_Fish_Sandwich.png",
      "Fries": "/images/menu/Fries.png",
      "Baked Apple Pie": "/images/menu/Apple_Pie.png",
      "Manzana Postobon® Drink": "/images/menu/manzana-postobon-350-RET-1.png"
    };
    
    return imageMap[itemName] || '/images/menu/Hamburger.png';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <section 
      className={`
        ${styles.cartPanel} 
        ${isExpanded ? styles.expanded : ''} 
        ${isTransitioning ? styles.transitioning : ''}
        ${className}
      `}
      role="complementary"
      aria-label="Shopping cart"
    >
      {/* Header */}
      <div className={styles.cartHeader}>
        <h3>Your Order</h3>
        {items.length > 0 && (
          <button
            onClick={onCartClear}
            className={styles.clearButton}
            aria-label="Clear cart"
          >
            Clear
          </button>
        )}
      </div>

      {/* Items */}
      <div 
        className={styles.cartItems}
        role="list"
        aria-label="Cart items"
      >
        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <p>No items in your order yet</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.menuItemName}-${index}`}
              className={styles.cartItem}
              role="listitem"
            >
              <Image
                src={getItemImage(item.menuItemName)}
                alt={item.menuItemName}
                width={50}
                height={50}
                className={styles.itemImage}
              />
              
              <div className={styles.itemDetails}>
                <h4>{item.menuItemName}</h4>
                <div className={styles.itemMeta}>
                  <span>Qty: {item.quantity}</span>
                  <span>{formatPrice(item.subtotal)}</span>
                </div>
              </div>

              {/* Controles de cantidad */}
              <div className={styles.quantityControls}>
                <button
                  onClick={() => onItemUpdate?.(item.menuItemName, Math.max(0, item.quantity - 1))}
                  className={styles.quantityButton}
                  aria-label={`Decrease ${item.menuItemName} quantity`}
                >
                  −
                </button>
                <span className={styles.quantity}>{item.quantity}</span>
                <button
                  onClick={() => onItemUpdate?.(item.menuItemName, item.quantity + 1)}
                  className={styles.quantityButton}
                  aria-label={`Increase ${item.menuItemName} quantity`}
                >
                  +
                </button>
              </div>

              {/* Botón eliminar */}
              <button
                onClick={() => onItemRemove?.(item.menuItemName)}
                className={styles.removeButton}
                aria-label={`Remove ${item.menuItemName} from cart`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className={styles.cartFooter}>
          <div className={styles.cartTotal}>
            <span>Total:</span>
            <span className={styles.totalAmount}>{formatPrice(total)}</span>
          </div>
          
          <button
            onClick={animateToCheckout}
            className={styles.checkoutButton}
            disabled={items.length === 0}
          >
            Proceed to Checkout
          </button>
        </div>
      )}
    </section>
  );
}
