'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthShell, GoogleIcon } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  const handleGoogle = async () => {
    setLoading(true);
    // Always use the current origin so local dev stays on localhost:3000
    // and production stays on the prod domain — never hardcode SITE_URL here.
    const redirectOrigin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${redirectOrigin}/auth/callback` }
    });
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up your prep where you left it."
      footer={
        <>
          New to PrepSpace?{' '}
          <Link href="/auth/signup" className="font-medium text-signal hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle} loading={loading}>
        {!loading && <GoogleIcon />}
        {loading ? 'Signing in…' : 'Continue with Google'}
      </Button>
      <p className="mt-4 text-xs text-fg-3">By continuing, you confirm you have read our privacy policy.</p>
    </AuthShell>
  );
}
