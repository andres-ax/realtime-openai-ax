# 🎤 Realtime OpenAI Voice Ordering App

Una aplicación sofisticada de pedidos por voz que utiliza la API Realtime de OpenAI con WebRTC para crear una experiencia de compra conversacional.

![Voice Ordering App](https://github.com/cameronking4/openai-realtime-api-nextjs/assets/16362860/a9e3f7f8-9e7d-4a1b-9b9f-c0b2c4b9d9e7)

## 🚀 Características Principales

- **🎤 Interfaz de Voz Realtime**: Integración con OpenAI Realtime API para conversaciones naturales
- **🔄 WebRTC**: Comunicación bidireccional en tiempo real para audio y datos
- **🎯 Function Calling**: Integración avanzada con herramientas mediante function calling
- **🎠 Carousel 3D**: Visualización interactiva del menú con rotación tridimensional
- **🤖 Agentes Especializados**: Cambio contextual entre agentes de ventas y pagos
- **🛒 Gestión de Carrito**: Actualización en tiempo real del carrito de compras
- **🗺️ Integración con Google Maps**: Visualización de direcciones de entrega
- **💳 Flujo de Checkout**: Proceso completo de pago y confirmación de pedido

## 🏗️ Arquitectura

La aplicación está construida siguiendo una arquitectura moderna y patrones avanzados:

- **🔄 Event-Driven Architecture**: Comunicación mediante eventos entre componentes
- **🎯 Domain-Driven Design**: Organización del código por dominios de negocio
- **🛡️ Type Safety Pattern**: Tipado estricto con TypeScript para mayor robustez
- **🎭 Observer Pattern**: Sincronización de estado entre componentes UI
- **🔒 Result Pattern**: Manejo explícito de errores y resultados
- **🎪 Decorator Pattern**: Extensión de funcionalidad en componentes clave

## 🧩 Componentes Principales

### 1. VoiceInterface
Botón de micrófono con estados visuales que gestiona la comunicación con OpenAI Realtime API.

### 2. MenuCarousel
Carousel 3D interactivo que muestra los productos disponibles con rotación suave.

### 3. LiveCart
Panel de carrito en tiempo real que se actualiza automáticamente según la conversación.

### 4. CheckoutFlow
Proceso completo de pago con validación de datos y visualización de mapas.

### 5. OrderComplete
Pantalla de confirmación con animaciones y detalles del pedido.

## 🔧 Hooks Personalizados

### useWebRTC
Gestiona la conexión WebRTC con OpenAI Realtime API, incluyendo:
- Negociación SDP
- Gestión de streams de audio
- Canales de datos para function calling
- Cambio de agentes (sales/payment)

### useToolCalling
Implementa el patrón Function Calling para integrar herramientas con la API:
- Definición de herramientas disponibles
- Procesamiento de llamadas a funciones
- Validación y sanitización de JSON
- Manejo de errores robusto

## 🔄 Flujo de Datos

1. El usuario inicia una sesión de voz con el botón de micrófono
2. La aplicación establece una conexión WebRTC con OpenAI Realtime API
3. El audio del usuario se envía en tiempo real a la API
4. La API responde con audio y/o llamadas a funciones
5. Las llamadas a funciones actualizan la UI (carousel, carrito, etc.)
6. Los eventos de UI se propagan a través del sistema
7. El estado se sincroniza entre componentes mediante eventos

## 🛠️ Tecnologías Utilizadas

- **Next.js 15**: Framework React con Turbopack
- **TypeScript**: Tipado estático para mayor robustez
- **WebRTC**: Comunicación en tiempo real
- **OpenAI Realtime API**: Procesamiento de voz y generación de respuestas
- **Google Maps API**: Visualización de direcciones
- **CSS Modules**: Estilos encapsulados por componente

## 🚀 Cómo Ejecutar

1. Clona el repositorio:
   ```bash
   git clone https://github.com/yourusername/realtime-openai-ax.git
   cd realtime-openai-ax
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   ```
   OPENAI_API_KEY=tu_api_key_de_openai
   GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
   ```

4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Rutas y páginas de Next.js
│   ├── api/                # Endpoints de API
│   │   ├── menu-data/      # API para datos del menú
│   │   └── session/        # API para gestión de sesiones
│   ├── debug/              # Página de debug
│   └── voice-ordering/     # Página principal de pedidos por voz
├── components/             # Componentes React
│   ├── forms/              # Formularios (CheckoutFlow)
│   ├── layout/             # Componentes de layout
│   └── ui/                 # Componentes de UI (MenuCarousel, VoiceInterface, etc.)
└── hooks/                  # Hooks personalizados
    ├── useToolCalling.ts   # Hook para function calling
    └── useWebRTC.ts        # Hook para WebRTC
```

## 🔐 Seguridad

- **🔑 Token Management Pattern**: Gestión segura de ephemeral keys para OpenAI
- **🛡️ Validación Robusta**: Sanitización de inputs y validación de datos
- **🔒 Secure Mapping Pattern**: Transformación segura de datos entre capas

## 🌟 Características Avanzadas

- **🎯 Voice-to-UI Synchronization**: Los elementos UI responden a comandos de voz
- **🔄 Agent Switching**: Cambio contextual entre agentes especializados
- **🛡️ Robust Error Handling**: Manejo de errores en todos los niveles
- **🚀 Performance Optimizations**: Lazy loading y optimizaciones de rendimiento

## 📝 Licencia

MIT

## 🙏 Agradecimientos

- OpenAI por la API Realtime
- El proyecto base [cameronking4/openai-realtime-api-nextjs](https://github.com/cameronking4/openai-realtime-api-nextjs)
