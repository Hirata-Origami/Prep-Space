'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const TESTIMONIALS = [
  { quote: "I failed my Google interview twice. After 8 weeks on PrepSpace, I passed all 5 rounds and got the offer. The timestamped audio replay changed everything — I could hear exactly where I went wrong.", name: 'Arjun P.', role: 'Senior SWE · Google', improvement: '+34 pts in 8 weeks', tag: 'badge-mint' },
  { quote: "As a bootcamp instructor, I needed a way to track 80 students at once. PrepSpace's Edu Bundle gives me cohort heatmaps and I can spot who's falling behind before it's too late.", name: 'Sarah M.', role: 'Lead Instructor · General Assembly', improvement: '94% placement rate', tag: 'badge-violet' },
  { quote: "Traditional mock interviews felt fake. PrepSpace's AI Voice interview felt like a real phone screen — I could even interrupt the AI when I remembered something. That confidence carried into my actual interviews.", name: 'Marcus T.', role: 'ML Engineer · Anthropic', improvement: '3 offers in 3 weeks', tag: 'badge-mint' },
  { quote: "The Smart Hire pipeline cut our screening time from 3 weeks to 4 days. We review 50 candidates with full AI evaluation instead of 10 with manual phone screens. The quality went up too.", name: 'Priya K.', role: 'VP Engineering · Series B Startup', improvement: '75% faster screening', tag: 'badge-amber' },
  { quote: "PrepSpace told me I overexplain. Specifically: my answers average 340 words when the ideal is 180. I didn't believe it until I heard my own recordings. That data point alone was worth it.", name: 'James L.', role: 'Product Manager · Stripe', improvement: 'Score: 71 → 91', tag: 'badge-violet' },
  { quote: "I used every platform — Pramp, Interviewing.io, Final Round AI. PrepSpace is the only one that felt like actual preparation instead of performance. The skill graph knew me better than I knew myself.", name: 'Amara O.', role: 'Staff Engineer · Meta', improvement: 'TC: $180K → $380K', tag: 'badge-mint' },
];

export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section ref={ref} style={{ padding: '100px 0', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: '56px', padding: '0 24px' }}>
        <span className="badge badge-muted" style={{ marginBottom: '20px', display: 'inline-flex' }}>Success Stories</span>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          Real results from real candidates
        </h2>
      </motion.div>

      {/* Marquee row 1 */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="marquee-track">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} style={{ width: '380px', flexShrink: 0, marginRight: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '20px' }}>&quot;{t.quote}&quot;</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
                <span className={`badge ${t.tag}`} style={{ fontSize: '11px' }}>{t.improvement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee row 2 — reversed */}
      <div style={{ position: 'relative' }}>
        <div className="marquee-track" style={{ animationDirection: 'reverse', animationDuration: '35s' }}>
          {[...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3), ...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
            <div key={i} style={{ width: '360px', flexShrink: 0, marginRight: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>&quot;{t.quote}&quot;</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.role}</div>
                </div>
                <span className={`badge ${t.tag}`} style={{ fontSize: '11px' }}>{t.improvement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
