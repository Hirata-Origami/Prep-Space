'use client';



const FOOTER_LINKS = {
  Product: ['Roadmap Engine', 'AI Interviews', 'Mock Companies', 'Resume Builder', 'Peer Practice', 'Groups'],
  'For Teams': ['Smart Hire', 'Edu Bundle', 'Enterprise', 'API Access', 'Integrations'],
  Company: ['About', 'Blog', 'Careers', 'Press Kit', 'Status', 'Changelog'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'Security'],
};

export function FooterSection() {
  return (
    <footer style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '64px 24px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px repeat(4, 1fr)', gap: '40px', marginBottom: '56px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: '#080C14' }}>P</div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
              Train like it&apos;s real. Land what you deserve. The AI-native interview platform built for engineers, by engineers.
            </p>
            {/* Social links */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {['𝕏', 'in', 'gh', ''].map((icon, i) => (
                <a key={i} href="#" style={{ width: '34px', height: '34px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([cat, links]) => (
            <div key={cat}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {links.map(l => (
                  <a key={l} href="#" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Get interview tips every week</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Curated DSA problems, system design breakdowns, and career tips.</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="email" placeholder="you@email.com" className="input" style={{ width: '240px', padding: '10px 14px', fontSize: '14px' }} />
            <button className="btn-primary" style={{ padding: '10px 20px', whiteSpace: 'nowrap', fontSize: '14px' }}>Subscribe</button>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            © 2026 PrepSpace. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span className="badge badge-mint" style={{ fontSize: '11px' }}>Free for Beta</span>
            <span className="badge badge-muted" style={{ fontSize: '11px' }}>GDPR Compliant</span>
            <span className="badge badge-muted" style={{ fontSize: '11px' }}>SOC2 (In Progress)</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Powered by Gemini 2.5 Flash · Built on Supabase · Hosted on Vercel
          </div>
        </div>
      </div>
    </footer>
  );
}
