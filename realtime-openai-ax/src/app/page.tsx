'use client';

import { useEffect, JSX } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Home Page Component
 *
 * This component serves as the root page of the application.
 * It automatically redirects users to the Voice Ordering app route (`/voice-ordering`)
 * upon mounting. While the redirect is in progress, a simple loading UI is displayed.
 *
 * @returns {JSX.Element} The rendered home page with redirect logic.
 */
export default function Home(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the Voice Ordering application
    router.push('/voice-ordering');
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite',
          }}
        >
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
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
