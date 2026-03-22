'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Link from 'next/link';

const ROLES = ['Frontend Engineer', 'ML Engineer', 'Product Manager', 'Backend Engineer', 'System Architect', 'Data Scientist'];

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, {
      duration: 2,
      ease: 'easeOut',
      onUpdate: v => setCount(Math.round(v)),
    });
    return controls.stop;
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

const STATS = [
  { value: 14000, suffix: '+', label: 'Candidates Placed' },
  { value: 94, suffix: '%', label: 'Success Rate' },
  { value: 50, suffix: 'ms', label: 'AI Response Latency' },
  { value: 200, suffix: '+', label: 'Companies Covered' },
];

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  useEffect(() => { setMounted(true); }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.15,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(77,255,160,${p.alpha})`;
        ctx.fill();
      });
      // Draw connection lines
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(77,255,160,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  // Typewriter effect
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const role = ROLES[roleIndex];
    let i = 0;
    let deleting = false;
    setDisplayText('');

    const type = () => {
      if (!deleting && i <= role.length) {
        setDisplayText(role.slice(0, i++));
        timeout = setTimeout(type, 60);
      } else if (!deleting && i > role.length) {
        deleting = true;
        timeout = setTimeout(type, 2000);
      } else if (deleting && i >= 0) {
        setDisplayText(role.slice(0, i--));
        timeout = setTimeout(type, 30);
      } else {
        setRoleIndex(prev => (prev + 1) % ROLES.length);
      }
    };
    timeout = setTimeout(type, 200);
    return () => clearTimeout(timeout);
  }, [roleIndex]);

  return (
    <section style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(77,255,160,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(123,97,255,0.06) 0%, transparent 60%), var(--bg-base)',
    }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.7 }} />

      {/* Orbital rings - purely decorative */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {[600, 800, 1000].map((size, i) => (
          <div key={size} style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: `1px solid rgba(77,255,160,${0.04 - i * 0.01})`,
            animation: `spin-slow ${20 + i * 8}s linear infinite ${i % 2 === 1 ? 'reverse' : ''}`,
          }} />
        ))}
      </div>

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(77,255,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(77,255,160,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 70%)',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(77,255,160,0.08)', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '100px', marginBottom: '32px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', animation: 'pulse-mint 2s infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '0.04em' }}>AI-Native Engineering Interviews</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(44px, 7vw, 88px)',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: '16px',
            color: 'var(--text-primary)',
          }}
        >
          Ace your interview
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #4DFFA0 0%, #00D4FF 50%, #7B61FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>as a&nbsp;</span>
          <span style={{
            background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            borderRight: mounted ? '3px solid var(--accent-primary)' : 'none',
            paddingRight: '4px',
            minWidth: '20px',
            display: 'inline-block',
          }}>
            {displayText}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 40px' }}
        >
          The first AI interview platform with <strong style={{ color: 'var(--text-secondary)' }}>real-time voice interaction</strong>, adaptive skill graphs, and evidence-backed scoring — not just flashcards.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px' }}
        >
          <Link href="/auth/signup" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            background: 'var(--accent-primary)',
            color: '#080C14',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 0 32px rgba(77,255,160,0.3)',
            transition: 'all 0.2s',
          }}>
            Start Now →
          </Link>
          <a href="#demo" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s',
          }}>
            ▶ Watch Demo
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
        >
          {STATS.map(({ value, suffix, label }) => (
            <div key={label} style={{ padding: '24px 16px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', lineHeight: 1, marginBottom: '6px' }}>
                {mounted ? <AnimatedCounter target={value} suffix={suffix} /> : `${value}${suffix}`}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
