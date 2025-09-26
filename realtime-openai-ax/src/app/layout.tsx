/**
 * ==========================
 * 📄 RootLayout (App Layout)
 * --------------------------
 * This file defines the root layout for the Next.js application.
 * It sets up global font variables (Geist Sans and Geist Mono), applies global styles,
 * and wraps all pages with the required HTML structure.
 *
 * - Fonts: Loads Geist Sans and Geist Mono from Google Fonts and exposes their CSS variables.
 * - Metadata: Sets the default page title and description for SEO.
 * - Usage: All application pages are rendered as children inside the <body>.
 * ==========================
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Load Geist Sans font and expose as CSS variable
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Load Geist Mono font and expose as CSS variable
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Default metadata for the application (used by Next.js for SEO)
export const metadata: Metadata = {
  title: "Realtime Voice Ordering | OpenAI + Next.js",
  description: "Advanced voice-powered food ordering app with OpenAI Realtime API, WebRTC, and 3D carousel menu",
};

/**
 * RootLayout
 *
 * The main layout component for the app. Wraps all pages with the required HTML structure,
 * applies global font variables, and renders children components.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The page content to render inside the layout.
 * @returns {JSX.Element} The root HTML structure for the app.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
