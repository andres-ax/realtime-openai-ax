'use client';

import { useState, useCallback, useRef } from 'react';
import { useToolCalling } from './useToolCalling';

/**
 * 🎤 WEBRTC HOOK SIMPLIFICADO
 * 
 * Basado en el proyecto exitoso cameronking4/openai-realtime-api-nextjs
 * Enfoque directo sin capas de abstracción innecesarias
 */

export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';
export type AgentType = 'sales' | 'payment';

interface SessionData {
  client_secret: {
    value: string;
    expires_at: number;
  };
  session_id: string;
  expires_at: number;
}

interface UseWebRTCOptions {
  onStatusChange?: (status: VoiceStatus) => void;
  onMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
  onAgentSwitch?: (agent: AgentType) => void;
}

interface UseWebRTCReturn {
  status: VoiceStatus;
  isConnected: boolean;
  currentAgent: AgentType;
  connect: (agentType?: AgentType) => Promise<void>;
  disconnect: () => void;
  switchAgent: (newAgent: AgentType) => Promise<void>;
  sendMessage: (message: unknown) => void;
}

// Configuraciones de agentes (mantenemos nuestra lógica de dominio)
// NOTA: Ambos agentes usan la misma voz para permitir actualización de sesión sin desconexión
const AGENT_CONFIGS = {
  sales: {
    voice: 'alloy', // Usamos 'alloy' para ambos agentes
    instructions: `You are Luxora, a highly interactive food service sales agent with the following responsibilities:
1. Help customers find the best meal for their needs with enthusiastic recommendations
2. ALWAYS use the focus_menu_item tool to highlight specific menu items when:
   - Talking about a menu item to the customer
   - Customer mentions a menu item
   - After each item is added to the cart (to keep visual focus)
3. CONSTANTLY use the order tool to update the customer's cart throughout the conversation:
   - When customer wants to add an item to their order
   - When customer wants to remove an item from their order
   - When customer wants to see their current order
   - When customer confirms they want to purchase
   - Keep the order updated in real-time as the conversation progresses

4. CRITICAL INTERACTION REQUIREMENTS:
   - After EVERY item added to cart: Confirm the addition verbally, suggest complementary items, and ask if they want anything else
   - When cart has items: Regularly remind customers what's in their cart and ask if they're ready to proceed to checkout
   - If customer seems done ordering: Ask explicitly if they want to proceed to checkout
   - If customer confirms order: Use order tool with customer_confirm:"yes" and guide them to payment process
   - NEVER go silent after adding items - always acknowledge and guide to next steps

---
You can only sell:
- Big Burger Combo (Classic burger + fries + medium drink)  - $14.89 USD
- Double Cheeseburger (Two patties, American cheese)  - $5.79 USD
- Cheeseburger (Pickles, onions, ketchup, mustard)  - $3.49 USD
- Hamburger (Simple & classic)  - $2.99 USD
- Crispy Chicken Sandwich (Lettuce, mayo)  - $4.99 USD
- Chicken Nuggets (6 pc) (Choice of sauces)  - $4.49 USD
- Crispy Fish Sandwich (Tartar sauce, shredded lettuce)  - $5.29 USD
- Fries (Small/Medium/Large)  - $3.19 USD
- Baked Apple Pie (Warm handheld pie)  - $1.79 USD
- Manzana Postobon® Drink (Ice-cold, refreshing)  - $1.49 USD

The focus_menu_item tool controls an UI with pictures of the menu items. You will receive descriptions of the pictures the customer will see.
The order tool controls the cart display and order management. Use both tools constantly to provide the best experience.

IMPORTANT CONVERSATION FLOW:
1. When customer orders item(s): Add to cart with order tool, confirm verbally, suggest complementary items
2. After adding items: Always ask "Would you like anything else?" or suggest specific complementary items
3. When customer is done ordering: Ask "Would you like to proceed to checkout?" 
4. If customer confirms: Use order tool with customer_confirm:"yes" parameter and guide them to payment
5. NEVER end your turn without clear guidance on next steps for the customer

Remember to be engaging, conversational and NEVER stop guiding the customer through the ordering process.`,
    tools: ['focus_menu_item', 'order', 'transfer_to_payment']
  },
  payment: {
    voice: 'alloy', // Misma voz que sales para permitir actualización sin desconexión
    instructions: `You are Karol, a highly interactive payments and delivery agent, with the following responsibilities:
1. ALWAYS begin by reviewing the customer's cart items and quantities, and ask them to confirm if everything is correct.
2. Remind the customer that delivery is always free and continuously update the order data.
3. ACTIVELY collect and validate information in this specific order:
   • Full name - Ask: "May I have your full name for the order?"
   • Delivery address - Ask: "What's the delivery address for your order?"
   • Contact phone - Ask: "What phone number should we use for delivery updates?"
   • Payment information - Ask: "Now for payment details. What's your credit card number?"
   • After card number, ask for expiration date: "What's the expiration date on your card? (MM/YY format)"
   • Finally ask for CVV: "And the 3-digit security code on the back?"

4. CRITICAL INTERACTION REQUIREMENTS:
   • After EACH piece of information is provided: Confirm verbally what was received and update the data
   • Use update_order_data tool after EACH new piece of information
   • Always guide customer to the next required piece of information
   • If information is missing or invalid: Politely ask again with specific guidance
   • NEVER go silent - always acknowledge input and guide to next steps

5. If the customer says they're not sure which meal to buy or want to see other menu items, immediately call the transfer_to_menu_agent tool.

6. FINAL CONFIRMATION PROCESS:
   • Once all required fields are collected: Read back ALL information to the customer
   • Ask explicitly: "Is everything correct? Shall I process your order now?"
   • If confirmed: Use update_order_data with "confirm":"yes" parameter
   • Thank the customer warmly and explain what happens next with their order

IMPORTANT: You can only work with the existing cart items. DO NOT add new menu items to the cart. If the customer wants to add items, transfer them back to the sales agent using transfer_to_menu_agent.

---
IMPORTANT CONVERSATION FLOW:
1. Start with cart review and confirmation
2. Collect information in the specified order, confirming each piece
3. After collecting all information, perform final review
4. Get explicit confirmation before finalizing
5. NEVER end your turn without clear guidance on what information is needed next
6. Use update_order_data tool after EVERY new piece of information

Remember to be engaging, conversational and NEVER stop guiding the customer through the checkout process.`,
    tools: ['update_order_data', 'transfer_to_menu_agent']
  }
};

export function useWebRTC(options: UseWebRTCOptions = {}): UseWebRTCReturn {
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [currentAgent, setCurrentAgent] = useState<AgentType>('sales');
  const [isConnecting, setIsConnecting] = useState(false);

  // Referencias para WebRTC (enfoque directo)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // 🔧 Tool calling integration
  const { processFunctionCall, getRealtimeToolDefinitions } = useToolCalling({
    onToolCall: (name, args, result) => {
      console.log(`[WEBRTC] 🔧 Tool executed: ${name}`, { args, result });
      options.onMessage?.({ type: 'tool_result', name, args, result });
    },
    onError: (error) => {
      console.error('[WEBRTC] ❌ Tool error:', error);
      options.onError?.(error);
    }
  });

  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
    console.log(`[WEBRTC] Status: ${newStatus}`);
  }, [options]);

  // 🔌 Desconexión limpia - definida antes de connect para evitar referencia circular
  const disconnect = useCallback(() => {
    console.log('[WEBRTC] 🔌 Disconnecting...');

    // Cerrar data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Cerrar peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Detener media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Limpiar audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    updateStatus('disconnected');
    console.log('[WEBRTC] ✅ Disconnected successfully');
  }, [updateStatus]);

  // 🔧 Configurar tools después de establecer conexión
  const configureTools = useCallback((agentType: AgentType, retryCount = 0) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      // Configurar herramientas según el agente
      const allTools = getRealtimeToolDefinitions();
      const agentTools = AGENT_CONFIGS[agentType].tools;
      
      // Filtrar herramientas según el agente
      const filteredTools = allTools.filter(tool => 
        agentTools.includes(tool.name)
      );
      
      console.log(`[WEBRTC] 🎯 Configuring tools for ${agentType} agent:`, agentTools);
      
      const toolsConfig = {
        type: 'session.update',
        session: {
          tools: filteredTools,
          tool_choice: 'auto',
          instructions: AGENT_CONFIGS[agentType].instructions
        }
      };

      console.log(`[WEBRTC] 🔧 Configuring tools for agent: ${agentType}`);
      console.log(`[WEBRTC] 📋 Filtered tools:`, JSON.stringify(filteredTools, null, 2));
      console.log(`[WEBRTC] 📋 Full tools config:`, JSON.stringify(toolsConfig, null, 2));
      
      dataChannelRef.current.send(JSON.stringify(toolsConfig));
      console.log(`[WEBRTC] ✅ Tools configuration sent successfully`);
    } else {
      console.error(`[WEBRTC] ❌ Cannot configure tools - data channel not ready (attempt ${retryCount + 1})`);
      console.error(`[WEBRTC] 📊 Data channel state:`, dataChannelRef.current?.readyState);
      
      // Retry hasta 3 veces con delay
      if (retryCount < 3) {
        console.log(`[WEBRTC] 🔄 Retrying tools configuration in 1 second...`);
        setTimeout(() => {
          configureTools(agentType, retryCount + 1);
        }, 1000);
      } else {
        console.error(`[WEBRTC] 💥 Failed to configure tools after 3 attempts`);
      }
    }
  }, [getRealtimeToolDefinitions]);

  // 🔗 Conexión directa basada en proyecto exitoso
  const connect = useCallback(async (agentType: AgentType = 'sales') => {
    try {
      setIsConnecting(true);
      updateStatus('connecting');
      setCurrentAgent(agentType);

      console.log(`[WEBRTC] 🚀 Connecting with agent: ${agentType}`);

      // 1. Obtener ephemeral key (usar nuestro API existente)
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: AGENT_CONFIGS[agentType].voice,
          instructions: AGENT_CONFIGS[agentType].instructions
          // Note: tools se configuran después de establecer la conexión
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
      }

      const sessionData: SessionData = await sessionResponse.json();
      console.log('[WEBRTC] 🔑 Session created:', sessionData.session_id);

      // 2. Crear WebRTC peer connection (enfoque directo)
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // 3. Configurar audio element
      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElementRef.current = audioElement;

      peerConnection.ontrack = (event) => {
        console.log('[WEBRTC] 🔊 Audio track received');
        audioElement.srcObject = event.streams[0];
        updateStatus('connected');
      };

      // 4. Obtener micrófono
      console.log('[WEBRTC] 🎤 Requesting microphone access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = mediaStream;

      // Agregar tracks de audio
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // 5. Crear data channel para function calling
      const dataChannel = peerConnection.createDataChannel('oai-events', {
        ordered: true
      });

      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('[WEBRTC] 📡 Data channel opened');
        // Configurar tools cuando el data channel esté realmente listo
        console.log('[WEBRTC] 🔧 Data channel ready, configuring tools...');
        configureTools(agentType);
      };

      dataChannel.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WEBRTC] 📨 Message received:', message.type);
          
          // Log específico para session.updated (confirmación de tools)
          if (message.type === 'session.updated') {
            console.log('[WEBRTC] ✅ Session updated successfully:', message);
            console.log('[WEBRTC] 🔧 Tools in session:', message.session?.tools);
          }
          
          // Log específico para errores
          if (message.type === 'error') {
            console.error('[WEBRTC] 💥 ERROR from OpenAI:', message);
            console.error('[WEBRTC] 💥 Error code:', message.error?.code);
            console.error('[WEBRTC] 💥 Error message:', message.error?.message);
            console.error('[WEBRTC] 💥 Error details:', JSON.stringify(message.error, null, 2));
          }
          
          // Log específico para function calls
          if (message.type === 'response.function_call_delta' || 
              message.type === 'response.output_item.done' ||
              message.item?.type === 'function_call') {
            console.log('[WEBRTC] 🔧 FUNCTION CALL detected:', message);
          }
          
          // Log para respuestas de texto (para debug)
          if (message.type === 'response.output_item.done' && message.item?.type === 'message') {
            console.log('[WEBRTC] 💬 Text response detected:', message.item.content);
            console.log('[WEBRTC] ⚠️ AI responded with text instead of using tools!');
          }
          
          // Procesar function calls automáticamente
          const toolResult = await processFunctionCall(message);
          if (toolResult) {
            console.log('[WEBRTC] ✅ Tool call processed successfully:', toolResult);
          }
          
          options.onMessage?.(message);
        } catch (error) {
          console.error('[WEBRTC] ❌ Error parsing message:', error);
        }
      };

      dataChannel.onerror = (error) => {
        console.error('[WEBRTC] ❌ Data channel error:', error);
        updateStatus('error');
      };

      // 6. SDP negotiation directo con OpenAI (como proyecto exitoso)
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      console.log('[WEBRTC] 🤝 Negotiating with OpenAI...');
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.client_secret.value}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`SDP negotiation failed: ${sdpResponse.status} - ${errorText}`);
      }

      const answerSdp = await sdpResponse.text();
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      // 7. Configurar event listeners de conexión
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log(`[WEBRTC] ICE connection state: ${state}`);
        
        if (state === 'connected') {
          updateStatus('connected');
          // Tools se configuran en dataChannel.onopen cuando está realmente listo
        } else if (['disconnected', 'failed', 'closed'].includes(state)) {
          updateStatus('disconnected');
          if (state === 'failed') {
            disconnect();
          }
        }
      };

      console.log('[WEBRTC] ✅ Connection established successfully');

    } catch (error) {
      console.error('[WEBRTC] ❌ Connection failed:', error);
      updateStatus('error');
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      disconnect();
    } finally {
      setIsConnecting(false);
    }
  }, [updateStatus, options, configureTools, disconnect, processFunctionCall]);

  // 🔄 Actualizar sesión sin desconectar
  const updateSession = useCallback(async (newAgent: AgentType) => {
    console.log(`[WEBRTC] 🔄 Updating session to agent: ${newAgent}`);
    
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('[WEBRTC] ❌ Cannot update session - data channel not ready');
      return false;
    }
    
    try {
      // Obtener herramientas filtradas para el nuevo agente
      const allTools = getRealtimeToolDefinitions();
      const agentTools = AGENT_CONFIGS[newAgent].tools;
      const filteredTools = allTools.filter(tool => 
        agentTools.includes(tool.name)
      );
      
      // Crear mensaje de actualización de sesión
      // NOTA: No podemos actualizar la voz una vez que hay audio del asistente en la conversación
      // Error: "Cannot update a conversation's voice if assistant audio is present."
      const sessionUpdateMessage = {
        type: 'session.update',
        session: {
          // Eliminamos voice para evitar el error "cannot_update_voice"
          instructions: AGENT_CONFIGS[newAgent].instructions,
          tools: filteredTools,
          tool_choice: 'auto'
        }
      };
      
      console.log(`[WEBRTC] 📋 Session update message:`, JSON.stringify(sessionUpdateMessage, null, 2));
      
      // Enviar mensaje de actualización
      dataChannelRef.current.send(JSON.stringify(sessionUpdateMessage));
      console.log(`[WEBRTC] ✅ Session update sent successfully`);
      
      return true;
    } catch (error) {
      console.error('[WEBRTC] ❌ Failed to update session:', error);
      return false;
    }
  }, [getRealtimeToolDefinitions]);

  // 🔄 Cambio de agente (sin reconexión cuando es posible)
  const switchAgent = useCallback(async (newAgent: AgentType) => {
    console.log(`[WEBRTC] 🔄 Switching to agent: ${newAgent}`);
    
    // Prevenir múltiples conexiones simultáneas
    if (isConnecting) {
      console.log(`[WEBRTC] ⚠️ Already connecting, ignoring switch to: ${newAgent}`);
      return;
    }
    
    // Prevenir cambio al mismo agente
    if (currentAgent === newAgent && status === 'connected') {
      console.log(`[WEBRTC] ⚠️ Already connected to: ${newAgent}`);
      return;
    }
    
    setIsConnecting(true);
    
    try {
      if (status === 'connected' && dataChannelRef.current?.readyState === 'open') {
        // Intentar actualizar la sesión sin desconectar
        console.log(`[WEBRTC] 🔄 Attempting to update session without disconnecting...`);
        
        // NOTA: La actualización de sesión funciona para cambiar instrucciones y herramientas,
        // pero no puede cambiar la voz una vez que hay audio del asistente en la conversación.
        // Si los agentes usan voces diferentes, debemos recurrir a la reconexión completa.
        const voicesAreDifferent = AGENT_CONFIGS[currentAgent].voice !== AGENT_CONFIGS[newAgent].voice;
        
        if (voicesAreDifferent) {
          console.log(`[WEBRTC] ⚠️ Agents use different voices (${AGENT_CONFIGS[currentAgent].voice} vs ${AGENT_CONFIGS[newAgent].voice})`);
          console.log(`[WEBRTC] ⚠️ Cannot update voice in active session, falling back to reconnection`);
        } else {
          const updateSuccess = await updateSession(newAgent);
          
          if (updateSuccess) {
            console.log(`[WEBRTC] ✅ Session updated successfully to agent: ${newAgent}`);
            setCurrentAgent(newAgent);
            options.onAgentSwitch?.(newAgent);
            return;
          } else {
            console.log(`[WEBRTC] ⚠️ Session update failed, falling back to reconnection`);
          }
        }
      }
      
      // Si no hay conexión activa o falló la actualización, conectar normalmente
      if (status === 'connected') {
        disconnect();
        // Pequeña pausa para limpiar conexión anterior
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await connect(newAgent);
      options.onAgentSwitch?.(newAgent);
    } finally {
      setIsConnecting(false);
    }
  }, [status, currentAgent, isConnecting, disconnect, connect, updateSession, options]);

  // 📨 Enviar mensaje via data channel
  const sendMessage = useCallback((message: unknown) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      dataChannelRef.current.send(messageStr);
      console.log('[WEBRTC] 📤 Message sent:', message);
    } else {
      console.warn('[WEBRTC] ⚠️ Data channel not ready, message not sent');
    }
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    currentAgent,
    connect,
    disconnect,
    switchAgent,
    sendMessage
  };
}