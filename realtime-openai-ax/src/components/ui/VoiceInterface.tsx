/**
 * 🏗️ PATRÓN: Voice Interface Pattern + State Machine Pattern
 * 🎯 PRINCIPIO: Real-time Communication + User Feedback
 * 
 * VoiceInterface - Botón de micrófono con estados visuales
 * Integra con OpenAI Realtime API y WebRTC
 */

'use client';

import React, { useCallback, useEffect } from 'react';
import { useWebRTC, VoiceStatus, AgentType } from '../../hooks/useWebRTC';
import styles from './VoiceInterface.module.css';

interface VoiceInterfaceProps {
  onSessionStart?: () => Promise<void>;
  onSessionStop?: () => void;
  onStatusChange?: (status: string, isActive: boolean) => void;
  onAgentSwitch?: (agent: AgentType) => void;
  onMessage?: (message: unknown) => void;
  onFunctionCall?: (functionName: string, args: Record<string, unknown>) => void;
  className?: string;
}

export default function VoiceInterface({
  onSessionStart,
  onSessionStop,
  onStatusChange,
  onAgentSwitch,
  onMessage,
  onFunctionCall,
  className = ''
}: VoiceInterfaceProps) {
  
  // 🎤 Hook de WebRTC Simplificado
  const {
    status,
    isConnected,
    currentAgent,
    connect,
    disconnect,
    switchAgent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendMessage
  } = useWebRTC({
    onStatusChange: (newStatus) => {
      const statusText = getStatusText(newStatus);
      onStatusChange?.(statusText, newStatus === 'connected');
      console.log(`[VOICE-INTERFACE] Status: ${newStatus}`);
    },
    onAgentSwitch: (newAgent) => {
      onAgentSwitch?.(newAgent);
      console.log(`[VOICE-INTERFACE] Agent switched: ${newAgent}`);
    },
    onMessage: (message) => {
      onMessage?.(message);
      handleRealtimeMessage(message as Record<string, unknown>);
    },
    onError: (error) => {
      console.error('[VOICE-INTERFACE] Error:', error);
    }
  });

  // 🎯 Function Calling Handler
  const handleRealtimeMessage = useCallback((message: Record<string, unknown>) => {
    if (message.type === 'response.function_call_delta' && typeof message.function_call === 'object' && message.function_call) {
      const functionCall = message.function_call as { name: string; arguments: Record<string, unknown> };
      const { name, arguments: args } = functionCall;
      onFunctionCall?.(name, args);
      
      switch (name) {
        case 'focus_menu_item':
          console.log(`[VOICE-INTERFACE] Focus menu item: ${args.item_name}`);
          break;
        case 'order':
          console.log(`[VOICE-INTERFACE] Add to cart:`, args);
          break;
        case 'update_order_data':
          console.log(`[VOICE-INTERFACE] Update order data:`, args);
          break;
        case 'transfer_to_menu_agent':
          switchAgent('sales');
          break;
        case 'transfer_to_payment':
          console.log(`[VOICE-INTERFACE] Transfer to payment:`, args);
          switchAgent('payment');
          break;
      }
    }
  }, [switchAgent, onFunctionCall]);

  // 🔄 Escuchar eventos de transferencia de agente
  useEffect(() => {
    const handleTransferAgent = (event: CustomEvent) => {
      const { targetAgent } = event.detail;
      console.log(`[VOICE-INTERFACE] 🔄 Transfer agent event received: ${targetAgent}`);
      
      if (targetAgent === 'payment') {
        switchAgent('payment');
      } else if (targetAgent === 'sales') {
        switchAgent('sales');
      }
    };

    window.addEventListener('transferAgent', handleTransferAgent as EventListener);
    
    return () => {
      window.removeEventListener('transferAgent', handleTransferAgent as EventListener);
    };
  }, [switchAgent]);

  // 📝 Get Status Text
  const getStatusText = (status: VoiceStatus): string => {
    switch (status) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'connected': return `Connected (${currentAgent})`;
      case 'listening': return 'Listening...';
      case 'speaking': return 'Speaking...';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  // 🔄 Toggle Connection
  const toggleVoiceSession = useCallback(async () => {
    try {
      console.log('[VOICE-INTERFACE] 🔄 Toggle clicked, current state:', { isConnected, status });
      
      if (isConnected) {
        console.log('[VOICE-INTERFACE] 🔌 Disconnecting...');
        disconnect();
        onSessionStop?.();
      } else {
        console.log('[VOICE-INTERFACE] 🚀 Connecting with sales agent...');
        await connect('sales'); // Empezar con agente de ventas
        onSessionStart?.();
      }
    } catch (error) {
      console.error('[VOICE-INTERFACE] ❌ Toggle error:', error);
      console.error('[VOICE-INTERFACE] 🔍 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        isConnected,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }, [isConnected, status, connect, disconnect, onSessionStart, onSessionStop]);

  // Obtener clase de estado
  const getStatusClass = () => {
    switch (status) {
      case 'connected': return styles.connected;
      case 'connecting': return styles.connecting;
      case 'error': return styles.error;
      default: return '';
    }
  };

  return (
    <>
      {/* Botón de micrófono */}
      <button
        className={`${styles.micButton} ${isConnected ? styles.active : ''} ${getStatusClass()} ${className}`}
        onClick={toggleVoiceSession}
        title={isConnected ? 'Stop listening' : 'Start listening'}
        aria-label={isConnected ? 'Stop voice session' : 'Start voice session'}
      >
        {/* Icono de micrófono (visible por defecto) */}
        <svg 
          className={`${styles.micIcon} ${isConnected ? styles.hidden : ''}`}
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
        
        {/* Icono de pausa (visible cuando activo) */}
        <svg 
          className={`${styles.pauseIcon} ${!isConnected ? styles.hidden : ''}`}
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </button>

      {/* Indicadores de estado */}
      <div className={styles.statusContainer}>
        <div className={styles.status}>{getStatusText(status)}</div>
        <div className={`${styles.activity} ${status === 'connected' ? styles.active : ''}`} />
      </div>
    </>
  );
}
