'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#demo' },
  { label: 'Reviews', href: '#reviews' },
];

type Theme = 'light' | 'dark';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);

    // Init theme from localStorage
    try {
      const saved = localStorage.getItem('prepspace_theme');
      const validTheme: Theme = saved === 'dark' ? 'dark' : 'light';
      setTheme(validTheme);
      document.documentElement.dataset.theme = validTheme;
    } catch { }

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('prepspace_theme', next);
      document.documentElement.dataset.theme = next;
    } catch { }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <>
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
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: scrolled || mobileMenuOpen
            ? isDark
              ? 'rgba(8, 12, 20, 0.95)'
              : 'rgba(255, 255, 255, 0.97)'
            : 'transparent',
          backdropFilter: scrolled || mobileMenuOpen ? 'blur(20px)' : 'none',
          borderBottom: scrolled || mobileMenuOpen ? '1px solid var(--border)' : 'none',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <Image src="/prepspace-logo.png" alt="PrepSpace" width={32} height={32} style={{ borderRadius: '8px' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Prep<span style={{ color: 'var(--accent-primary)' }}>Space</span>
          </span>
        </Link>

        {/* Nav links — Desktop only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right actions — Desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="hidden md:flex">
          {/* Theme Toggle - Sun / Moon */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          <Link href="/auth/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none', padding: '7px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', transition: 'all .15s' }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            Log In
          </Link>
          <Link href="/auth/signup" className="btn-primary" style={{ padding: '7px 18px', fontSize: '13px' }}>
            Get Started
          </Link>
        </div>

        {/* Mobile Action buttons & hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="flex md:hidden">
          {/* Theme Toggle Mobile */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: `1px solid ${mobileMenuOpen ? 'var(--accent-primary)' : 'var(--border)'}`,
              background: mobileMenuOpen ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
              color: mobileMenuOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              background: isDark ? 'rgba(8, 12, 20, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--border)',
              zIndex: 99,
              padding: '20px 16px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            }}
            className="md:hidden"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {NAV_LINKS.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                href="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 600,
                  background: 'var(--bg-surface)',
                }}
              >
                Log In
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
