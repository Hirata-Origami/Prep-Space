'use client';

import React, { useEffect, useRef } from 'react';

interface AudioOrbProps {
  status: 'listening' | 'speaking' | 'thinking';
  waveData?: number[];
  className?: string;
}

/** Reads a theme token like "139, 153, 255" so canvas drawing follows light and dark mode. */
function rgbToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Alex's voice as a ring of bars. The ring stays calm while listening,
 * pulses with the model's audio while speaking (amber, the on-air colour),
 * and sweeps slowly while thinking.
 */
export function AudioOrb({ status, waveData = [], className }: AudioOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const waveRef = useRef<number[]>(waveData);

  // Keep the latest audio levels without restarting the animation loop on every frame
  useEffect(() => {
    waveRef.current = waveData;
  }, [waveData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.offsetWidth || 300;
      height = canvas.offsetHeight || 300;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const BARS = 72;

    const render = () => {
      const signal = rgbToken('--accent-primary-rgb', '139, 153, 255');
      const live = rgbToken('--accent-amber-rgb', '255, 176, 32');
      const muted = rgbToken('--text-muted', '#8089a6');
      const raised = rgbToken('--bg-elevated', '#161d33');

      const speaking = status === 'speaking';
      const thinking = status === 'thinking';
      timeRef.current += reduceMotion ? 0 : speaking ? 0.05 : thinking ? 0.04 : 0.018;
      const t = timeRef.current;

      const wave = waveRef.current;
      const energy = wave.length ? Math.min(1.4, wave.reduce((a, v) => a + v, 0) / (wave.length * 18)) : 0;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const size = Math.min(width, height);
      const inner = size * 0.24;
      const maxBar = size * 0.2;
      const accent = speaking ? live : signal;

      // core
      ctx.beginPath();
      ctx.arc(cx, cy, inner * 0.92, 0, Math.PI * 2);
      ctx.fillStyle = raised;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${accent}, ${speaking ? 0.9 : 0.5})`;
      ctx.stroke();

      // soft pulse inside the core
      const pulse = speaking ? 0.35 + energy * 0.35 : 0.18 + Math.sin(t * 1.4) * 0.06;
      ctx.beginPath();
      ctx.arc(cx, cy, inner * (0.28 + pulse * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accent}, ${0.35 + pulse * 0.5})`;
      ctx.fill();

      // bars
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, size * 0.012);
      for (let i = 0; i < BARS; i++) {
        const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        let h: number;
        if (speaking) {
          const raw = wave.length ? wave[i % wave.length] : 4;
          h = 0.08 + Math.min(1, raw / 60) * (0.55 + energy * 0.4) + Math.sin(angle * 5 + t * 3) * 0.05;
        } else if (thinking) {
          const sweep = (Math.sin(angle - t * 2) + 1) / 2;
          h = 0.08 + sweep * 0.28;
        } else {
          h = 0.07 + (Math.sin(angle * 3 + t) + 1) * 0.03;
        }
        h = Math.max(0.06, h);
        const r0 = inner * 1.08;
        const r1 = r0 + h * maxBar;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
        ctx.lineTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
        ctx.strokeStyle = speaking || thinking ? `rgba(${accent}, ${0.45 + h * 0.6})` : muted;
        ctx.globalAlpha = speaking || thinking ? 1 : 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [status]);

  return (
    <div
      role="img"
      aria-label={`Alex is ${status}`}
      style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={className}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', maxHeight: 280 }} />
    </div>
  );
}
