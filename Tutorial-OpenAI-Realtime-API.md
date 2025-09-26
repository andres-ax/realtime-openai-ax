# Tutorial: Implementación de OpenAI Realtime API con WebRTC

## Introducción

Este tutorial explica en detalle cómo implementar la API Realtime de OpenAI en aplicaciones web utilizando WebRTC. La API Realtime permite crear experiencias de conversación en tiempo real con modelos de lenguaje avanzados como GPT-4o, incluyendo capacidades de voz y texto simultáneas.

## Índice

1. [Arquitectura general](#arquitectura-general)
2. [Requisitos previos](#requisitos-previos)
3. [Proceso de autenticación](#proceso-de-autenticación)
4. [Establecimiento de conexión WebRTC](#establecimiento-de-conexión-webrtc)
5. [Flujo de datos y eventos](#flujo-de-datos-y-eventos)
6. [Implementación de herramientas (tools)](#implementación-de-herramientas-tools)
7. [Adaptación a otros proyectos](#adaptación-a-otros-proyectos)
8. [Consideraciones de seguridad](#consideraciones-de-seguridad)

## Arquitectura general

La implementación utiliza una arquitectura cliente-servidor donde:

- **Cliente (navegador)**: Gestiona la conexión WebRTC, captura audio del micrófono, reproduce audio del asistente y maneja la interfaz de usuario.
- **Servidor Next.js**: Proporciona una API para obtener tokens efímeros sin exponer la API key de OpenAI.
- **OpenAI Realtime API**: Procesa el audio, ejecuta el modelo de lenguaje y devuelve respuestas en tiempo real.

El flujo de comunicación se establece mediante WebRTC, utilizando:
- **RTCPeerConnection**: Para establecer la conexión peer-to-peer
- **RTCDataChannel**: Para mensajes de control y transcripciones
- **MediaStream**: Para transmitir audio bidireccional

## Requisitos previos

Para implementar la API Realtime de OpenAI necesitas:

1. **API Key de OpenAI** con acceso a los modelos Realtime
2. **Servidor Next.js** (o cualquier backend) para gestionar tokens efímeros
3. **Navegador moderno** con soporte para WebRTC
4. **Dependencias**:
   - uuid: Para generar identificadores únicos
   - Opcional: framer-motion para animaciones

## Proceso de autenticación

La autenticación con la API Realtime de OpenAI utiliza un sistema de tokens efímeros para evitar exponer la API key en el cliente:

1. **Solicitud de token efímero**:
   ```typescript
   // En el cliente (hooks/use-webrtc.ts)
   async function getEphemeralToken() {
     const response = await fetch("/api/session", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
     });
     const data = await response.json();
     return data.client_secret.value;
   }
   ```

2. **Generación del token en el servidor**:
   ```typescript
   // En el servidor (app/api/session/route.ts)
   export async function POST() {
     const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "gpt-4o-realtime-preview-2024-12-17",
         voice: "alloy",
         modalities: ["audio", "text"],
         instructions: "Start conversation with the user...",
         tool_choice: "auto",
       }),
     });
     
     const data = await response.json();
     return NextResponse.json(data);
   }
   ```

3. **Uso del token efímero para conectar con la API**:
   ```typescript
   const response = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
     method: "POST",
     body: offer.sdp,
     headers: {
       Authorization: `Bearer ${ephemeralToken}`,
       "Content-Type": "application/sdp",
     },
   });
   ```

## Establecimiento de conexión WebRTC

El proceso de establecimiento de la conexión WebRTC sigue estos pasos:

1. **Solicitar acceso al micrófono**:
   ```typescript
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   ```

2. **Crear conexión RTCPeerConnection**:
   ```typescript
   const pc = new RTCPeerConnection();
   ```

3. **Crear canal de datos**:
   ```typescript
   const dataChannel = pc.createDataChannel("response");
   dataChannel.onopen = () => configureDataChannel(dataChannel);
   dataChannel.onmessage = handleDataChannelMessage;
   ```

4. **Añadir pista de audio local**:
   ```typescript
   pc.addTrack(stream.getTracks()[0]);
   ```

5. **Crear oferta SDP**:
   ```typescript
   const offer = await pc.createOffer();
   await pc.setLocalDescription(offer);
   ```

6. **Enviar oferta a OpenAI y recibir respuesta**:
   ```typescript
   const response = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
     method: "POST",
     body: offer.sdp,
     headers: {
       Authorization: `Bearer ${ephemeralToken}`,
       "Content-Type": "application/sdp",
     },
   });
   
   const answerSdp = await response.text();
   await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
   ```

7. **Configurar manejo de pistas entrantes** (audio del asistente):
   ```typescript
   pc.ontrack = (event) => {
     audioEl.srcObject = event.streams[0];
     // Configuración adicional para análisis de volumen...
   };
   ```

## Flujo de datos y eventos

La comunicación con la API Realtime utiliza un sistema de eventos a través del DataChannel:

### Eventos principales:

1. **Configuración inicial de la sesión**:
   ```typescript
   function configureDataChannel(dataChannel: RTCDataChannel) {
     const sessionUpdate = {
       type: "session.update",
       session: {
         modalities: ["text", "audio"],
         tools: tools || [],
         input_audio_transcription: {
           model: "whisper-1",
         },
       },
     };
     dataChannel.send(JSON.stringify(sessionUpdate));
   }
   ```

2. **Manejo de eventos de entrada de audio**:
   - `input_audio_buffer.speech_started`: Cuando el usuario comienza a hablar
   - `input_audio_buffer.speech_stopped`: Cuando el usuario deja de hablar
   - `input_audio_buffer.committed`: Cuando el buffer de audio se envía para procesamiento
   - `conversation.item.input_audio_transcription`: Transcripción parcial del habla del usuario
   - `conversation.item.input_audio_transcription.completed`: Transcripción final del habla del usuario

3. **Manejo de respuestas del asistente**:
   - `response.audio_transcript.delta`: Fragmentos de texto de la respuesta del asistente
   - `response.audio_transcript.done`: Finalización de la respuesta del asistente
   - `response.function_call_arguments.done`: Llamada a una función (herramienta)

4. **Envío de mensajes de texto**:
   ```typescript
   function sendTextMessage(text: string) {
     const message = {
       type: "conversation.item.create",
       item: {
         type: "message",
         role: "user",
         content: [{ type: "input_text", text: text }],
       },
     };
     
     dataChannel.send(JSON.stringify(message));
     dataChannel.send(JSON.stringify({ type: "response.create" }));
   }
   ```

## Implementación de herramientas (tools)

Las herramientas permiten al asistente realizar acciones en el navegador del usuario:

1. **Definición de herramientas**:
   ```typescript
   // lib/tools.ts
   const toolDefinitions = {
     getCurrentTime: {
       description: 'Gets the current time in the user\'s timezone',
       parameters: {}
     },
     changeBackgroundColor: {
       description: 'Changes the background color of the page', 
       parameters: {
         color: { 
           type: 'string',
           description: 'Color value (hex, rgb, or color name)'
         }
       }
     },
     // Más definiciones...
   };
   
   const tools = Object.entries(toolDefinitions).map(([name, config]) => ({
     type: "function",
     name,
     description: config.description,
     parameters: {
       type: 'object',
       properties: config.parameters
     }
   }));
   ```

2. **Implementación de funciones**:
   ```typescript
   // hooks/use-tools.ts
   export const useToolsFunctions = () => {
     const timeFunction = () => {
       const now = new Date();
       return {
         success: true,
         time: now.toLocaleTimeString(),
         timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
         message: `Current time is ${now.toLocaleTimeString()}...`
       };
     };
     
     // Más implementaciones de funciones...
     
     return {
       timeFunction,
       backgroundFunction,
       partyFunction,
       // Más funciones...
     };
   };
   ```

3. **Registro de funciones**:
   ```typescript
   // app/page.tsx
   useEffect(() => {
     Object.entries(toolsFunctions).forEach(([name, func]) => {
       const functionNames: Record<string, string> = {
         timeFunction: 'getCurrentTime',
         backgroundFunction: 'changeBackgroundColor',
         // Más mapeos...
       };
       
       registerFunction(functionNames[name], func);
     });
   }, [registerFunction, toolsFunctions]);
   ```

4. **Manejo de llamadas a funciones**:
   ```typescript
   // hooks/use-webrtc.ts
   case "response.function_call_arguments.done": {
     const fn = functionRegistry.current[msg.name];
     if (fn) {
       const args = JSON.parse(msg.arguments);
       const result = await fn(args);
       
       // Responder con resultado de la función
       const response = {
         type: "conversation.item.create",
         item: {
           type: "function_call_output",
           call_id: msg.call_id,
           output: JSON.stringify(result),
         },
       };
       dataChannelRef.current?.send(JSON.stringify(response));
       
       // Solicitar respuesta del asistente
       const responseCreate = { type: "response.create" };
       dataChannelRef.current?.send(JSON.stringify(responseCreate));
     }
     break;
   }
   ```

## Adaptación a otros proyectos

Para adaptar esta implementación a otros proyectos:

1. **Configuración del servidor**:
   - Crea un endpoint para generar tokens efímeros (similar a `/api/session/route.ts`)
   - Asegúrate de proteger tu API key de OpenAI como variable de entorno

2. **Implementación del hook WebRTC**:
   - Copia y adapta `hooks/use-webrtc.ts` a tu proyecto
   - Ajusta la gestión de estado según tu framework (React, Vue, etc.)

3. **Definición de herramientas personalizadas**:
   - Modifica `lib/tools.ts` para definir tus propias herramientas
   - Implementa las funciones correspondientes en un hook similar a `hooks/use-tools.ts`

4. **Integración en la interfaz de usuario**:
   - Crea componentes para controlar la sesión (iniciar/detener)
   - Implementa visualización de transcripciones y respuestas
   - Añade controles para entrada de texto si es necesario

5. **Personalización del modelo y voz**:
   - Ajusta los parámetros en la solicitud de token efímero y en la conexión WebRTC

## Consideraciones de seguridad

1. **Protección de la API key**:
   - Nunca expongas tu API key de OpenAI en el cliente
   - Utiliza siempre el sistema de tokens efímeros a través de tu servidor

2. **Validación de entrada**:
   - Valida cualquier entrada del usuario antes de procesarla
   - Limita las capacidades de las herramientas para evitar acciones no deseadas

3. **Control de acceso**:
   - Implementa autenticación de usuarios si es necesario
   - Considera límites de uso para evitar costos excesivos

4. **Gestión de errores**:
   - Implementa manejo robusto de errores para todas las operaciones de red
   - Proporciona feedback claro al usuario cuando algo falla

5. **Privacidad**:
   - Informa a los usuarios sobre la captura y transmisión de audio
   - Solicita permisos explícitos para acceder al micrófono

---

Este tutorial proporciona una guía detallada para implementar la API Realtime de OpenAI en aplicaciones web. La implementación permite crear experiencias de conversación en tiempo real con capacidades de voz y texto, así como la posibilidad de que el asistente realice acciones en el navegador del usuario a través de herramientas personalizadas.

Para más información, consulta la [documentación oficial de OpenAI Realtime API](https://platform.openai.com/docs/api-reference/realtime).
