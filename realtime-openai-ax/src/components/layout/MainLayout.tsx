/**
 * 🏗️ PATRÓN: Main Layout Pattern
 * 🎯 PRINCIPIO: Layout Composition + Responsive Design
 * 
 * MainLayout - Layout principal con background y estructura base
 * Replica el diseño de la aplicación original con Next.js
 */

'use client';

import React, { ReactNode } from 'react';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function MainLayout({ children, className = '' }: MainLayoutProps) {
  return (
    <div className={`${styles.page} ${className}`}>
      {/* Background overlay */}
      <div className={styles.backgroundOverlay} />
      
      {/* Main content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
