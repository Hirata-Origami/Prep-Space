'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const ROLES = ['Frontend Engineer', 'System Architect', 'ML Engineer', 'Product Manager', 'Backend Engineer', 'Cloud Architect'];

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const roleIndexRef = useRef(0);
  const roleTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const N = 120;
    interface Particle { x: number; y: number; vx: number; vy: number; r: number; }
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    let mouse = { x: W / 2, y: H / 2 };

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    const onMouse = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouse);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        // Repulse from mouse
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.vx += (dx / dist) * 0.08;
          p.vy += (dy / dist) * 0.08;
        }
        p.vx *= 0.995; p.vy *= 0.995;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(77,255,160,0.45)';
        ctx.fill();
      });

      // Draw connecting lines
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(77,255,160,${0.15 * (1 - d / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  // Typewriter effect for roles
  useEffect(() => {
    let charIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      const el = roleTextRef.current;
      if (!el) return;
      const role = ROLES[roleIndexRef.current];
      if (!deleting) {
        el.textContent = role.slice(0, charIdx + 1);
        charIdx++;
        if (charIdx === role.length) {
          deleting = true;
          timeout = setTimeout(type, 1800);
          return;
        }
      } else {
        el.textContent = role.slice(0, charIdx - 1);
        charIdx--;
        if (charIdx === 0) {
          deleting = false;
          roleIndexRef.current = (roleIndexRef.current + 1) % ROLES.length;
        }
      }
      timeout = setTimeout(type, deleting ? 55 : 90);
    };
    type();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <section style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Radial gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(77,255,160,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '860px', padding: '0 24px' }}>
        {/* Tag */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ marginBottom: '28px' }}
        >
          <span className="badge badge-mint" style={{ fontSize: '13px' }}>
            ✦ Powered by Gemini 2.5 Flash Live API
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '12px', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          Train like it's real.
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="shimmer-text"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '28px', letterSpacing: '-0.03em' }}
        >
          Land what you deserve.
        </motion.h1>

        {/* Typewriter */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ fontSize: '22px', color: 'var(--text-muted)', marginBottom: '16px', height: '36px' }}
        >
          The AI interview coach for the{' '}
          <span ref={roleTextRef} style={{ color: 'var(--accent-primary)', fontWeight: 600, borderRight: '2px solid var(--accent-primary)', paddingRight: '2px' }}>
            Frontend Engineer
          </span>
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 40px', lineHeight: 1.7 }}
        >
          The platform that knows exactly where you are — and trains you precisely for where you need to be.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link href="/auth/signup" className="btn-primary" style={{ fontSize: '16px', padding: '14px 32px' }}>
            Start Free — No credit card
          </Link>
          <a href="#demo" className="btn-secondary" style={{ fontSize: '16px', padding: '14px 32px' }}>
            ▶ Watch 60s Demo
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          style={{ marginTop: '60px', display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {[
            { n: '47K+', label: 'Sessions Completed' },
            { n: '92%', label: 'Score Improvements' },
            { n: '150+', label: 'Universities' },
          ].map(({ n, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{n}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: '1px', height: '32px', background: 'linear-gradient(to bottom, var(--accent-primary), transparent)' }}
          />
        </div>
      </motion.div>
    </section>
  );
}
