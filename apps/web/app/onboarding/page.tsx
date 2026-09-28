'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export default function OnboardingPage() {
  const { user, mutate, isLoading } = useUser();
  const router = useRouter();

  const [formData, setFormData] = useState({
    target_role: '',
    target_company: '',
    gemini_api_key: ''
  });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If they already have all mandatory fields, redirect them
    if (!isLoading && user && user.target_role && user.target_company && user.has_gemini_key) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.target_role || !formData.target_company || !formData.gemini_api_key) {
      toast.error('All fields are required to secure your PrepSpace experience.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: formData.target_role,
          target_company: formData.target_company,
          gemini_api_key: formData.gemini_api_key,
        }),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      await mutate();
      toast.success('Profile created successfully! Welcome to PrepSpace.');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <AuthShell
      showBack={false}
      title={step === 1 ? 'What are you preparing for?' : 'Connect your Gemini key'}
      description={
        step === 1
          ? 'PrepSpace tunes questions and roadmaps to your target.'
          : 'Live voice interviews run on your own key. It is stored securely and never shared.'
      }
      footer={
        <div className="flex items-center gap-2" role="img" aria-label={`Step ${step} of 2`}>
          {[1, 2].map(s => (
            <span key={s} className={cn('h-1 w-8 rounded-full transition-colors', step >= s ? 'bg-signal' : 'bg-raised')} />
          ))}
          <span className="ml-1">Step {step} of 2</span>
        </div>
      }
    >
      {step === 1 ? (
        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault();
            if (formData.target_role && formData.target_company) setStep(2);
          }}
        >
          <Field label="Target role">
            {a11y => (
              <Input
                {...a11y}
                value={formData.target_role}
                onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))}
                placeholder="Senior Software Engineer"
                autoFocus
              />
            )}
          </Field>
          <Field label="Target company">
            {a11y => (
              <Input
                {...a11y}
                value={formData.target_company}
                onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))}
                placeholder="Google, Stripe, Meta"
              />
            )}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={!formData.target_role || !formData.target_company}>
            Continue <ChevronRight size={16} aria-hidden />
          </Button>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleSave}>
          <Field
            label="Gemini API key"
            hint="Create a free key in Google AI Studio (aistudio.google.com/app/apikey), then paste it here."
          >
            {a11y => (
              <Input
                {...a11y}
                type="password"
                autoComplete="off"
                value={formData.gemini_api_key}
                onChange={e => setFormData(p => ({ ...p, gemini_api_key: e.target.value }))}
                placeholder="Paste your key"
                autoFocus
              />
            )}
          </Field>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-signal hover:underline"
          >
            Open Google AI Studio
          </a>
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" size="lg" className="flex-[2]" disabled={!formData.gemini_api_key} loading={saving}>
              {saving ? 'Saving…' : 'Finish setup'}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
