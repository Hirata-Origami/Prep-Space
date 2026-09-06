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
    <section style={{ padding: '40px 24px 60px', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '36px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '28px',
          flexWrap: 'wrap',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stay Ahead</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Get interview insights every week</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Curated DSA breakdowns, real company system design interview questions, and prep tips.</div>
          </div>
          {subscribed ? (
            <div style={{ padding: '12px 24px', background: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)', borderRadius: '10px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '14px' }}>
              ✓ You&apos;re on the list! Keep an eye on your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input"
                style={{ width: '260px', padding: '12px 16px', fontSize: '14px' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap', fontSize: '14px' }}>
                Subscribe Free
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
