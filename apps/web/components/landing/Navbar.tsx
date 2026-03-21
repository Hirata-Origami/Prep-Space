'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(8, 12, 20, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
        maxWidth: '100%',
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 900, color: '#080C14',
        }}>P</div>
        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Prep<span style={{ color: 'var(--accent-primary)' }}>Space</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        {['Features', 'Mock Interviews', 'Pricing', 'Blog'].map((item) => (
          <a key={item} href="#" style={{
            fontSize: '14px', fontWeight: 500,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >{item}</a>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/auth/login" className="btn-secondary" style={{ padding: '8px 20px', fontSize: '14px' }}>
          Sign in
        </Link>
        <Link href="/auth/signup" className="btn-primary" style={{ padding: '8px 20px', fontSize: '14px' }}>
          Start Free
        </Link>
      </div>
    </motion.nav>
  );
}
