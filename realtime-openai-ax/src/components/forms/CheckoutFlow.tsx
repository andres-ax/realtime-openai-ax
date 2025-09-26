/**
 * 🏗️ PATRÓN: Checkout Flow Pattern + Form Validation Pattern
 * 🎯 PRINCIPIO: Multi-step Process + Data Validation
 * 
 * CheckoutFlow - Flujo completo de checkout con pago y entrega
 * Integra con Google Maps y procesamiento de pagos
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './CheckoutFlow.module.css';

interface CartItemData {
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string;
}

interface CheckoutData {
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

interface CheckoutFlowProps {
  isVisible?: boolean;
  cartItems?: CartItemData[];
  cartTotal?: number;
  onOrderComplete?: (orderData: CheckoutData) => void;
  onBackToMenu?: () => void;
  className?: string;
}

export default function CheckoutFlow({
  isVisible = false,
  cartItems = [],
  cartTotal = 0,
  onOrderComplete,
  onBackToMenu,
  className = ''
}: CheckoutFlowProps) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customerName: 'Enoc Silva',
    deliveryAddress: 'Shared Locker@Commons, 15255 NE 40th St, Redmond, WA 98052',
    cardNumber: '1234 1234 1234 1234',
    expirationDate: '12/25',
    cvv: '123',
    deliveryMethod: 'Free Delivery – $0.00'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔄 Event listener para actualizaciones de Karol
  useEffect(() => {
    const handleUpdateOrderData = (event: CustomEvent) => {
      const orderData = event.detail;
      console.log('[CHECKOUT-FLOW] 📝 Received order data update:', orderData);
      
      // Actualizar checkoutData con los datos recibidos de Karol
      setCheckoutData(prev => ({
        ...prev,
        // Mapear campos de Karol a campos del formulario
        ...(orderData.name && { customerName: orderData.name }),
        ...(orderData.address && { deliveryAddress: orderData.address }),
        ...(orderData.contact_phone && { phone: orderData.contact_phone }),
        ...(orderData.credit_card_number && { cardNumber: orderData.credit_card_number }),
        ...(orderData.expiration_date && { expirationDate: orderData.expiration_date }),
        ...(orderData.cvv && { cvv: orderData.cvv })
      }));
      
      // Limpiar errores de campos actualizados
      const updatedFields = Object.keys(orderData);
      if (updatedFields.length > 0) {
        setErrors(prev => {
          const newErrors = { ...prev };
          updatedFields.forEach(field => {
            // Mapear nombres de campos
            const fieldMap: Record<string, string> = {
              name: 'customerName',
              address: 'deliveryAddress',
              contact_phone: 'phone',
              credit_card_number: 'cardNumber',
              expiration_date: 'expirationDate',
              cvv: 'cvv'
            };
            const mappedField = fieldMap[field];
            if (mappedField && newErrors[mappedField]) {
              delete newErrors[mappedField];
            }
          });
          return newErrors;
        });
      }
    };

    // Registrar event listener
    window.addEventListener('updateOrderData', handleUpdateOrderData as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('updateOrderData', handleUpdateOrderData as EventListener);
    };
  }, []);

  // Calcular total de items
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Formatear precio
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Obtener imagen del item
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

  // Actualizar campo
  const updateField = (field: keyof CheckoutData, value: string) => {
    setCheckoutData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validar formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!checkoutData.customerName?.trim()) {
      newErrors.customerName = 'Name is required';
    }

    if (!checkoutData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(checkoutData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!checkoutData.phone?.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!checkoutData.deliveryAddress?.trim()) {
      newErrors.deliveryAddress = 'Delivery address is required';
    }

    if (!checkoutData.cardNumber?.trim()) {
      newErrors.cardNumber = 'Card number is required';
    }

    if (!checkoutData.expirationDate?.trim()) {
      newErrors.expirationDate = 'Expiration date is required';
    }

    if (!checkoutData.cvv?.trim()) {
      newErrors.cvv = 'CVV is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Procesar orden
  const handleOrderSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onOrderComplete?.(checkoutData);
    } catch (error) {
      console.error('Error processing order:', error);
      setErrors({ general: 'Failed to process order. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Actualizar mapa cuando cambie la dirección
  useEffect(() => {
    if (checkoutData.deliveryAddress) {
      // En una implementación real, aquí se actualizaría el mapa
      console.log('Updating map for address:', checkoutData.deliveryAddress);
    }
  }, [checkoutData.deliveryAddress]);

  if (!isVisible) {
    return null;
  }

  return (
    <section 
      className={`${styles.checkoutSection} ${className}`}
      aria-labelledby="checkout-heading"
    >
      <div className={styles.checkoutContainer}>
        {/* Panel izquierdo: Resumen del carrito */}
        <div className={styles.cartSummary}>
          <h2 id="checkout-heading">Checkout</h2>
          
          <p className={styles.cartCount} aria-live="polite">
            {itemCount} item{itemCount !== 1 ? 's' : ''} in cart
          </p>

          <div className={styles.cartItems} role="list" aria-label="Items in your cart">
            {cartItems.map((item, index) => (
              <div key={`${item.menuItemName}-${index}`} className={styles.cartItem}>
                <Image
                  src={getItemImage(item.menuItemName)}
                  alt={item.menuItemName}
                  width={60}
                  height={60}
                  className={styles.itemImage}
                />
                <div className={styles.itemDetails}>
                  <h4>{item.menuItemName}</h4>
                  <p>Qty: {item.quantity}</p>
                  <p>{formatPrice(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.total}>
            <span>Total:</span>
            <span className={styles.totalAmount} aria-live="polite">
              {formatPrice(cartTotal)}
            </span>
          </div>

          <button 
            onClick={handleOrderSubmit}
            disabled={isProcessing || cartItems.length === 0}
            className={styles.proceedButton}
          >
            {isProcessing ? 'Processing...' : 'Place Order'}
          </button>

          {errors.general && (
            <div className={styles.errorMessage}>{errors.general}</div>
          )}
        </div>

        {/* Panel derecho: Detalles de orden y entrega */}
        <div className={styles.orderDetails}>
          <h3>Order & Delivery Details</h3>
          
          <div className={styles.detailsGrid}>
            {/* Mapa */}
            <div className={styles.mapContainer} aria-label="Delivery map">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBLXq4XwucYgswkEICrCiSKqjshpjt2DZg&q=${encodeURIComponent(checkoutData.deliveryAddress || '')}`}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Delivery location map"
              />
            </div>

            {/* Información de entrega */}
            <fieldset className={styles.fieldset}>
              <legend>Delivery Information</legend>
              
              <div className={styles.formGroup}>
                <label htmlFor="customer-name">Full Name</label>
                <input
                  type="text"
                  id="customer-name"
                  value={checkoutData.customerName || ''}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className={errors.customerName ? styles.error : ''}
                  autoComplete="name"
                />
                {errors.customerName && (
                  <span className={styles.fieldError}>{errors.customerName}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="delivery-address">Delivery Address</label>
                <input
                  type="text"
                  id="delivery-address"
                  value={checkoutData.deliveryAddress || ''}
                  onChange={(e) => updateField('deliveryAddress', e.target.value)}
                  className={errors.deliveryAddress ? styles.error : ''}
                  autoComplete="address-line1"
                />
                {errors.deliveryAddress && (
                  <span className={styles.fieldError}>{errors.deliveryAddress}</span>
                )}
              </div>
            </fieldset>

            {/* Método de pago */}
            <fieldset className={styles.fieldset}>
              <legend>Payment Method</legend>
              
              <div className={styles.formGroup}>
                <label htmlFor="card-number">Card Number</label>
                <input
                  type="text"
                  id="card-number"
                  value={checkoutData.cardNumber || ''}
                  onChange={(e) => updateField('cardNumber', e.target.value)}
                  className={errors.cardNumber ? styles.error : ''}
                  autoComplete="cc-number"
                />
                {errors.cardNumber && (
                  <span className={styles.fieldError}>{errors.cardNumber}</span>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="expiration">Expiration</label>
                  <input
                    type="text"
                    id="expiration"
                    placeholder="MM/YY"
                    value={checkoutData.expirationDate || ''}
                    onChange={(e) => updateField('expirationDate', e.target.value)}
                    className={errors.expirationDate ? styles.error : ''}
                    autoComplete="cc-exp"
                  />
                  {errors.expirationDate && (
                    <span className={styles.fieldError}>{errors.expirationDate}</span>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="cvv">CVV</label>
                  <input
                    type="text"
                    id="cvv"
                    value={checkoutData.cvv || ''}
                    onChange={(e) => updateField('cvv', e.target.value)}
                    className={errors.cvv ? styles.error : ''}
                    autoComplete="cc-csc"
                  />
                  {errors.cvv && (
                    <span className={styles.fieldError}>{errors.cvv}</span>
                  )}
                </div>
              </div>
            </fieldset>

            {/* Información de contacto */}
            <fieldset className={styles.fieldset}>
              <legend>Contact Information</legend>
              
              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  value={checkoutData.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className={errors.phone ? styles.error : ''}
                  autoComplete="tel"
                />
                {errors.phone && (
                  <span className={styles.fieldError}>{errors.phone}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={checkoutData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={errors.email ? styles.error : ''}
                  autoComplete="email"
                />
                {errors.email && (
                  <span className={styles.fieldError}>{errors.email}</span>
                )}
              </div>
            </fieldset>

            {/* Método de entrega */}
            <fieldset className={styles.fieldset}>
              <legend>Delivery Method</legend>
              <p className={styles.deliveryMethod}>
                {checkoutData.deliveryMethod}
              </p>
            </fieldset>
          </div>
        </div>
      </div>

      {/* Botón volver al menú */}
      {onBackToMenu && (
        <button 
          onClick={onBackToMenu}
          className={styles.backButton}
        >
          ← Back to Menu
        </button>
      )}
    </section>
  );
}
