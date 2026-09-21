'use client';

import Image from 'next/image';

const FOOTER_LINKS = {
  Product: ['Roadmap Engine', 'AI Interviews', 'Mock Companies', 'Resume Builder', 'Groups'],
  Resources: ['Interview Questions', 'Company Guides', 'Tech Stack Roadmaps', 'System Design Cheatsheet'],
  Company: ['About', 'Blog', 'Careers', 'Status', 'Changelog'],
  Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'],
};

export function FooterSection() {
  return (
    <footer style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '56px 16px 36px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top grid: 1 col on mobile, 2 col on tablet, 5 col on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Image src="/prepspace-logo.png" alt="PrepSpace" width={32} height={32} style={{ borderRadius: '8px' }} />
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>
              Train like it&apos;s real. Land what you deserve. The AI-native interview platform built for engineers, by engineers.
            </p>
            {/* Social links */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {['𝕏', 'in', 'gh'].map((icon, i) => (
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
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>{cat}</div>
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

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} PrepSpace. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-mint" style={{ fontSize: '11px' }}>Free for Beta</span>
            <span className="badge badge-muted" style={{ fontSize: '11px' }}>GDPR Compliant</span>
            <span className="badge badge-muted" style={{ fontSize: '11px' }}>SOC2 (In Progress)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
