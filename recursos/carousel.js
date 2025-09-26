document.addEventListener('DOMContentLoaded', async () => {
  // —— WebRTC & Voice Chat Logic —— //
  const micButton  = document.getElementById('micButton');
  const statusEl     = document.getElementById('status');
  const activityEl   = document.getElementById('activity');
  const messagesEl   = document.getElementById('messages');
  
  // References to icons
  const micIcon = document.getElementById('micIcon');
  const pauseIcon = document.getElementById('pauseIcon');

  // Variable to track session state
  let isSessionActive = false;

  // Variables for non-sensitive data
  let MENU_ITEMS = [];         // List of menu items
  let priceMap = {};         // Price map
  let imgMap = {};           // Image map
  let menuItemDescriptions = {}; // Menu item descriptions
  
  // The current agent - we only store the type, not the prompts
  let currentAgentType = 'sales';

  // Cargar datos no sensibles del backend
  try {
      // Cargar datos de menu items (esta información no es sensible)
      const menuDataResponse = await fetch('/api/menu-data');
      if (menuDataResponse.ok) {
          const data = await menuDataResponse.json();
          MENU_ITEMS = data.menu_items;
          priceMap = data.prices;
          imgMap = data.images;
          menuItemDescriptions = data.descriptions;
          
          // Debug: Log loaded data
          console.log('Loaded menu data:', {
              menuItems: MENU_ITEMS.length,
              prices: Object.keys(priceMap).length,
              images: Object.keys(imgMap).length
          });
          console.log('Price map:', priceMap);
      } else {
          console.error('Error al cargar datos de menu items');
      }
  } catch (error) {
      console.error('Error al cargar configuraciones:', error);
  }

  // —— Price map, image map & checkout toggler —— 
  let cart = [];

  // —— Dynamic map embed setup —— 
  const addressInput = document.getElementById('shipping-address-input');
  const mapFrame = document.getElementById('map-frame');

  // Simple debounce utility (used for map reloads)
  function debounce(fn, wait = 500) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function updateMapEmbed(address) {
    // Strip any prefix before '@'
    let q = address;
    const atIdx = q.indexOf('@');
    if (atIdx !== -1) q = q.substring(atIdx + 1).trim();
    const base = 'https://www.google.com/maps/embed/v1/place';
    const key = window.GOOGLE_MAPS_API_KEY;  // Get API key from window object
    if (mapFrame) {
      mapFrame.src = `${base}?key=${key}&q=${encodeURIComponent(q)}`;
    }
  }

  // Debounced version so we don't hammer the Maps API
  const updateMapEmbedDebounced = debounce(updateMapEmbed, 500);

  // Initialize map once; subsequent reloads come from update_order_data
  if (addressInput && mapFrame) {
    updateMapEmbed(addressInput.value);
    // If you still want live typing, comment the next line back in:
    // addressInput.addEventListener('input', () => updateMapEmbedDebounced(addressInput.value));
  }

  function showCheckoutPanel() {
    document.getElementById('checkout').classList.remove('hidden');
    renderCartSummary();
    // Scroll checkout section into view smoothly
    document.getElementById('checkout').scrollIntoView({ behavior: 'smooth' });
    updateMapEmbed(addressInput.value);
  }

  // —— Render cart summary with images & details —— 
  function renderCartSummary() {
    const summaryEl = document.getElementById('cart-items');
    summaryEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${imgMap[item.menu_item]}" alt="${item.menu_item}" />
        <div class="cart-item-details">
          <h4>${item.menu_item}</h4>
          <p>Qty: ${item.quantity}</p>
          <p>$${(item.price * item.quantity).toFixed(2)}</p>
        </div>
      </div>
    `).join('');
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cart
      .reduce((sum, i) => sum + (i.price * i.quantity), 0)
      .toFixed(2);
    document.getElementById('cart-count').textContent =
      `${totalItems} item${totalItems !== 1 ? 's' : ''} in cart`;
    document.getElementById('cart-total').textContent = `$${totalPrice}`;
  }

  let functionCallArgsBuffer = '';
  let currentFunctionCallName = null;

  let peerConnection = null;
  let dataChannel    = null;
  let audioElement   = null;
  let mediaStream    = null;
  let sessionId      = null;

  function updateStatus(text, isActive = false) {
    console.log('Updating status:', text, isActive);
    statusEl.textContent = text;
    activityEl.classList.toggle('active', isActive);
  }

  function addMessage(text, isUser = false) {
    console.log(isUser ? 'User: ' : 'Assistant: ', text);
  }

  function generateEventId() {
    return 'event_' + Math.random().toString(36).substring(2, 15);
  }
  
  // Function to toggle microphone (start/stop session)
  async function toggleMicSession() {
    if (isSessionActive) {
      stopSession();
    } else {
      await startSession();
    }
  }

  async function startSession() {
    console.log('startSession called');
    try {
      updateStatus('Getting token...', true);
      const tokenRes = await fetch('/session');
      const data     = await tokenRes.json();
      if (data.error) throw new Error(data.error.message);

      // Set the initial agent type from the response
      if (data.agent_config && data.agent_config.type) {
        currentAgentType = data.agent_config.type;
      }

      const ephemeralKey = data.client_secret?.value;
      sessionId = data.id;
      if (!ephemeralKey) throw new Error('Could not get token');

      updateStatus('Setting up connection...', true);
      peerConnection = new RTCPeerConnection({
        iceCandidatePoolSize: 10,
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });

      audioElement = new Audio();
      audioElement.autoplay = true;
      peerConnection.ontrack = e => {
        console.log("Track received from server");
        audioElement.srcObject = e.streams[0];
      };

      // microphone
      updateStatus('Requesting mic access...', true);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser doesn't support microphone access");
      }
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true }
      });
      mediaStream.getTracks().forEach(t => {
        console.log("Adding local audio track");
        peerConnection.addTrack(t, mediaStream);
      });

      // data channel
      dataChannel = peerConnection.createDataChannel('oai-events');
      dataChannel.onopen = () => {
        updateStatus('Data channel open', true);
      };
      dataChannel.onmessage = handleRealtimeEvent;
      dataChannel.onclose = () => updateStatus('Data channel closed', false);
      dataChannel.onerror = err => updateStatus(`Data channel error: ${err.message}`, false);

      // SDP negotiation
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      updateStatus('Connecting to AI...', true);
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
            'OpenAI-Beta': 'realtime=v1'
          },
          body: offer.sdp
        }
      );
      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`Connection failed: ${sdpRes.status} ${errText}`);
      }
      const answer = { type: 'answer', sdp: await sdpRes.text() };
      await peerConnection.setRemoteDescription(answer);

      updateStatus('Connected', true);
      
      // Update session state and button appearance
      isSessionActive = true;
      micButton.classList.add('active');
      micButton.title = 'Stop listening';

      // Change microphone icons to pause
      micIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');

      peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
        const st = peerConnection.iceConnectionState;
        if (['disconnected','failed','closed'].includes(st)) {
          updateStatus(`ICE: ${st}`, false);
          if (st === 'failed') resetConnection();
        }
      };
    } catch (err) {
      console.error(err);
      updateStatus(`Error: ${err.message}`, false);
      resetConnection();
    }
  }

  function sendMessage() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      updateStatus('No active connection', false);
      return;
    }
    const text = 'Hi, I am looking for a meal';
    console.log('sendMessage:', text);
    addMessage(text, true);

    // conversation.item.create
    sendRealtimeEvent({
      type: 'conversation.item.create',
      event_id: generateEventId(),
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] }
    });

    // response.create after 500ms
    setTimeout(() => {
      sendRealtimeEvent({ type: 'response.create', event_id: generateEventId() });
    }, 500);
  }

  function handleRealtimeEvent(evt) {
    try {
      console.log('handleRealtimeEvent raw data:', evt.data);
      const data = JSON.parse(evt.data);
      switch (data.type) {
        case 'session.created':
          console.log('Session created');
          break;
        case 'session.updated':
          console.log('Session updated:', data);
          break;
        case 'conversation.item.created':
          console.log('Conversation item created:', data.item);
          break;
        case 'response.text.delta':
          if (data.delta?.text) {
            console.log("Text delta:", data.delta.text);
            addMessage(data.delta.text);
          }
          break;
        case 'message_delta':
          if (data.delta?.content) addMessage(data.delta.content);
          break;
        case 'response.content_part.added':
          if (data.content_part?.type === 'text') addMessage(data.content_part.text || '');
          break;
        case 'response.function_call':
          // Handle legacy function_call event
          if (data.function_call) {
            let argsObj = {};
            try {
              argsObj = JSON.parse(data.function_call.arguments);
            } catch(e) {
              console.error('Failed to parse function_call arguments:', e);
            }
            handleFunctionCall(
              data.function_call.name,
              argsObj,
              data.function_call.call_id || null
            );
          }
          break;
        case 'response.output_item.done':
          // Handle unified function_call event
          if (data.item?.type === 'function_call') {
            const argsObj = typeof data.item.arguments === 'string'
              ? (() => { try { return JSON.parse(data.item.arguments); } catch(e) { console.error('Failed to parse unified function arguments:', e); return {}; } })()
              : data.item.arguments;
            handleFunctionCall(
              data.item.name,
              argsObj,
              data.item.call_id || null
            );
          }
          break;
        case 'response.done':
          updateStatus('Response done', true);
          break;
        case 'error':
          updateStatus(`Server error: ${data.message}`, false);
          break;
      }
    } catch (err) {
      console.error('Event error:', err);
    }
  }

  // Function to change agent type
  async function switchAgent(agentType) {
    try {
      console.log(`Changing to agent: ${agentType}`);
      
      // Add agent switching class to prevent scrolling
      document.body.classList.add('agent-switching');
      
      const response = await fetch(`/api/switch-agent/${agentType}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error changing agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        currentAgentType = data.agent_type;
        console.log(`Agent changed to: ${currentAgentType}`);
        
        // If we have the complete configuration and an open data channel
        if (data.config && dataChannel && dataChannel.readyState === 'open') {
          console.log('Sending session AI update...');
          
          // Send session update through WebRTC channel
          sendRealtimeEvent({
            type: 'session.update',
            event_id: generateEventId(),
            session: {
              instructions: data.config.instructions,
              tools: data.config.tools,
              tool_choice: data.config.tool_choice
            }
          });
          
          console.log('Session update sent');
        } else {
          console.error('Cannot update session: data channel not available or incomplete configuration');
        }
        
        // Remove agent switching class after a short delay
        setTimeout(() => {
          document.body.classList.remove('agent-switching');
          
          // Synchronize cart visibility based on agent type
          synchronizeCart();
        }, 2000);
        
        return true;
      } else {
        console.error('Error changing agent');
        document.body.classList.remove('agent-switching');
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      document.body.classList.remove('agent-switching');
      return false;
    }
  }
  
  // Dispatch function calls from the model
  async function handleFunctionCall(name, args, originalCallId = null) {
    let result;
    console.log('Function call:', name, args);
    
    if (name === 'focus_menu_item') {
      console.log('tool: focus_menu_item', args.menu_item);
      result = await focusMenuItem(args.menu_item);
    } 
    else if (name === 'order') {
      console.log('tool: order', args);
      result = await updateOrder(args);
      
      // Update the live cart display
      updateLiveCart(args.cart);
      
      // Show/hide cart based on whether there are items
      if (args.cart && args.cart.length > 0) {
        showLiveCart();
      } else {
        hideLiveCart();
      }
      
      // If customer confirms purchase, proceed to payment
      if (args.customer_confirm === 'yes') {
        // Animate cart transition to checkout
        await animateCartToCheckout();
        const success = await switchAgent('payment');
        if (!success) {
          console.error('Error changing to payments agent');
        }
      }
    } 
    else if (name === 'transfer_to_menu_agent') {
      console.log('tool: transfer_to_menu_agent');
      result = await transferToMenuAgent();
      
      // IMPORTANT: Wait for switch to complete before continuing
      const success = await switchAgent('sales');
      if (!success) {
        console.error('Error changing to sales agent');
      }
      
      // Hide checkout panel and show live cart if there are items
      const checkoutPanel = document.getElementById('checkout');
      if (checkoutPanel) {
        checkoutPanel.classList.add('hidden');
      }
      
      if (cart && cart.length > 0) {
        updateLiveCart(cart);
        showLiveCart();
      }
      
      // Scroll back up to the main menu selection
      const menuHeader = document.querySelector('h1');
      if (menuHeader) {
        menuHeader.scrollIntoView({ behavior: 'smooth' });
      }
    } 
    else if (name === 'update_order_data') {
      console.log('tool: update_order_data', args);
      // Call the update stub and retrieve updated fields
      const updateResult = await updateOrderData(args);
      const fields = updateResult.updatedFields || {};

      // Update cart if present
      if (fields.cart) {
        // Validate cart items before updating
        const validCart = fields.cart.filter(item => {
          if (!MENU_ITEMS.includes(item.menu_item)) {
            console.warn(`Invalid menu item: ${item.menu_item}`);
            return false;
          }
          if (!item.quantity || item.quantity < 1) {
            console.warn(`Invalid quantity for ${item.menu_item}: ${item.quantity}`);
            return false;
          }
          return true;
        });
        
        cart = validCart.map(item => ({
          menu_item: item.menu_item,
          quantity: item.quantity,
          price: priceMap[item.menu_item] || 0
        }));
        
        // Update both live cart and checkout cart
        updateLiveCart(cart);
        renderCartSummary();
        
        // Show/hide live cart based on agent type
        if (currentAgentType === 'sales' && cart.length > 0) {
          showLiveCart();
        } else {
          hideLiveCart();
        }
      }

      /* ----- Update Order & Delivery pane fields ----- */
      // Name
      if (fields.name) {
        const nEl = document.getElementById('shipping-name');
        if (nEl) nEl.textContent = fields.name;
      }

      // Address + map refresh
      if (fields.address) {
        if (addressInput) addressInput.value = fields.address;
        updateMapEmbedDebounced(fields.address);
      }

      // Contact phone
      if (fields.contact_phone) {
        const phEl = document.getElementById('checkout-contact_phone');
        if (phEl) phEl.textContent = fields.contact_phone;
      }

      // Email
      if (fields.email) {
        const emEl = document.getElementById('checkout-email');
        if (emEl) emEl.textContent = fields.email;
      }

      // CVV
      if (fields.cvv) {
        const cvvEl = document.getElementById('checkout-cvv');
        if (cvvEl) cvvEl.textContent = fields.cvv;
      }

      // Update payment number and expiration display
      if (fields.credit_card_number) {
        const numEl = document.getElementById('payment-number');
        if (numEl) numEl.textContent = `Card: ${fields.credit_card_number}`;
      }
      if (fields.expiration_date) {
        const expEl = document.getElementById('payment-expiration');
        if (expEl) expEl.textContent = `(exp: ${fields.expiration_date})`;
      }

      // Update delivery method if provided
      if (fields.delivery_method) {
        document.getElementById('delivery-method').textContent = fields.delivery_method;
      }

      // Show success screen if the customer confirmed the order
      if (args.confirm && args.confirm.toLowerCase() === 'yes') {
        const orderId = generateOrderId();
        showOrderComplete(orderId);
      }

      result = updateResult;   // preserve for function_call_output
    } 
    else {
      result = { error: 'Unknown function: ' + name };
    }
    
    const callId = originalCallId || generateEventId();
    
    // Send function_call_output back to the model
    sendRealtimeEvent({
      type: 'conversation.item.create',
      event_id: callId,
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    });
    
    // IMPORTANT: Add a small wait to ensure events are processed in order
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Prompt model to continue
    sendRealtimeEvent({
      type: 'response.create',
      event_id: generateEventId()
    });
  }

  // Example implementations (stubs) for the tools
  function focusMenuItem(menuItemName) {
    console.log('Tool use: ' + menuItemName);
    // Gather all carousel items
    const items = Array.from(document.querySelectorAll('.carousel-item'));
    const total = items.length;
    // Find the index matching the menuItemName
    const targetIndex = items.findIndex(el => el.dataset.menuItem === menuItemName);
    if (targetIndex < 0) {
      console.warn('Unknown menu item:', menuItemName);
      return { error: 'Menu item not found: ' + menuItemName };
    }
    // Determine current front index via the 'active' class
    const currentIndex = items.findIndex(el => el.classList.contains('active'));
    // Compute minimal rotation steps
    let delta = targetIndex - currentIndex;
    const half = Math.floor(total / 2);
    if (delta > half) delta -= total;
    else if (delta < -half) delta += total;
    // Rotate the carousel step-by-step
    for (let i = 0; i < Math.abs(delta); i++) {
      window.rotate(-Math.sign(delta));
    }
    
    const returnValue = {
      message: `Showing this menu item to the user:\n• ${menuItemName}: ${menuItemDescriptions[menuItemName]}`
    };
    console.log('focusMenuItem returning:', returnValue);
    return returnValue;
  }

  function updateOrder(args) {
    console.log('Tool use: updateOrder', args);
    
    // Validate cart items
    if (args.cart) {
      const validCart = args.cart.filter(item => {
        if (!MENU_ITEMS.includes(item.menu_item)) {
          console.warn(`Invalid menu item: ${item.menu_item}`);
          return false;
        }
        if (!item.quantity || item.quantity < 1) {
          console.warn(`Invalid quantity for ${item.menu_item}: ${item.quantity}`);
          return false;
        }
        return true;
      });
      
      // Use validated cart
      args.cart = validCart;
    }
    
      // Add price property to cart items and calculate total
    if (args.cart) {
      // Check if priceMap is loaded
      if (!priceMap || Object.keys(priceMap).length === 0) {
        console.error('priceMap is not loaded! Cannot process cart items.');
        return { error: 'Price data not available' };
      }
      
      cart = args.cart.map(item => {
        const price = priceMap[item.menu_item];
        if (price === undefined) {
          console.error(`Price not found for item: ${item.menu_item}`, priceMap);
        }
        return {
          menu_item: item.menu_item,
          quantity: item.quantity,
          price: price || 0
        };
      });
    } else {
      cart = [];
    }
    
    const total = cart.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
    
    const returnValue = { 
      message: `Order updated: ${args.cart ? args.cart.length : 0} items, Total: $${total.toFixed(2)}`,
      cart: args.cart,
      total: total,
      customer_confirm: args.customer_confirm
    };
    
    console.log('updateOrder returning:', returnValue);
    return returnValue;
  }

  // —— Stub for menu-agent handoff ——
  async function transferToMenuAgent() {
    // TODO: Implement real handoff logic (e.g., backend call or  function)
    // For now, return a placeholder confirmation
    return { message: 'Returning control to the menu-specialist agent, Give him the welcome as the new agent' };
  }

  // —— Stub for update_order_data ——
  async function updateOrderData(args) {
    console.log('updateOrderData called', args);		

    // ✅ 1. If the customer confirms the order…
    if (args.confirm && args.confirm.toLowerCase() === 'yes') {
      // …log the entire payload for auditing
      console.log('✅ FINAL ORDER DATA:', JSON.stringify(args, null, 2));

      // …and return the 4-day shipping message
      return {
        message: 'Thank you! Your order is confirmed and will ship in about 4 days.'
      };
    }

    // 🚧 2. Otherwise keep incremental updates flowing to the UI
    return { updatedFields: args };
  }

  function sendRealtimeEvent(evt) {
    if (dataChannel?.readyState === 'open') {
      console.log('sendRealtimeEvent:', evt);
      dataChannel.send(JSON.stringify(evt));
    } else {
      updateStatus('Data channel not open', false);
    }
  }

  // Live cart management functions
  function updateLiveCart(cart) {
    const cartItemsEl = document.getElementById('live-cart-items');
    const totalEl = document.getElementById('live-cart-total');
    const cartPanel = document.getElementById('live-cart');
    
    if (!cartItemsEl || !totalEl) {
      console.warn('Cart elements not found');
      return;
    }
    
    if (!cart || cart.length === 0) {
      cartItemsEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No items in your order yet</p>';
      totalEl.textContent = '$0.00';
      return;
    }
    
    // Debug: Check if priceMap is loaded
    if (!priceMap || Object.keys(priceMap).length === 0) {
      console.error('priceMap is not loaded!', priceMap);
      return;
    }
    
    // Update cart items with safety checks
    cartItemsEl.innerHTML = cart.map(item => {
      const price = item.price || priceMap[item.menu_item] || 0;
      const totalPrice = (price * item.quantity).toFixed(2);
      
      // Debug: Log any NaN issues
      if (isNaN(totalPrice)) {
        console.error('NaN detected for item:', item, 'price:', price, 'priceMap:', priceMap[item.menu_item]);
      }
      
      return `
        <div class="cart-item">
          <img src="${imgMap[item.menu_item]}" alt="${item.menu_item}" />
          <div class="cart-item-details">
            <h4>${item.menu_item}</h4>
            <p>Qty: ${item.quantity}</p>
            <p>$${totalPrice}</p>
          </div>
        </div>
      `;
    }).join('');
    
    // Update total with safety checks
    const total = cart.reduce((sum, item) => {
      const price = item.price || priceMap[item.menu_item] || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    totalEl.textContent = `$${total.toFixed(2)}`;

    // Adjust cart panel layout based on content size
    adjustCartPanelLayout();
  }

  // Synchronize cart between live cart and checkout
  function synchronizeCart() {
    if (cart && cart.length > 0) {
      updateLiveCart(cart);
      renderCartSummary();
      
      // Show appropriate cart based on agent type
      if (currentAgentType === 'sales') {
        showLiveCart();
        const checkoutPanel = document.getElementById('checkout');
        if (checkoutPanel) {
          checkoutPanel.classList.add('hidden');
        }
      } else if (currentAgentType === 'payment') {
        hideLiveCart();
        showCheckoutPanel();
      }
    } else {
      hideLiveCart();
      const checkoutPanel = document.getElementById('checkout');
      if (checkoutPanel) {
        checkoutPanel.classList.add('hidden');
      }
    }
  }

  function showLiveCart() {
    const cartPanel = document.getElementById('live-cart');
    if (cartPanel) {
      cartPanel.classList.remove('hidden');
      adjustCartPanelLayout();
    }
  }

  function hideLiveCart() {
    const cartPanel = document.getElementById('live-cart');
    if (cartPanel) {
      cartPanel.classList.add('hidden');
    }
  }

  // Animate cart transition to checkout
  async function animateCartToCheckout() {
    const cartPanel = document.getElementById('live-cart');
    const checkoutPanel = document.getElementById('checkout');
    
    if (!cartPanel || !checkoutPanel) {
      console.warn('Cart or checkout panel not found');
      showCheckoutPanel();
      return;
    }
    
    try {
      // Ensure cart data is preserved
      if (cart && cart.length > 0) {
        // Update checkout cart before animation
        renderCartSummary();
      }
      
      // Add transition class to cart panel
      cartPanel.classList.add('transitioning-to-checkout');
      
      // Wait for cart animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Hide cart panel
      cartPanel.classList.add('hidden');
      cartPanel.classList.remove('transitioning-to-checkout');
      
      // Show checkout panel
      showCheckoutPanel();
      
      // Double-check cart data is properly transferred
      if (cart && cart.length > 0) {
        renderCartSummary();
        console.log('Cart transferred to checkout:', cart);
      }
      
    } catch (error) {
      console.error('Error during cart transition:', error);
      // Fallback to simple transition
      showCheckoutPanel();
      if (cart && cart.length > 0) {
        renderCartSummary();
      }
    }
  }

  // Toggle cart panel expanded mode to avoid internal scrolling when content grows
  function adjustCartPanelLayout() {
    const cartPanel = document.getElementById('live-cart');
    const itemsContainer = document.getElementById('live-cart-items');
    if (!cartPanel || !itemsContainer) return;

    // Compute if items would overflow typical fixed-height layout
    const contentHeight = itemsContainer.scrollHeight + 140; // header/footer approx
    const viewportHeight = window.innerHeight;

    if (contentHeight > viewportHeight * 0.7) {
      // Switch to expanded mode: place in page flow so all items are visible
      cartPanel.classList.add('expanded');
    } else {
      cartPanel.classList.remove('expanded');
    }
  }

  // Re-evaluate on resize and orientation changes
  window.addEventListener('resize', () => {
    adjustCartPanelLayout();
  });

  function stopSession() {
    resetConnection();
    updateStatus('Disconnected', false);
    addMessage('--- Session ended ---');
    
    // Update state and button appearance
    isSessionActive = false;
    micButton.classList.remove('active');
    micButton.title = 'Start listening';
    
    // Restore original icon (microphone)
    pauseIcon.classList.add('hidden');
    micIcon.classList.remove('hidden');
  }

  function resetConnection() {
    mediaStream?.getTracks().forEach(t => t.stop());
    dataChannel?.close();
    peerConnection?.close();
    audioElement && (audioElement.srcObject = null);

    mediaStream    = null;
    dataChannel    = null;
    peerConnection = null;
    audioElement   = null;
    sessionId      = null;
  }

  // Add event listener for microphone button
  micButton.addEventListener('click', toggleMicSession);

  // —— 3D Carousel Logic —— //
  const carouselEl = document.getElementById('carousel');
  const carouselItems = Array.from(document.querySelectorAll('.carousel-item'));
  const carouselTotal = carouselItems.length;
  if (carouselTotal > 0) {
    let idx = 0;
    const carouselAngle = 360 / carouselTotal;

    function calculateRadius() {
      return window.innerWidth < 600 ? 200 : 300;
    }

    function positionItems() {
      const r = calculateRadius();
      carouselItems.forEach((el, i) => {
        let rawAngle = ((i - idx) * carouselAngle + 360) % 360;
        const isFront = rawAngle < 1e-6 || rawAngle > 360 - 1e-6;
        const angle   = isFront ? 0 : rawAngle;
        const rad     = angle * Math.PI / 180;
        const x       = Math.sin(rad) * r;
        const z       = Math.cos(rad) * r;
        const scale   = Math.max(0.6, 1 - Math.abs(x) / (r * 2));

        el.style.transform = `translate3d(${x}px,0,${z}px) scale(${scale})`;
        el.classList.toggle('active', isFront);
        el.style.zIndex = isFront ? 2 : 1;
      });
    }

    window.rotate = direction => {
      idx = (idx - direction + carouselTotal) % carouselTotal;
      positionItems();
    };

    function debounce(fn, delay = 100) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
      };
    }

    window.addEventListener('resize', debounce(positionItems));
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  window.rotate(-1);
      if (e.key === 'ArrowRight') window.rotate(1);
    });

    let startX = null;
    if (carouselEl) {
      carouselEl.addEventListener('touchstart', e => startX = e.touches[0].clientX);
      carouselEl.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx > 50)  window.rotate(-1);
        if (dx < -50) window.rotate(1);
      });
    }

    positionItems();
  }

  /* ---------- Order-complete helpers ---------- */
  function generateOrderId() {
    // Simple 7-character alphanumeric ID
    const seed = Math.random().toString(36).slice(2).toUpperCase() +
                 Date.now().toString(36).toUpperCase();
    return seed.slice(-7);
  }

  function showOrderComplete(orderId) {
    const successSection = document.getElementById('order-complete');
    const paymentForm = document.getElementById('payment-form');
    if (!successSection) return;

    // Populate dynamic order number
    const numEl = document.getElementById('order-number');
    if (numEl) numEl.textContent = orderId;

    // Hide other panels, reveal success card
    document.getElementById('checkout')?.classList.add('hidden');
    paymentForm?.classList.add('hidden');
    successSection.classList.remove('hidden');
    successSection.scrollIntoView({ behavior: 'smooth' });
  }

  // —— Checkout UI event handlers —— 
  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
    const name  = document.getElementById('checkout-name').textContent;
    const qty   = parseInt(document.getElementById('checkout-quantity').value, 10);
    const price = priceMap[name];
    cart.push({ menu_item: name, quantity: qty, price });
    renderCartSummary();
    showCheckoutPanel();
  });
  
  // Disabled proceed payment button click functionality
  // document.getElementById('proceed-payment-btn')?.addEventListener('click', () => {
  //   // Trigger tool call to switch agents
  //   handleFunctionCall('transfer_to_payments_agent', { cart });
  // });
});