import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Configuración para Railway
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Optimizaciones para producción
  compress: true,
  poweredByHeader: false,
  // Configuración de imágenes para Railway
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development'
  }
};

export default nextConfig;
