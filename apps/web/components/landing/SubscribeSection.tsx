'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';

export function SubscribeSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
    }
  };

  return (
    <section id="newsletter" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-6 rounded-hero border border-line bg-panel p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">Get one interview insight a week</h2>
            <p className="mt-2 text-[15px] text-fg-2">DSA breakdowns, real system design questions, and prep tips. No filler.</p>
          </div>
          {subscribed ? (
            <div role="status" className="flex items-center gap-2 rounded-control border border-good/30 bg-good/10 px-4 py-3 text-sm font-medium text-good">
              <CheckCircle2 size={17} aria-hidden /> You are on the list. Watch your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="min-w-[240px]"
              />
              <Button type="submit" size="md">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
