/**
 * 🏗️ PATRÓN: Demo Page Pattern
 * 🎯 PRINCIPIO: Architecture Showcase + Real Usage Examples
 * 
 * Demo Page - Demostración de la arquitectura implementada
 * Muestra el uso real de Use Cases, Commands, Queries y Event Handlers
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  ProcessPaymentUseCase,
  UpdateCartUseCase,
  GetCartSummaryQuery,
  CartUpdatedEventHandler,
  AddToCartCommand
} from '@/application';
import { 
  GoogleMapsAdapter,
  VoiceService,
  RealtimeApiAdapter 
} from '@/infrastructure';
import { 
  Price,
  CartId,
  CustomerId,
  OrderId 
} from '@/domain';

export default function DemoPage() {
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('Ready');

  useEffect(() => {
    // Configurar event handler para actualizaciones de carrito
    const cartHandler = new CartUpdatedEventHandler();
    
    // Simular registro de event handler
    window.addEventListener('realtime-cart-update', (event: any) => {
      setCartTotal(event.detail.totalAmount);
      setStatus(`Cart updated: ${event.detail.itemCount} items`);
    });

    return () => {
      window.removeEventListener('realtime-cart-update', () => {});
    };
  }, []);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      // 🎯 DEMOSTRACIÓN: Use Case Pattern
      const updateCartUseCase = new UpdateCartUseCase(
        {} as any, // Mock repositories
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // 📝 DEMOSTRACIÓN: Command Pattern
      const command = new AddToCartCommand(
        'cart-demo-123',
        'customer-demo-456',
        'Delicious Burger',
        1,
        'session-demo-789',
        'agent-sales-001',
        'VOICE_ORDER',
        'Extra cheese please'
      );

      setStatus('Adding item to cart...');
      
      // Simular resultado exitoso
      setTimeout(() => {
        setCartTotal(prev => prev + 12.99);
        setStatus('Item added successfully!');
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      setStatus('Error adding item to cart');
      setIsLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    setIsLoading(true);
    try {
      // 🎯 DEMOSTRACIÓN: Use Case Pattern
      const paymentUseCase = new ProcessPaymentUseCase(
        {} as any, // Mock dependencies
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      setStatus('Processing payment...');
      
      // Simular procesamiento de pago
      setTimeout(() => {
        setStatus('Payment processed successfully!');
        setCartTotal(0);
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      setStatus('Payment processing failed');
      setIsLoading(false);
    }
  };

  const handleGetCartSummary = async () => {
    setIsLoading(true);
    try {
      // 🔍 DEMOSTRACIÓN: Query Pattern
      const cartQuery = new GetCartSummaryQuery(
        CartId.fromString('cart-demo-123'),
        true, // includeRecommendations
        true  // includePricing
      );

      setStatus('Loading cart summary...');
      
      // Simular carga de resumen
      setTimeout(() => {
        setStatus('Cart summary loaded');
        setIsLoading(false);
      }, 800);

    } catch (error) {
      setStatus('Failed to load cart summary');
      setIsLoading(false);
    }
  };

  const handleInitializeServices = async () => {
    setIsLoading(true);
    try {
      setStatus('Initializing services...');

      // 🏗️ DEMOSTRACIÓN: Adapter Pattern
      const googleMaps = new GoogleMapsAdapter({
        apiKey: 'demo-key-123',
        region: 'US',
        language: 'en'
      });

      const voiceService = new VoiceService({
        enableVAD: true,
        sampleRate: 16000,
        language: 'en-US'
      });

      const realtimeApi = new RealtimeApiAdapter({
        apiKey: 'demo-openai-key',
        model: 'gpt-4o-realtime-preview-2024-10-01'
      });

      // Simular inicialización
      setTimeout(() => {
        setStatus('All services initialized successfully!');
        setIsLoading(false);
      }, 1500);

    } catch (error) {
      setStatus('Service initialization failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏗️ Realtime OpenAI Architecture Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Demostración de la arquitectura hexagonal con 39 patrones implementados
          </p>

          {/* Status Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`text-sm font-semibold ${
                status.includes('Error') || status.includes('failed') 
                  ? 'text-red-600' 
                  : status.includes('successfully') 
                    ? 'text-green-600' 
                    : 'text-blue-600'
              }`}>
                {status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium text-gray-700">Cart Total:</span>
              <span className="text-lg font-bold text-green-600">
                ${cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Demo Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleAddToCart}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '⏳ Processing...' : '🛒 Add to Cart (Use Case)'}
            </button>

            <button
              onClick={handleProcessPayment}
              disabled={isLoading || cartTotal === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '⏳ Processing...' : '💳 Process Payment'}
            </button>

            <button
              onClick={handleGetCartSummary}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '⏳ Loading...' : '📊 Get Cart Summary (Query)'}
            </button>

            <button
              onClick={handleInitializeServices}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '⏳ Initializing...' : '🚀 Initialize Services'}
            </button>
          </div>

          {/* Architecture Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🏛️ Arquitectura Implementada
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-blue-700 mb-2">🎯 Domain Layer</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• 6 Entidades principales</li>
                  <li>• 12 Value Objects</li>
                  <li>• 6 Domain Events</li>
                  <li>• 4 Domain Services</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-green-700 mb-2">🚀 Application Layer</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• 5 Use Cases</li>
                  <li>• 5 Commands (CQRS)</li>
                  <li>• 4 Queries (CQRS)</li>
                  <li>• 3 Event Handlers</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-700 mb-2">🔧 Infrastructure Layer</h3>
                <ul className="text-gray-600 space-y-1">
                  <li>• 8 Adapters especializados</li>
                  <li>• 4 Services de infraestructura</li>
                  <li>• OpenAI + WebRTC + Google Maps</li>
                  <li>• Event-driven architecture</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded border-l-4 border-yellow-400">
              <p className="text-sm text-gray-700">
                <strong>🎉 39 Patrones Arquitectónicos Implementados:</strong> Hexagonal Architecture, 
                DDD, CQRS, Event-Driven, Repository, Factory, Builder, Adapter, Observer, Strategy, 
                Result Pattern, y muchos más.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
