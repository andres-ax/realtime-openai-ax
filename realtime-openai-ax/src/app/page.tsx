'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente a la aplicación de Voice Ordering
    router.push('/voice-ordering');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          animation: 'pulse 2s infinite'
        }}>
          🎤 🍔
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Realtime OpenAI Voice Ordering
        </h1>
        <p style={{ opacity: 0.8 }}>
          Redirecting to voice ordering app...
        </p>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    </div>
  );
}
