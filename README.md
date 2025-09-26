# 🎤 Realtime OpenAI Voice Ordering Application

A sophisticated voice-driven food ordering application leveraging OpenAI's Realtime API with WebRTC to create a seamless conversational shopping experience with specialized AI agents.

![Voice Ordering App](https://github.com/cameronking4/openai-realtime-api-nextjs/assets/16362860/a9e3f7f8-9e7d-4a1b-9b9f-c0b2c4b9d9e7)

## 🚀 Key Features

- **🎤 Realtime Voice Interface**: Natural conversational experience powered by OpenAI's Realtime API
- **🔄 Bidirectional WebRTC**: Real-time audio and data communication with seamless agent switching
- **🎯 Advanced Function Calling**: Sophisticated tool integration with robust error handling
- **🎠 Interactive 3D Carousel**: Immersive menu visualization with smooth rotation and focus effects
- **🤖 Specialized AI Agents**: Context-aware switching between sales and payment specialists
- **🛒 Live Cart Management**: Real-time cart updates synchronized with voice conversation
- **🗺️ Google Maps Integration**: Visual delivery address confirmation and validation
- **💳 Comprehensive Checkout Flow**: Complete payment processing with step-by-step guidance
- **🔄 Session Persistence**: Maintain WebRTC connection when switching between agents
- **🎭 Proactive Conversation**: Agents actively guide users through the ordering process

## 🏗️ Architecture

The application is built following modern architecture principles and advanced design patterns:

- **🔄 Event-Driven Architecture**: Components communicate via custom events for loose coupling
- **🎯 Domain-Driven Design**: Code organized by business domains with clear boundaries
- **🛡️ Type Safety Pattern**: Strict TypeScript typing with comprehensive interfaces
- **🎭 Observer Pattern**: State synchronization between UI components
- **🔒 Result Pattern**: Explicit error and success handling with structured responses
- **🎪 Decorator Pattern**: Enhanced functionality through composition
- **🚦 State Machine Pattern**: Clear state transitions for voice interface and checkout flow
- **🔧 Repository Pattern**: Data access abstraction with caching for menu items
- **🧩 Component Composition**: Modular UI with clear separation of concerns

## 🧩 Core Components

### Voice Interface System

- **VoiceInterface Component**: Microphone button with visual states managing WebRTC communication
- **useWebRTC Hook**: Handles WebRTC connection, media streams, and data channels
- **Agent Switching Logic**: Seamless transition between specialized AI agents without disconnection
- **Session Update Mechanism**: Updates agent instructions and tools without reconnecting

### Menu Visualization

- **MenuCarousel Component**: Interactive 3D carousel with dynamic item focusing
- **Item Highlighting**: Visual feedback when items are mentioned in conversation
- **Smooth Transitions**: Animated rotations and focus effects for enhanced UX
- **Responsive Design**: Adapts to different screen sizes while maintaining 3D effect

### Order Management

- **LiveCart Component**: Real-time cart panel updating based on conversation
- **Dynamic Updates**: Synchronized with voice commands and function calls
- **Quantity Controls**: Interactive adjustment of order quantities
- **Order Confirmation**: Clear visual feedback for added items

### Payment Processing

- **CheckoutFlow Component**: Complete checkout process with form validation
- **Step-by-Step Guidance**: Structured information collection with validation
- **Payment Information**: Secure credit card data collection
- **Google Maps Integration**: Visual confirmation of delivery address
- **Order Confirmation**: Final review and submission

### Order Completion

- **OrderComplete Component**: Order confirmation with animation and details
- **Order Tracking**: Order number generation and status display
- **Next Steps Information**: Clear guidance on what happens after ordering
- **New Order Option**: Easy way to start a new order

## 🔧 Custom Hooks

### useWebRTC

Manages WebRTC connection with OpenAI Realtime API, including:

- **SDP Negotiation**: Handles WebRTC signaling protocol
- **Media Stream Management**: Microphone access and audio playback
- **Data Channel Communication**: Bidirectional messaging for function calls
- **Agent Switching**: Seamless transition between specialized agents
- **Session Updates**: Ability to update session parameters without disconnection
- **Error Handling**: Robust error recovery and connection state management
- **Voice Selection**: Consistent voice across agents for seamless transitions

### useToolCalling

Implements the Function Calling pattern for tool integration:

- **Tool Definition**: Structured definition of available tools and parameters
- **Function Call Processing**: Parsing and execution of function calls
- **JSON Validation**: Robust parsing with multiple fallback strategies
- **Error Handling**: Comprehensive error management with structured responses
- **Tool Registry**: Centralized registry of available tools with documentation
- **Type Safety**: Strong typing for tool parameters and return values

## 🔄 Data Flow

1. **Initialization**:
   - User lands on voice ordering page
   - Menu items are loaded from API or static data
   - 3D carousel is initialized with menu items

2. **Voice Session Start**:
   - User clicks microphone button to start voice session
   - WebRTC connection is established with OpenAI Realtime API
   - Sales agent (Luxora) is initialized with specific instructions and tools

3. **Menu Navigation**:
   - User can browse menu items through voice commands
   - AI focuses items in the 3D carousel using `focus_menu_item` tool
   - Visual feedback shows the currently discussed item

4. **Order Process**:
   - User adds items to cart through conversation
   - AI updates cart using `order` tool
   - LiveCart component displays current order in real-time
   - AI proactively confirms additions and suggests complementary items

5. **Checkout Transition**:
   - User confirms readiness to checkout
   - AI uses `transfer_to_payment` tool
   - System switches to payment agent (Karol) without disconnecting
   - View changes to checkout flow

6. **Payment Process**:
   - Payment agent guides user through structured information collection
   - Each piece of information is validated and stored
   - Google Maps displays delivery address for confirmation
   - AI uses `update_order_data` tool to update checkout information

7. **Order Completion**:
   - User confirms final order details
   - System processes payment (simulated)
   - Order confirmation screen is displayed with order number
   - User can start a new order or return to menu

8. **Return to Menu (Optional)**:
   - User can return to menu to modify order
   - AI uses `transfer_to_menu_agent` tool
   - System switches back to sales agent
   - View returns to menu carousel

## 🛠️ Technologies

- **Next.js 15**: React framework with Turbopack for fast development
- **TypeScript**: Static typing for enhanced code quality and developer experience
- **WebRTC**: Real-time communication protocol for audio and data
- **OpenAI Realtime API**: AI-powered voice processing and response generation
- **Google Maps API**: Visual address confirmation and validation
- **CSS Modules**: Component-scoped styling with modern CSS features

## 🚀 Advanced Features

### Seamless Agent Switching

The application implements a sophisticated agent switching mechanism that:

- Maintains WebRTC connection when switching between agents
- Uses OpenAI's `session.update` message to change instructions and tools
- Falls back to reconnection only when necessary (different voices)
- Provides consistent user experience across agent transitions

### Proactive Conversation Flow

AI agents are designed to be proactively helpful:

- Sales agent (Luxora) actively suggests complementary items
- Payment agent (Karol) guides users through a structured checkout process
- Both agents follow up after every action without waiting for user prompts
- Clear confirmation and acknowledgment of user actions

### Robust Error Handling

The application implements comprehensive error handling:

- **JSON Parsing**: Multiple strategies for handling malformed JSON
- **WebRTC Connection**: Graceful recovery from connection issues
- **Tool Execution**: Structured error responses with context
- **Form Validation**: Clear feedback for invalid inputs

### Performance Optimizations

- **Efficient Rendering**: React optimizations to minimize re-renders
- **Hardware Acceleration**: CSS transforms with GPU acceleration
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Lazy Loading**: Components and resources loaded only when needed

## 🔐 Security Considerations

- **Ephemeral Session Keys**: Short-lived authentication tokens for OpenAI API
- **Input Validation**: Comprehensive validation of all user inputs
- **Secure Data Handling**: Sensitive information is properly managed
- **API Protection**: Backend endpoints with proper error handling and rate limiting

## 📋 Use Cases

### Customer Ordering Experience

1. **Menu Exploration**:
   - Customer opens the application and starts voice interaction
   - AI introduces available menu items and specials
   - Customer can ask questions about ingredients, prices, and options
   - AI highlights items in the 3D carousel as they're discussed

2. **Order Building**:
   - Customer adds items to cart through natural conversation
   - AI confirms each addition and suggests complementary items
   - Customer can modify quantities or remove items
   - AI keeps track of the order and provides summaries

3. **Checkout Process**:
   - Customer indicates readiness to complete order
   - AI transitions to payment specialist
   - Customer provides delivery and payment information
   - AI validates each piece of information and confirms understanding
   - Order is reviewed and confirmed

4. **Order Confirmation**:
   - Customer receives order confirmation with tracking number
   - Estimated delivery time is provided
   - Customer can start a new order if desired

### Business Administration

1. **Menu Management**:
   - Update menu items, prices, and availability
   - Add new items with descriptions and images
   - Organize items by category for better navigation

2. **Order Analytics**:
   - Track popular items and combinations
   - Analyze peak ordering times
   - Monitor average order value and completion rate

3. **Customer Insights**:
   - Understand common questions and concerns
   - Identify friction points in the ordering process
   - Optimize agent instructions based on conversation patterns

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key with access to Realtime API
- Google Maps API key (for address visualization)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/realtime-openai-ax.git
   cd realtime-openai-ax
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with required environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Deployment

For production deployment:

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/                # API endpoints
│   │   ├── menu-data/      # Menu data API
│   │   └── session/        # Session management API
│   ├── voice-ordering/     # Main voice ordering page
│   └── page.tsx            # Root page (redirects to voice ordering)
├── components/             # React components
│   ├── forms/              # Form components (CheckoutFlow)
│   ├── layout/             # Layout components
│   ├── ui/                 # UI components
│   │   ├── MenuCarousel.tsx    # 3D menu carousel
│   │   ├── VoiceInterface.tsx  # Voice interaction button
│   │   ├── LiveCart.tsx        # Real-time cart display
│   │   └── OrderComplete.tsx   # Order confirmation screen
│   └── types.ts            # Shared component types
└── hooks/                  # Custom React hooks
    ├── useToolCalling.ts   # Tool/function calling hook
    └── useWebRTC.ts        # WebRTC connection management
```

## 🔍 Key Implementation Details

### WebRTC Connection Flow

1. **Session Creation**:
   - Backend API creates an ephemeral session with OpenAI
   - Session includes agent instructions and allowed tools
   - Client receives session ID and client secret

2. **WebRTC Negotiation**:
   - Client creates RTCPeerConnection and data channel
   - SDP offer is created and sent to OpenAI API
   - SDP answer is received and applied to peer connection

3. **Media Stream Handling**:
   - Microphone access is requested and granted
   - Audio tracks are added to peer connection
   - Remote audio stream is connected to audio element

4. **Data Channel Communication**:
   - Data channel is established for function calling
   - Messages are sent and received as JSON
   - Function calls are processed and executed

### Tool Integration

The application integrates several tools for AI interaction:

- **focus_menu_item**: Highlights specific items in the carousel
- **order**: Updates the cart with items and quantities
- **update_order_data**: Updates checkout information
- **transfer_to_payment**: Switches to payment agent
- **transfer_to_menu_agent**: Returns to menu agent
- **get_current_time**: Provides current time information
- **party_mode**: Activates visual effects (easter egg)

Each tool is defined with:
- Name and description
- Parameter schema (JSON Schema)
- Handler function for execution
- Return value structure

### Agent Specialization

The application features two specialized AI agents:

**Luxora (Sales Agent)**:
- Focuses on menu exploration and recommendations
- Proactively suggests items and combinations
- Manages the cart and order building
- Guides users toward checkout when appropriate

**Karol (Payment Agent)**:
- Specializes in structured information collection
- Follows a step-by-step checkout process
- Validates delivery and payment information
- Provides clear confirmation and next steps

## 📝 License

MIT

## 🙏 Acknowledgements

- OpenAI for the Realtime API
- The base project [cameronking4/openai-realtime-api-nextjs](https://github.com/cameronking4/openai-realtime-api-nextjs)
- Google Maps for address visualization