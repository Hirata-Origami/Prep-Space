'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const PLANS = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'Get started with AI-powered interview prep',
    cta: 'Get Started',
    ctaStyle: 'secondary',
    features: ['3 AI interview sessions/month', '1 personalized roadmap', 'Basic performance report', 'Community forums', 'Text-mode interviews'],
    badge: null,
  },
  {
    name: 'Pro',
    price: { monthly: 19, annual: 15 },
    description: 'Serious prep for serious candidates',
    cta: 'Start Pro — 14-day free trial',
    ctaStyle: 'primary',
    features: ['Unlimited AI interviews', 'All 10 modules + Mock Companies', 'Full audio reports with waveform', 'AI Live voice interviews', 'Resume builder + ATS scoring', 'Groups + leaderboards', 'Priority AI processing'],
    badge: '🔥 Most Popular',
  },
  {
    name: 'Elite',
    price: { monthly: 49, annual: 39 },
    description: 'Maximum firepower for your job search',
    cta: 'Start Elite',
    ctaStyle: 'secondary',
    features: ['Everything in Pro', 'Peer practice network matching', 'Company-specific mock rounds', 'AI Copilot real-time coaching', 'Cover letter generator', 'Resume variant system (unlimited)', 'Monthly 1:1 AI prep strategy session'],
    badge: null,
  },
  {
    name: 'Company',
    price: { monthly: 299, annual: 240 },
    description: 'AI-powered hiring for your team',
    cta: 'Book a Demo',
    ctaStyle: 'secondary',
    features: ['Smart Hire pipeline builder', '50 candidate slots/month', 'Full recruiter Kanban dashboard', 'Bias mitigation tools', 'ATS webhooks (Greenhouse, Lever)', 'Custom branding', 'Admin analytics'],
    badge: '🏢 B2B',
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} style={{ padding: '100px 24px', background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 100%)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <span className="badge badge-mint" style={{ marginBottom: '20px', display: 'inline-flex' }}>Pricing</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '24px' }}>
            Free to start. <span className="text-gradient-mint">Built to scale.</span>
          </h2>

          {/* Annual toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'var(--bg-elevated)', borderRadius: '100px', padding: '6px 12px' }}>
            <button onClick={() => setIsAnnual(false)} style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', background: !isAnnual ? 'var(--accent-primary)' : 'transparent', color: !isAnnual ? '#080C14' : 'var(--text-muted)', transition: 'all 0.2s' }}>Monthly</button>
            <button onClick={() => setIsAnnual(true)} style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', background: isAnnual ? 'var(--accent-primary)' : 'transparent', color: isAnnual ? '#080C14' : 'var(--text-muted)', transition: 'all 0.2s' }}>
              Annual <span style={{ color: isAnnual ? '#080C14' : 'var(--accent-amber)', fontSize: '11px', fontWeight: 700 }}>-20%</span>
            </button>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={plan.name === 'Pro' ? 'card glow-mint' : 'card'}
              style={{ display: 'flex', flexDirection: 'column', position: 'relative', borderColor: plan.name === 'Pro' ? 'rgba(77,255,160,0.35)' : undefined }}
            >
              {plan.badge && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-primary)', color: '#080C14', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{plan.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{plan.description}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    ${isAnnual ? plan.price.annual : plan.price.monthly}
                  </span>
                  {plan.price.monthly > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/mo</span>}
                </div>
                {isAnnual && plan.price.monthly > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <s>${plan.price.monthly}/mo</s> · billed annually
                  </div>
                )}
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-primary)', marginTop: '1px', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a href="/auth/signup" className={plan.ctaStyle === 'primary' ? 'btn-primary' : 'btn-secondary'} style={{ textAlign: 'center', justifyContent: 'center', width: '100%', fontSize: '14px', padding: '11px 20px' }}>
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
          style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}
        >
          Education institutions? <a href="/edu" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Contact us for a custom Edu Bundle →</a>
        </motion.p>
      </div>
    </section>
  );
}
