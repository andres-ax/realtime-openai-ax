import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔑 SESSION API ENDPOINT
 * 
 * Crea ephemeral keys para OpenAI Realtime API
 * Implementa Security Pattern + Token Management Pattern
 */

interface OpenAIEphemeralKeyResponse {
  id: string;
  object: string;
  expires_at: number;
  client_secret: {
    value: string;
    expires_at: number;
  };
  name?: string;
}

interface SessionResponse {
  client_secret: {
    value: string;
    expires_at: number;
  };
  session_id: string;
  expires_at: number;
}

export async function GET() {
  try {
    console.log('[SESSION] 🔑 API key request received');
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[SESSION] ❌ OpenAI API key not found in environment');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('[SESSION] ✅ API key found, length:', apiKey.length);
    console.log('[SESSION] 🔑 API key prefix:', apiKey.substring(0, 10) + '...');

    return NextResponse.json({
      apiKey: apiKey,
      success: true
    });

  } catch (error) {
    console.error('[SESSION] ❌ Error getting API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[SESSION] 🚀 Creating new OpenAI session...');
    
    // 🛡️ Security Pattern: Validar API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[SESSION] ❌ OpenAI API key not found in environment');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    
    console.log('[SESSION] ✅ API key found, length:', apiKey.length);
    console.log('[SESSION] 🔑 API key prefix:', apiKey.substring(0, 10) + '...');

    // 📊 Extraer configuración del request
    const body = await request.json();
    const { 
      model = 'gpt-4o-realtime-preview-2024-10-01',
      voice = 'alloy',
      instructions = '',
      sessionConfig = {}
    } = body;
    
    console.log('[SESSION] 📋 Request config:', { model, voice, instructions: instructions.length + ' chars' });

    // 🔄 Retry Pattern: Crear ephemeral key con reintentos
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[SESSION] 🔄 Attempt ${attempts}/${maxAttempts} - Calling OpenAI API...`);
        
        // 🌐 Llamada a OpenAI API
        const requestBody = {
          model,
          voice,
          ...(instructions && { instructions }),
          ...sessionConfig
        };
        
        console.log('[SESSION] 📤 Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[SESSION] 📥 OpenAI response status:', response.status);
        console.log('[SESSION] 📥 OpenAI response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.text();
          console.error('[SESSION] ❌ OpenAI API error response:', errorData);
          throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const sessionData: OpenAIEphemeralKeyResponse = await response.json();
        console.log('[SESSION] 📋 OpenAI session data:', sessionData);

        // 🎯 Result Pattern: Respuesta exitosa
        const sessionResponse: SessionResponse = {
          client_secret: {
            value: sessionData.client_secret.value,
            expires_at: sessionData.client_secret.expires_at
          },
          session_id: sessionData.id,
          expires_at: sessionData.expires_at
        };

        // 📊 Audit Trail Pattern: Log de sesión creada
        console.log(`[SESSION] ✅ Created session: ${sessionData.id}`);
        console.log(`[SESSION] 🔑 Client secret: ${sessionData.client_secret.value.substring(0, 20)}...`);
        console.log(`[SESSION] ⏰ Expires: ${new Date(sessionData.expires_at * 1000).toISOString()}`);
        console.log(`[SESSION] 🎉 Session ready for WebRTC connection`);

        return NextResponse.json(sessionResponse);

      } catch (error) {
        console.error(`[SESSION] ❌ Attempt ${attempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // 🔄 Retry Pattern: Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

  } catch (error) {
    console.error('[SESSION] Error creating session:', error);
    
    // 🛡️ Security Pattern: No exponer detalles internos
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

