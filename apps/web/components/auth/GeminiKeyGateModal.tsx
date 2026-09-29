'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, KeyRound, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';

interface GeminiKeyGateModalProps {
  isOpen: boolean;
  onKeySaved: () => void;
}

export function GeminiKeyGateModal({ isOpen, onKeySaved }: GeminiKeyGateModalProps) {
  const [key, setKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = key.trim();
    if (!cleanKey) {
      setError('Please paste your Gemini API key');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Step 1: Validate against Gemini API
      const valRes = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: cleanKey }),
      });
      const valJson = await valRes.json();
      if (!valRes.ok || !valJson.valid) {
        throw new Error(valJson.error || 'The Gemini API key could not be verified. Please check Google AI Studio.');
      }

      // Step 2: Save to user profile
      const saveRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: cleanKey }),
      });

      if (!saveRes.ok) {
        const saveJson = await saveRes.json().catch(() => ({}));
        throw new Error(saveJson.error || 'Failed to save key to your profile');
      }

      toast.success('Gemini key verified and activated! Welcome to PrepSpace.');
      onKeySaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gemini-gate-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <Card className="w-full max-w-md border-line-strong bg-panel p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-signal/15 text-signal">
            <KeyRound size={22} aria-hidden />
          </div>
          <div>
            <h2 id="gemini-gate-title" className="text-base font-semibold text-fg">
              Gemini API Key Required
            </h2>
            <p className="text-xs text-fg-3">
              Connect your Google Gemini key to unlock all pages
            </p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-fg-2">
          PrepSpace powers live voice interviews, AI judging, and workspace reasoning on your personal Gemini key. We use automatic cascading (3.8 Flash, 3.7 Flash, 3.5 Flash Lite) with up to 1,500 requests per day.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field
            label="Gemini API Key"
            hint="Starts with AIza..."
            error={error || undefined}
          >
            {a11y => (
              <Input
                {...a11y}
                type="password"
                autoComplete="off"
                placeholder="AIzaSy..."
                value={key}
                onChange={e => {
                  setKey(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
            )}
          </Field>

          <div className="flex items-center justify-between text-xs">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-signal hover:underline"
            >
              Get free key in Google AI Studio
              <ExternalLink size={12} aria-hidden />
            </a>
            <span className="text-fg-3">Free Tier Available</span>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={validating}
              disabled={!key.trim()}
            >
              <Sparkles size={15} aria-hidden />
              {validating ? 'Verifying with Google…' : 'Verify & Unlock PrepSpace'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
