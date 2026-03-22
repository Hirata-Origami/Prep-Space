import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

/**
 * Returns a short-lived ephemeral token for client-side use in the Gemini Live API.
 * The token is generated using the user's configured API key.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  const apiKey = profile?.gemini_api_key;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'No Gemini API key configured. Please add your key in Settings.' },
      { status: 400 }
    );
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });
    const response = await ai.authTokens.create({});
    return NextResponse.json({ apiKey: response.name });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate ephemeral token' },
      { status: 500 }
    );
  }
}
