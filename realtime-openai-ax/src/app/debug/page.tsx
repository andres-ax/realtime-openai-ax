'use client';

import { useState } from 'react';

/**
 * 🔍 DEBUG PAGE
 * 
 * Página para debuggear la conexión con OpenAI Realtime API
 */

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testSession = async () => {
    setIsLoading(true);
    addLog('🚀 Testing session creation...');

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy'
        })
      });

      addLog(`📥 Session response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Session error: ${errorText}`);
        return;
      }

      const sessionData = await response.json();
      addLog(`✅ Session created: ${sessionData.session_id}`);
      addLog(`⏰ Expires at: ${sessionData.expires_at}`);
      addLog(`🔑 Client secret: ${sessionData.client_secret.value.substring(0, 20)}...`);

      return sessionData;

    } catch (error) {
      addLog(`❌ Session error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    addLog('🔗 Testing connection establishment...');

    try {
      // Primero crear sesión
      const sessionData = await testSession();
      if (!sessionData) return;

      // Luego establecer conexión
      const response = await fetch('/api/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          client_secret: sessionData.client_secret.value,
          agent_type: 'sales'
        })
      });

      addLog(`📥 Connection response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Connection error: ${errorText}`);
        return;
      }

      const connectionData = await response.json();
      addLog(`✅ Connection established: ${connectionData.connection_id}`);
      addLog(`🌐 WebSocket URL: ${connectionData.websocket_url}`);
      addLog(`🎤 Agent: ${connectionData.session_config.voice}`);

      return { sessionData, connectionData };

    } catch (error) {
      addLog(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWebSocket = async () => {
    setIsLoading(true);
    addLog('🌐 Testing WebSocket connection...');

    try {
      const result = await testConnection();
      if (!result) return;

      const { sessionData, connectionData } = result;

      // Construir URL del WebSocket correcta para OpenAI Realtime API
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${connectionData.session_config.model}`;
      addLog(`🔗 Attempting WebSocket connection to: ${wsUrl.substring(0, 50)}...`);
      addLog(`🔑 Using ephemeral key: ${sessionData.client_secret.value.substring(0, 20)}...`);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addLog('✅ WebSocket CONNECTED successfully!');
        
        // Enviar mensaje de creación de sesión con autenticación
        const sessionMessage = {
          type: 'session.create',
          session: {
            model: connectionData.session_config.model,
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful assistant for a voice ordering system.',
            voice: connectionData.session_config.voice,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            }
          },
          authorization: `Bearer ${sessionData.client_secret.value}`
        };
        
        addLog('📤 Sending session create with auth...');
        ws.send(JSON.stringify(sessionMessage));
        addLog('🎤 Ready to receive audio commands');
        
        // Cerrar después de 5 segundos para testing
        setTimeout(() => {
          ws.close();
          addLog('🔌 WebSocket closed (test complete)');
        }, 5000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          addLog(`📨 WebSocket message: ${message.type}`);
        } catch {
          addLog(`📨 WebSocket raw message: ${event.data}`);
        }
      };

      ws.onerror = (error) => {
        addLog(`❌ WebSocket ERROR: ${error}`);
      };

      ws.onclose = (event) => {
        addLog(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
      };

      // Timeout de 10 segundos
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          addLog('⏰ WebSocket connection timeout');
          ws.close();
        }
      }, 10000);

    } catch (error) {
      addLog(`❌ WebSocket test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>🔍 OpenAI Realtime API Debug</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={testSession} 
          disabled={isLoading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
        >
          🔑 Test Session
        </button>
        
        <button 
          onClick={testConnection} 
          disabled={isLoading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
        >
          🔗 Test Connection
        </button>
        
        <button 
          onClick={testWebSocket} 
          disabled={isLoading}
          style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
        >
          🌐 Test WebSocket
        </button>
        
        <button 
          onClick={clearLogs}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#ff6b6b', color: 'white' }}
        >
          🗑️ Clear Logs
        </button>
      </div>

      <div 
        style={{ 
          backgroundColor: '#1a1a1a', 
          color: '#00ff00', 
          padding: '1rem', 
          borderRadius: '4px',
          height: '400px',
          overflowY: 'auto',
          fontSize: '0.9rem',
          lineHeight: '1.4'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>Click a button to start testing...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))
        )}
      </div>

      {isLoading && (
        <div style={{ marginTop: '1rem', color: '#007acc' }}>
          🔄 Testing in progress...
        </div>
      )}
    </div>
  );
}
