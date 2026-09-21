'use client';

import { useState } from 'react';

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
    <section style={{ padding: '32px 16px 48px', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          }}
          className="p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div style={{ maxWidth: '540px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stay Ahead</span>
            </div>
            <div style={{ fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Get interview insights every week</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Curated DSA breakdowns, real company system design interview questions, and prep tips.</div>
          </div>
          {subscribed ? (
            <div style={{ padding: '12px 24px', background: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)', borderRadius: '10px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '14px' }}>
              ✓ You&apos;re on the list! Keep an eye on your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input"
                style={{ width: '100%', minWidth: '220px', padding: '12px 16px', fontSize: '14px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px', justifyContent: 'center', whiteSpace: 'nowrap', fontSize: '14px' }}>
                Subscribe Free
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
