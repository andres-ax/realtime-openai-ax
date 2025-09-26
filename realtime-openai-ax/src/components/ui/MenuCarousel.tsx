/**
 * 🏗️ PATRÓN: 3D Carousel Pattern + Observer Pattern
 * 🎯 PRINCIPIO: Interactive UI + State Management
 * 
 * MenuCarousel - Carousel 3D interactivo con 10 items de menú
 * Replica exactamente el comportamiento de la aplicación original
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './MenuCarousel.module.css';

interface MenuItemData {
  name: string;
  price: number;
  image: string;
  description: string;
}

interface MenuCarouselProps {
  menuItems: MenuItemData[];
  onItemFocus?: (itemName: string) => void;
  activeIndex?: number;
  className?: string;
}

export default function MenuCarousel({ 
  menuItems, 
  onItemFocus, 
  activeIndex = 0,
  className = ''
}: MenuCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const [isClient, setIsClient] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const totalItems = menuItems.length;
  const angle = 360 / totalItems;

  // Calcular radio basado en tamaño de pantalla
  const calculateRadius = (): number => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 600 ? 200 : 300;
    }
    return 300;
  };

  const [radius, setRadius] = useState(300); // Valor inicial fijo para SSR

  // Función de rotación
  const rotate = useCallback((direction: number) => {
    const newIndex = (currentIndex - direction + totalItems) % totalItems;
    setCurrentIndex(newIndex);
    
    // Notificar cambio de foco
    if (onItemFocus && menuItems[newIndex]) {
      onItemFocus(menuItems[newIndex].name);
    }
  }, [currentIndex, menuItems, onItemFocus, totalItems]);

  // 🔄 Función de rotación step-by-step (replicando lógica de carousel.js)
  const rotateToIndex = useCallback((targetIndex: number) => {
    if (targetIndex === currentIndex || isRotating) return;

    // Calcular diferencia mínima de rotación (lógica del carousel.js original)
    let delta = targetIndex - currentIndex;
    const half = Math.floor(totalItems / 2);
    
    if (delta > half) delta -= totalItems;
    else if (delta < -half) delta += totalItems;

    console.log(`[MENU-CAROUSEL] 🔄 Rotating from ${currentIndex} to ${targetIndex}, delta: ${delta}`);

    // Marcar como rotando
    setIsRotating(true);

    // Rotar step-by-step con animación
    let steps = 0;
    const maxSteps = Math.abs(delta);
    const direction = -Math.sign(delta); // Negativo porque así funciona en el original

    const rotateStep = () => {
      if (steps < maxSteps) {
        rotate(direction);
        steps++;
        // Continuar rotación con delay para animación suave
        setTimeout(rotateStep, 200); // 200ms entre pasos para mejor visibilidad
      } else {
        // Finalizar rotación
        setIsRotating(false);
        
        // Agregar efecto de focus al item final
        if (carouselRef.current) {
          const targetItem = carouselRef.current.querySelector(`[data-menu-item="${menuItems[targetIndex].name}"]`);
          if (targetItem) {
            targetItem.classList.add(styles.focused);
            setTimeout(() => {
              targetItem.classList.remove(styles.focused);
            }, 2000);
          }
        }
        
        // Notificar cambio de foco al final
        if (onItemFocus && menuItems[targetIndex]) {
          onItemFocus(menuItems[targetIndex].name);
        }
      }
    };

    rotateStep();
  }, [currentIndex, isRotating, menuItems, onItemFocus, totalItems, rotate]);

  // Efecto para manejar la hidratación
  useEffect(() => {
    setIsClient(true);
    setRadius(calculateRadius());
    
    // Notificar el item inicial como activo
    if (onItemFocus && menuItems[currentIndex]) {
      onItemFocus(menuItems[currentIndex].name);
    }
  }, [currentIndex, menuItems, onItemFocus]);

  // 🎯 Escuchar eventos de focus desde tool calling
  useEffect(() => {
    if (!isClient) return;

    const handleFocusMenuItem = (event: CustomEvent) => {
      const { itemName } = event.detail;
      const targetIndex = menuItems.findIndex(item => item.name === itemName);
      
      if (targetIndex !== -1 && targetIndex !== currentIndex) {
        console.log(`[MENU-CAROUSEL] 🎯 Focusing on: ${itemName} (index: ${targetIndex})`);
        
        // Implementar rotación step-by-step como en carousel.js original
        rotateToIndex(targetIndex);
      }
    };

    window.addEventListener('focusMenuItem', handleFocusMenuItem as EventListener);
    
    return () => {
      window.removeEventListener('focusMenuItem', handleFocusMenuItem as EventListener);
    };
  }, [isClient, menuItems, currentIndex, onItemFocus, rotateToIndex]);

  // Actualizar radio en resize
  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      setRadius(calculateRadius());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  // Control por teclado
  useEffect(() => {
    if (!isClient) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') rotate(-1);
      if (e.key === 'ArrowRight') rotate(1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClient, rotate]);

  // Control touch/swipe
  const [startX, setStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX === null) return;
    
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 50) rotate(-1);
    if (dx < -50) rotate(1);
    
    setStartX(null);
  };

  // Posicionar items en 3D
  const getItemStyle = (index: number) => {
    if (!isClient) {
      // Durante SSR, mostrar el primer item como activo
      const isFirstItem = index === 0;
      return {
        transform: isFirstItem ? 'translate3d(0px, 0, 300px) scale(1)' : 'translate3d(0px, 0, 0px) scale(0.8)',
        zIndex: isFirstItem ? 2 : 1,
      };
    }

    const rawAngle = ((index - currentIndex) * angle + 360) % 360;
    const isFront = rawAngle < 1e-6 || rawAngle > 360 - 1e-6;
    const itemAngle = isFront ? 0 : rawAngle;
    const rad = itemAngle * Math.PI / 180;
    const x = Math.sin(rad) * radius;
    const z = Math.cos(rad) * radius;
    const scale = Math.max(0.6, 1 - Math.abs(x) / (radius * 2));

    return {
      transform: `translate3d(${x.toFixed(2)}px, 0, ${z.toFixed(2)}px) scale(${scale.toFixed(6)})`,
      zIndex: isFront ? 2 : 1,
    };
  };

  // Sincronizar con prop activeIndex
  useEffect(() => {
    if (activeIndex !== currentIndex) {
      setCurrentIndex(activeIndex);
    }
  }, [activeIndex, currentIndex]);

  // 🎯 Exponer función de rotación para testing manual
  useEffect(() => {
    if (!isClient) return;

    // Exponer función global para testing desde consola
    (window as unknown as Record<string, (itemName: string) => void>).rotateCarouselTo = (itemName: string) => {
      const targetIndex = menuItems.findIndex(item => item.name === itemName);
      if (targetIndex !== -1) {
        console.log(`[MANUAL-ROTATION] Rotating to: ${itemName}`);
        rotateToIndex(targetIndex);
      } else {
        console.error(`[MANUAL-ROTATION] Item not found: ${itemName}`);
        console.log('Available items:', menuItems.map(item => item.name));
      }
    };

    // Exponer función para testing directo
    (window as unknown as Record<string, (itemName: string) => void>).testCarouselFocus = (itemName: string) => {
      const event = new CustomEvent('focusMenuItem', {
        detail: { itemName }
      });
      window.dispatchEvent(event);
    };

    return () => {
      delete (window as unknown as Record<string, unknown>).rotateCarouselTo;
      delete (window as unknown as Record<string, unknown>).testCarouselFocus;
    };
  }, [isClient, menuItems, rotateToIndex]);

  return (
    <section 
      className={`${styles.carouselContainer} ${!isClient ? styles.loading : ''} ${isRotating ? styles.rotating : ''} ${className}`}
      role="region" 
      aria-label="3D menu carousel"
    >
      <div 
        className={styles.carousel}
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {menuItems.map((item, index) => {
          const isActive = index === currentIndex;
          
          return (
            <div
              key={item.name}
              className={`${styles.carouselItem} ${isActive ? styles.active : ''}`}
              style={getItemStyle(index)}
              data-menu-item={item.name}
            >
              <Image
                src={item.image}
                alt={item.name}
                width={300}
                height={300}
                className={styles.itemImage}
                priority={index < 3} // Precargar primeros 3 items
              />
              
              <div className={styles.itemText}>
                <h3>{item.name}</h3>
                <p className={styles.price}>${item.price.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation controls (opcional) */}
      <div className={styles.controls}>
        <button 
          onClick={() => rotate(-1)}
          className={styles.navButton}
          aria-label="Previous item"
        >
          ←
        </button>
        <button 
          onClick={() => rotate(1)}
          className={styles.navButton}
          aria-label="Next item"
        >
          →
        </button>
      </div>
    </section>
  );
}