/**
 * 🏗️ PATRÓN: Barrel Export Pattern
 * 🎯 PRINCIPIO: Infrastructure Layer Entry Point
 * 
 * Infrastructure Layer - Punto de entrada único
 * Exporta todos los adaptadores y servicios de infraestructura
 */

// OpenAI Adapters
export { RealtimeApiAdapter } from './adapters/openai/RealtimeApiAdapter';
export { AgentConfigAdapter } from './adapters/openai/AgentConfigAdapter';
export { FunctionCallAdapter } from './adapters/openai/FunctionCallAdapter';
export { SessionManagementAdapter } from './adapters/openai/SessionManagementAdapter';

// WebRTC Adapters
export { WebRTCAdapter } from './adapters/webrtc/WebRTCAdapter';
export { AudioStreamAdapter } from './adapters/webrtc/AudioStreamAdapter';
export { PeerConnectionAdapter } from './adapters/webrtc/PeerConnectionAdapter';

// External Adapters
export { GoogleMapsAdapter } from './adapters/external/GoogleMapsAdapter';

// Services
export { VoiceService } from './services/VoiceService';
export { CartSyncService } from './services/CartSyncService';
export { SessionService } from './services/SessionService';
export { EventBusService } from './services/EventBusService';

// Base Classes
export { BaseApiAdapter } from './adapters/api/BaseApiAdapter';

// Types
export type { ApiResult, ApiConfig, RetryConfig } from './adapters/api/BaseApiAdapter';
export type { GoogleMapsConfig, Coordinates, GeocodingResult } from './adapters/external/GoogleMapsAdapter';
export type { WebRTCConfig, AudioStreamConfig } from './adapters/webrtc/WebRTCAdapter';
