'use client';

import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthShell, GoogleIcon } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const supabase = getSupabaseClient();

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  return (
    <AuthShell
      title="Create your account"
      description="Free during beta. No credit card required."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-signal hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogle}>
        <GoogleIcon />
        Continue with Google
      </Button>
      <p className="mt-4 text-xs text-fg-3">By continuing, you agree to the terms of service and privacy policy.</p>
    </AuthShell>
  );
}
