/**
 * 🏗️ PATRÓN: Success State Pattern + Confirmation Pattern
 * 🎯 PRINCIPIO: User Feedback + Order Confirmation
 * 
 * OrderComplete - Pantalla de confirmación de pedido completado
 * Muestra detalles del pedido y próximos pasos
 */

'use client';

import React from 'react';
import styles from './OrderComplete.module.css';

interface OrderCompleteProps {
  isVisible?: boolean;
  orderNumber?: string;
  customerName?: string;
  estimatedDelivery?: string;
  onNewOrder?: () => void;
  className?: string;
}

export default function OrderComplete({
  isVisible = false,
  orderNumber = 'ORD-12345',
  customerName = 'Customer',
  estimatedDelivery = '4 days',
  onNewOrder,
  className = ''
}: OrderCompleteProps) {
  
  if (!isVisible) {
    return null;
  }

  return (
    <section className={`${styles.orderCompleteSection} ${className}`}>
      <div className={styles.successCard}>
        {/* Checkmark icon */}
        <svg 
          className={styles.checkIcon} 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M9 16.17l-3.88-3.88-1.41 1.41L9 19 20.3 7.71l-1.41-1.41z"/>
        </svg>

        <h2>Thank you for your order{customerName ? `, ${customerName}` : ''}!</h2>
        
        <div className={styles.orderInfo}>
          <p>You'll get a confirmation email and shipping updates.</p>
          <p className={styles.orderNumber}>
            Order #<span>{orderNumber}</span>
          </p>
          
          {estimatedDelivery && (
            <p className={styles.deliveryInfo}>
              Estimated delivery: <strong>{estimatedDelivery}</strong>
            </p>
          )}
        </div>

        <div className={styles.nextSteps}>
          <h3>What happens next?</h3>
          <ul>
            <li>📧 You'll receive an email confirmation shortly</li>
            <li>👨‍🍳 Our kitchen will start preparing your order</li>
            <li>🚚 You'll get tracking updates via SMS and email</li>
            <li>🎉 Enjoy your delicious meal!</li>
          </ul>
        </div>

        {onNewOrder && (
          <button 
            onClick={onNewOrder}
            className={styles.newOrderButton}
          >
            Place Another Order
          </button>
        )}
      </div>

      {/* Background animation */}
      <div className={styles.confetti} aria-hidden="true">
        {Array.from({ length: 50 }, (_, i) => (
          <div 
            key={i} 
            className={styles.confettiPiece}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['#e74c3c', '#f39c12', '#27ae60', '#3498db', '#9b59b6'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
      </div>
    </section>
  );
}
