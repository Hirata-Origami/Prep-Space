import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Use NEXT_PUBLIC_SITE_URL for production (Vercel), fallback to request origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    const { error, data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Check if onboarding is needed
      const { data: profile } = await supabase
        .from('users')
        .select('target_role, target_company, gemini_api_key')
        .eq('supabase_uid', user.id)
        .maybeSingle();

      const isIncomplete = !profile || !profile.target_role || !profile.target_company || !profile.gemini_api_key;

      if (isIncomplete) {
        return NextResponse.redirect(`${siteUrl}/onboarding`);
      }
      return NextResponse.redirect(`${siteUrl}/dashboard`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/auth/login?error=oauth_error`);
}
