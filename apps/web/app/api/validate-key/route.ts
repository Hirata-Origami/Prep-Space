import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let key = typeof body?.key === 'string' ? body.key.trim() : '';

    // If key contains bullets (masked) or is empty, try to test the user's saved key from DB
    const isMaskedOrEmpty = !key || key.includes('•') || /[^\x00-\x7F]/.test(key);

    if (isMaskedOrEmpty) {
      // Check if user is authenticated and has a saved key in database
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('gemini_api_key')
          .eq('supabase_uid', user.id)
          .single();

        const savedKey = profile?.gemini_api_key?.trim();
        if (savedKey && !savedKey.includes('•') && /^[\x00-\x7F]+$/.test(savedKey)) {
          key = savedKey;
        }
      }
    }

    // Strictly validate that key is ASCII and does not contain bullets or non-byte chars
    if (!key || key.length < 10 || key.includes('•') || /[^\x00-\x7F]/.test(key)) {
      return NextResponse.json({
        valid: false,
        error: 'Please enter a valid, unmasked Gemini API key (starts with AIza...)'
      }, { status: 400 });
    }

    // Verify the key directly against Google's API without consuming generation quota
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Validation failed with status ${res.status}`;
      return NextResponse.json({ valid: false, error: errorMsg }, { status: 400 });
    }

    if (Array.isArray(data?.models) && data.models.length > 0) {
      return NextResponse.json({
        valid: true,
        message: 'Gemini API key is valid and active!',
        modelCount: data.models.length,
      });
    }

    return NextResponse.json({ valid: false, error: 'API key validated but returned no available models' }, { status: 400 });
  } catch (err: unknown) {
    console.error('API key validation error:', err);
    const msg = err instanceof Error ? err.message : 'Invalid key';
    return NextResponse.json({ valid: false, error: msg }, { status: 400 });
  }
}
