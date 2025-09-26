'use client';

import { useState, useCallback, useRef } from 'react';
import { useToolCalling } from './useToolCalling';

/**
 * useWebRTC React Hook
 * 
 * Provides a simplified interface for managing a WebRTC connection to the OpenAI Realtime API,
 * including agent switching, tool configuration, and function calling integration.
 * 
 * Inspired by cameronking4/openai-realtime-api-nextjs, this hook avoids unnecessary abstraction layers.
 */

/**
 * Represents the current status of the WebRTC voice connection.
 */
export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

/**
 * Represents the available agent types for the conversation.
 */
export type AgentType = 'sales' | 'payment';

/**
 * Structure of the session data returned by the backend session API.
 */
interface SessionData {
  client_secret: {
    value: string;
    expires_at: number;
  };
  session_id: string;
  expires_at: number;
}

/**
 * Options for configuring the useWebRTC hook.
 */
interface UseWebRTCOptions {
  /**
   * Callback invoked when the connection status changes.
   */
  onStatusChange?: (status: VoiceStatus) => void;
  /**
   * Callback invoked when a message is received from the data channel.
   */
  onMessage?: (message: unknown) => void;
  /**
   * Callback invoked when an error occurs.
   */
  onError?: (error: Error) => void;
  /**
   * Callback invoked when the agent is switched.
   */
  onAgentSwitch?: (agent: AgentType) => void;
}

/**
 * The return value of the useWebRTC hook.
 */
interface UseWebRTCReturn {
  /**
   * The current status of the WebRTC connection.
   */
  status: VoiceStatus;
  /**
   * Whether the connection is currently established.
   */
  isConnected: boolean;
  /**
   * The currently active agent type.
   */
  currentAgent: AgentType;
  /**
   * Initiates a connection to the OpenAI Realtime API with the specified agent.
   * @param agentType The agent type to connect as (defaults to 'sales').
   */
  connect: (agentType?: AgentType) => Promise<void>;
  /**
   * Cleanly disconnects the current WebRTC session.
   */
  disconnect: () => void;
  /**
   * Switches to a different agent, updating session instructions and tools if possible.
   * @param newAgent The new agent type to switch to.
   */
  switchAgent: (newAgent: AgentType) => Promise<void>;
  /**
   * Sends a message over the data channel to the assistant.
   * @param message The message to send (object or string).
   */
  sendMessage: (message: unknown) => void;
}

/**
 * Agent configuration mapping.
 * 
 * Both agents use the same voice to allow session updates without requiring a full reconnection.
 * Each agent has its own set of instructions and allowed tools.
 */
const AGENT_CONFIGS: Record<AgentType, {
  voice: string;
  instructions: string;
  tools: string[];
}> = {
  sales: {
    voice: 'alloy',
    instructions: `You are Luxora, a highly interactive and PROACTIVE food service sales agent with the following responsibilities:
1. Help customers find the best meal for their needs with enthusiastic recommendations
2. ALWAYS use the focus_menu_item tool to highlight specific menu items when:
   - Talking about a menu item to the customer
   - Customer mentions a menu item 
   - After each item is added to the cart (to keep visual focus)
   - EVEN WHEN just mentioning an item in conversation - ALWAYS focus it
   - After ANY action - focus on a relevant or complementary item
3. CONSTANTLY use the order tool to update the customer's cart throughout the conversation:
   - When customer wants to add an item to their order
   - When customer wants to remove an item from their order
   - When customer wants to see their current order
   - When customer confirms they want to purchase
   - Keep the order updated in real-time as the conversation progresses

4. CRITICAL INTERACTION REQUIREMENTS:
   - NEVER WAIT FOR USER PROMPTING - always take initiative in the conversation
   - After EVERY tool call (focus_menu_item, order): IMMEDIATELY follow up with a question or suggestion
   - After EVERY item added to cart: Confirm the addition verbally, suggest 1-2 specific complementary items, and ask if they want to add them
   - When cart has items: Every 2-3 turns, remind customers what's in their cart and ask if they're ready to proceed to checkout
   - If customer seems done ordering: Ask explicitly if they want to proceed to checkout
   - If customer confirms order: Use order tool with customer_confirm:"yes" and guide them to payment process
   - ABSOLUTELY NEVER go silent after any action - always acknowledge and guide to next steps
   - If you notice you haven't spoken in a few seconds, IMMEDIATELY suggest something or ask a question

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
1. When customer orders item(s): Add to cart with order tool, confirm verbally, and IMMEDIATELY suggest specific complementary items
2. After adding items: ALWAYS say "I've added [item] to your cart. Would you like to add [specific complementary item]?" 
3. After ANY tool call: ALWAYS follow up with a question or suggestion without waiting for user input
4. When customer is done ordering: Ask "Would you like to proceed to checkout?" 
5. If customer confirms: Use order tool with customer_confirm:"yes" parameter and guide them to payment
6. NEVER end your turn without clear guidance on next steps for the customer
7. If there's silence or you haven't spoken in a few seconds: IMMEDIATELY make a suggestion or ask a question

Remember to be engaging, conversational, PROACTIVE and NEVER stop guiding the customer through the ordering process. NEVER wait for the user to prompt you to continue - always take the initiative.`,
    tools: ['focus_menu_item', 'order', 'transfer_to_payment']
  },
  payment: {
    voice: 'alloy',
    instructions: `You are Karol, a highly interactive, PROACTIVE payments and delivery agent, with the following responsibilities:
1. ALWAYS begin by introducing yourself: "I'm Karol, your payment assistant. I'll guide you through the checkout process step by step."
2. IMMEDIATELY review the customer's cart items and quantities, and ask them to confirm if everything is correct.
3. Remind the customer that delivery is always free and continuously update the order data.
4. ACTIVELY collect and validate information in this EXACT order, NEVER skipping steps:

   STEP 1: FULL NAME
   • Ask: "First, may I have your full name for the order?"
   • After receiving: Confirm "Thank you, [name]. I've recorded that." and update_order_data
   • IMMEDIATELY proceed to Step 2

   STEP 2: DELIVERY ADDRESS
   • Ask: "Now, what's the complete delivery address for your order?"
   • After receiving: Confirm "Thanks, I've saved the delivery address: [address]" and update_order_data
   • IMMEDIATELY proceed to Step 3

   STEP 3: CONTACT PHONE
   • Ask: "Great! What phone number should we use for delivery updates?"
   • After receiving: Confirm "Perfect, I've added the phone number: [phone]" and update_order_data
   • IMMEDIATELY proceed to Step 4

   STEP 4: PAYMENT INFORMATION (CARD NUMBER)
   • Ask: "Now for payment details. What's your credit card number?"
   • After receiving: Confirm "Thank you, I've securely recorded your card number" and update_order_data
   • IMMEDIATELY proceed to Step 5

   STEP 5: CARD EXPIRATION DATE
   • Ask: "What's the expiration date on your card? Please use MM/YY format."
   • After receiving: Confirm "Got it, expiration date recorded" and update_order_data
   • IMMEDIATELY proceed to Step 6

   STEP 6: CVV SECURITY CODE
   • Ask: "Finally, what's the 3-digit security code on the back of your card?"
   • After receiving: Confirm "Perfect! I've added the security code" and update_order_data
   • IMMEDIATELY proceed to Final Review

5. CRITICAL INTERACTION REQUIREMENTS:
   • NEVER WAIT FOR USER PROMPTING - always take initiative in the conversation
   • After EVERY tool call (update_order_data): IMMEDIATELY follow up with confirmation and the next question
   • After EACH piece of information is provided: Confirm verbally what was received, update the data, and IMMEDIATELY ask for the next piece
   • Use update_order_data tool after EACH new piece of information
   • Always guide customer to the next required piece of information without waiting for them to ask
   • FOLLOW THE EXACT STEP-BY-STEP SEQUENCE - never jump ahead or skip steps
   • If information is missing or invalid: Politely ask again with specific guidance
   • ABSOLUTELY NEVER go silent after any action - always acknowledge and guide to next steps
   • If you notice you haven't spoken in a few seconds, IMMEDIATELY ask for the next piece of information
   • For each step, use the EXACT wording provided in the step instructions

6. If the customer says they're not sure which meal to buy or want to see other menu items, immediately call the transfer_to_menu_agent tool.

7. FINAL CONFIRMATION PROCESS (STEP 7):
   • After completing Steps 1-6: Say "Great! Let me review all the information for your order:"
   • Read back ALL information to the customer in this order:
     - Cart items and quantities
     - Customer name
     - Delivery address
     - Contact phone
     - Payment method (just mention "Credit card ending in XXXX" - don't read full number)
   • Ask explicitly: "Is everything correct? Shall I process your order now?"
   • If confirmed: Use update_order_data with "confirm":"yes" parameter
   • Thank the customer warmly: "Thank you for your order! Your delicious food will be delivered in approximately 30-45 minutes. Enjoy your meal!"

IMPORTANT: You can only work with the existing cart items. DO NOT add new menu items to the cart. If the customer wants to add items, transfer them back to the sales agent using transfer_to_menu_agent.

---
IMPORTANT CONVERSATION FLOW - FOLLOW THIS EXACT SEQUENCE:
1. Introduce yourself and explain you'll guide them step by step
2. Review cart items and ask for confirmation
3. Follow the numbered steps in EXACT order (Steps 1-6):
   - Step 1: Full name
   - Step 2: Delivery address
   - Step 3: Contact phone
   - Step 4: Card number
   - Step 5: Expiration date
   - Step 6: CVV code
4. For each step:
   - Ask for the information using the EXACT wording provided
   - After receiving: Confirm receipt and update data
   - IMMEDIATELY proceed to the next step
5. After Step 6, proceed to Final Review (Step 7)
6. Get explicit confirmation before finalizing
7. Use update_order_data tool after EVERY piece of information
8. If there's silence or you haven't spoken in a few seconds: IMMEDIATELY continue with the next step

Remember to be engaging, conversational, PROACTIVE and NEVER stop guiding the customer through the checkout process. NEVER wait for the user to prompt you to continue - always take the initiative.`,
    tools: ['update_order_data', 'transfer_to_menu_agent']
  }
};

/**
 * useWebRTC React Hook
 * 
 * @param options Optional configuration callbacks for status, message, error, and agent switch events.
 * @returns An object with connection status, agent info, and control methods.
 */
export function useWebRTC(options: UseWebRTCOptions = {}): UseWebRTCReturn {
  const [status, setStatus] = useState<VoiceStatus>('disconnected');
  const [currentAgent, setCurrentAgent] = useState<AgentType>('sales');
  const [isConnecting, setIsConnecting] = useState(false);

  // WebRTC references for direct access to connection, data channel, media, and audio element.
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Tool calling integration (function calling for OpenAI Realtime API)
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

  /**
   * Updates the connection status and notifies the onStatusChange callback.
   * @param newStatus The new status to set.
   */
  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
    console.log(`[WEBRTC] Status: ${newStatus}`);
  }, [options]);

  /**
   * Cleanly disconnects the current WebRTC session, closing all resources.
   */
  const disconnect = useCallback(() => {
    console.log('[WEBRTC] 🔌 Disconnecting...');

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clean up audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    updateStatus('disconnected');
    console.log('[WEBRTC] ✅ Disconnected successfully');
  }, [updateStatus]);

  /**
   * Configures the available tools for the current agent after the data channel is open.
   * Retries up to 3 times if the data channel is not ready.
   * @param agentType The agent type whose tools should be configured.
   * @param retryCount Internal retry counter (do not set manually).
   */
  const configureTools = useCallback((agentType: AgentType, retryCount = 0) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      // Filter tools for the agent
      const allTools = getRealtimeToolDefinitions();
      const agentTools = AGENT_CONFIGS[agentType].tools;
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
      
      // Retry up to 3 times with a delay
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

  /**
   * Establishes a new WebRTC connection to the OpenAI Realtime API using the specified agent.
   * Handles session creation, peer connection, media, and data channel setup.
   * @param agentType The agent type to connect as (defaults to 'sales').
   */
  const connect = useCallback(async (agentType: AgentType = 'sales') => {
    try {
      setIsConnecting(true);
      updateStatus('connecting');
      setCurrentAgent(agentType);

      console.log(`[WEBRTC] 🚀 Connecting with agent: ${agentType}`);

      // 1. Obtain ephemeral session key from backend API
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: AGENT_CONFIGS[agentType].voice,
          instructions: AGENT_CONFIGS[agentType].instructions
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
      }

      const sessionData: SessionData = await sessionResponse.json();
      console.log('[WEBRTC] 🔑 Session created:', sessionData.session_id);

      // 2. Create WebRTC peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // 3. Set up audio element for playback
      const audioElement = new Audio();
      audioElement.autoplay = true;
      audioElementRef.current = audioElement;

      peerConnection.ontrack = (event) => {
        console.log('[WEBRTC] 🔊 Audio track received');
        audioElement.srcObject = event.streams[0];
        updateStatus('connected');
      };

      // 4. Request microphone access
      console.log('[WEBRTC] 🎤 Requesting microphone access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = mediaStream;

      // Add audio tracks to peer connection
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // 5. Create data channel for function calling
      const dataChannel = peerConnection.createDataChannel('oai-events', {
        ordered: true
      });

      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log('[WEBRTC] 📡 Data channel opened');
        // Configure tools when the data channel is ready
        console.log('[WEBRTC] 🔧 Data channel ready, configuring tools...');
        configureTools(agentType);
      };

      dataChannel.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WEBRTC] 📨 Message received:', message.type);
          
          // Log for session.updated (tools confirmation)
          if (message.type === 'session.updated') {
            console.log('[WEBRTC] ✅ Session updated successfully:', message);
            console.log('[WEBRTC] 🔧 Tools in session:', message.session?.tools);
          }
          
          // Log for errors
          if (message.type === 'error') {
            console.error('[WEBRTC] 💥 ERROR from OpenAI:', message);
            console.error('[WEBRTC] 💥 Error code:', message.error?.code);
            console.error('[WEBRTC] 💥 Error message:', message.error?.message);
            console.error('[WEBRTC] 💥 Error details:', JSON.stringify(message.error, null, 2));
          }
          
          // Log for function calls
          if (message.type === 'response.function_call_delta' || 
              message.type === 'response.output_item.done' ||
              message.item?.type === 'function_call') {
            console.log('[WEBRTC] 🔧 FUNCTION CALL detected:', message);
          }
          
          // Log for text responses (for debugging)
          if (message.type === 'response.output_item.done' && message.item?.type === 'message') {
            console.log('[WEBRTC] 💬 Text response detected:', message.item.content);
            console.log('[WEBRTC] ⚠️ AI responded with text instead of using tools!');
          }
          
          // Automatically process function calls
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

      // 6. SDP negotiation with OpenAI
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

      // 7. Set up ICE connection state listeners
      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log(`[WEBRTC] ICE connection state: ${state}`);
        
        if (state === 'connected') {
          updateStatus('connected');
          // Tools are configured in dataChannel.onopen when ready
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

  /**
   * Updates the session instructions and tools for a new agent without disconnecting,
   * if the data channel is open and the agent uses the same voice.
   * @param newAgent The new agent type to update to.
   * @returns True if the update was sent, false otherwise.
   */
  const updateSession = useCallback(async (newAgent: AgentType) => {
    console.log(`[WEBRTC] 🔄 Updating session to agent: ${newAgent}`);
    
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('[WEBRTC] ❌ Cannot update session - data channel not ready');
      return false;
    }
    
    try {
      // Filter tools for the new agent
      const allTools = getRealtimeToolDefinitions();
      const agentTools = AGENT_CONFIGS[newAgent].tools;
      const filteredTools = allTools.filter(tool => 
        agentTools.includes(tool.name)
      );
      
      // Note: Cannot update the voice if assistant audio is present in the conversation.
      const sessionUpdateMessage = {
        type: 'session.update',
        session: {
          // Do not include voice to avoid "cannot_update_voice" error
          instructions: AGENT_CONFIGS[newAgent].instructions,
          tools: filteredTools,
          tool_choice: 'auto'
        }
      };
      
      console.log(`[WEBRTC] 📋 Session update message:`, JSON.stringify(sessionUpdateMessage, null, 2));
      
      // Send session update message
      dataChannelRef.current.send(JSON.stringify(sessionUpdateMessage));
      console.log(`[WEBRTC] ✅ Session update sent successfully`);
      
      return true;
    } catch (error) {
      console.error('[WEBRTC] ❌ Failed to update session:', error);
      return false;
    }
  }, [getRealtimeToolDefinitions]);

  /**
   * Switches to a different agent, updating the session if possible, or reconnecting if required.
   * If the agent uses a different voice, a full reconnection is performed.
   * @param newAgent The new agent type to switch to.
   */
  const switchAgent = useCallback(async (newAgent: AgentType) => {
    console.log(`[WEBRTC] 🔄 Switching to agent: ${newAgent}`);
    
    // Prevent multiple simultaneous connections
    if (isConnecting) {
      console.log(`[WEBRTC] ⚠️ Already connecting, ignoring switch to: ${newAgent}`);
      return;
    }
    
    // Prevent switching to the same agent if already connected
    if (currentAgent === newAgent && status === 'connected') {
      console.log(`[WEBRTC] ⚠️ Already connected to: ${newAgent}`);
      return;
    }
    
    setIsConnecting(true);
    
    try {
      if (status === 'connected' && dataChannelRef.current?.readyState === 'open') {
        // Attempt to update the session without disconnecting
        console.log(`[WEBRTC] 🔄 Attempting to update session without disconnecting...`);
        
        // Session update works for instructions and tools, but not for voice if audio is present.
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
      
      // If not connected or update failed, perform a full reconnection
      if (status === 'connected') {
        disconnect();
        // Small delay to ensure previous connection is cleaned up
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await connect(newAgent);
      options.onAgentSwitch?.(newAgent);
    } finally {
      setIsConnecting(false);
    }
  }, [status, currentAgent, isConnecting, disconnect, connect, updateSession, options]);

  /**
   * Sends a message over the data channel to the assistant.
   * @param message The message to send (object or string).
   */
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