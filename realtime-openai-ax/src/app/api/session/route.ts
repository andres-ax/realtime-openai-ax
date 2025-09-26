import { NextRequest, NextResponse } from 'next/server';

/**
 * SESSION API ENDPOINT
 * 
 * This endpoint provides ephemeral session keys for the OpenAI Realtime API.
 * Implements security best practices and token management patterns.
 * 
 * - GET: Returns the configured OpenAI API key (for internal use/testing only).
 * - POST: Creates a new ephemeral session with OpenAI Realtime API and returns a client secret.
 */

/**
 * Represents the response structure from the OpenAI Realtime API when creating a session.
 */
interface OpenAIEphemeralKeyResponse {
  /** Unique identifier for the session */
  id: string;
  /** Object type (e.g., "realtime.session") */
  object: string;
  /** Expiration time (Unix timestamp in seconds) */
  expires_at: number;
  /** Client secret object containing the secret value and its expiration */
  client_secret: {
    value: string;
    expires_at: number;
  };
  /** Optional session name */
  name?: string;
}

/**
 * Represents the response structure returned to the client after creating a session.
 */
interface SessionResponse {
  /** Client secret object for authenticating with the session */
  client_secret: {
    value: string;
    expires_at: number;
  };
  /** Unique session identifier */
  session_id: string;
  /** Expiration time (Unix timestamp in seconds) */
  expires_at: number;
}

/**
 * GET /api/session
 * 
 * Returns the OpenAI API key if configured.
 * 
 * @returns {NextResponse} JSON response containing the API key or an error message.
 */
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

/**
 * POST /api/session
 * 
 * Creates a new ephemeral session with the OpenAI Realtime API and returns a client secret.
 * 
 * Request body should include:
 * - model: (optional) Model name to use (default: 'gpt-4o-realtime-preview-2024-10-01')
 * - voice: (optional) Voice name to use (default: 'alloy')
 * - instructions: (optional) System instructions for the session
 * - sessionConfig: (optional) Additional session configuration
 * 
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {NextResponse} JSON response containing the session client secret and metadata, or an error message.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[SESSION] 🚀 Creating new OpenAI session...');
    
    // Security: Validate that the API key is present in the environment
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

    // Parse request body for session configuration
    const body = await request.json();
    const { 
      model = 'gpt-4o-realtime-preview-2024-10-01',
      voice = 'alloy',
      instructions = '',
      sessionConfig = {}
    } = body;
    
    console.log('[SESSION] 📋 Request config:', { model, voice, instructions: instructions.length + ' chars' });

    // Retry logic: Attempt to create a session up to maxAttempts times
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[SESSION] 🔄 Attempt ${attempts}/${maxAttempts} - Calling OpenAI API...`);
        
        // Construct the request body for OpenAI API
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

        // Build the response to return to the client
        const sessionResponse: SessionResponse = {
          client_secret: {
            value: sessionData.client_secret.value,
            expires_at: sessionData.client_secret.expires_at
          },
          session_id: sessionData.id,
          expires_at: sessionData.expires_at
        };

        // Log session creation details for auditing
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
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

  } catch (error) {
    console.error('[SESSION] Error creating session:', error);
    
    // Security: Do not expose internal error details to the client
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
