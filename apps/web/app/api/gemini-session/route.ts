import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { decryptKey } from '@/lib/secret';

export const dynamic = 'force-dynamic';

/**
 * Returns a short-lived ephemeral token for client-side Gemini Live API usage.
 * ONLY uses the user's own Gemini API key stored in their profile.
 * No environment-level fallback key is used — each user brings their own.
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

  const apiKey = decryptKey(profile?.gemini_api_key)?.trim();

  if (!apiKey || apiKey.includes('•') || /[^\x00-\x7F]/.test(apiKey) || apiKey.length < 10) {
    return NextResponse.json(
      { error: 'No valid Gemini API key configured. Please add your key in Settings.' },
      { status: 400 }
    );
  }

  // Try to get an ephemeral token (reduces client-side key exposure)
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1beta' }
    });
    const response = await ai.authTokens.create({});
    return NextResponse.json({
      apiKey: response.name,
      token: response.name,
      key: response.name,
    });
  } catch {
    // authTokens.create may not be supported for all key tiers.
    // Fall back to returning the user's own key directly for the client to use.
    return NextResponse.json({
      apiKey,
      token: apiKey,
      key: apiKey,
    });
  }
}
