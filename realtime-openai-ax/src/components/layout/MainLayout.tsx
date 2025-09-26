/**
 * ==========================
 * 📚 MainLayout Component (TypeScript)
 * --------------------------
 * Provides the main application layout with a background overlay and responsive structure.
 * Designed to replicate the original app's layout using Next.js.
 * ==========================
 */

'use client';

import React, { ReactNode, JSX } from 'react';
import styles from './MainLayout.module.css';

/**
 * Props for the MainLayout component.
 */
interface MainLayoutProps {
  /** Child elements to render within the main layout */
  children: ReactNode;
  /** Optional additional CSS class for custom styling */
  className?: string;
}

/**
 * MainLayout
 *
 * Wraps the application content with a styled background overlay and main content area.
 * Ensures consistent layout and responsive design across the app.
 *
 * @param {MainLayoutProps} props - The properties for the MainLayout component.
 * @returns {JSX.Element} The rendered layout container.
 */
export default function MainLayout({ children, className = '' }: MainLayoutProps): JSX.Element {
  return (
    <div className={`${styles.page} ${className}`}>
      {/* Background overlay for visual effect */}
      <div className={styles.backgroundOverlay} />
      {/* Main content area */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
