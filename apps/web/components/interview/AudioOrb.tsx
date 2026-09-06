'use client';

import React, { useEffect, useRef } from 'react';

interface AudioOrbProps {
  status: 'listening' | 'speaking' | 'thinking';
  waveData?: number[];
  className?: string;
}

export function AudioOrb({ status, waveData = [], className }: AudioOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || 300);
    let height = (canvas.height = canvas.offsetHeight || 300);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 300;
      height = canvas.height = canvas.offsetHeight || 300;
    };

    window.addEventListener('resize', handleResize);

    // Dynamic wave points
    const pointCount = 64;
    const baseRadius = Math.min(width, height) * 0.26;

    const render = () => {
      timeRef.current += status === 'speaking' ? 0.05 : status === 'thinking' ? 0.035 : 0.02;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // Calculate audio energy from waveData
      let audioEnergy = 0;
      if (waveData && waveData.length > 0) {
        const sum = waveData.reduce((acc, val) => acc + val, 0);
        audioEnergy = Math.min(1.5, sum / (waveData.length * 18));
      }
      if (status === 'speaking' && audioEnergy < 0.2) {
        audioEnergy = 0.35 + Math.sin(t * 3) * 0.2;
      }

      // Color scheme based on state
      let coreColor1 = 'rgba(77, 255, 160, 0.9)';   // emerald
      let coreColor2 = 'rgba(0, 210, 255, 0.8)';   // cyan
      let outerGlow = 'rgba(77, 255, 160, 0.25)';
      let rimColor = '#4DFFA0';

      if (status === 'speaking') {
        coreColor1 = 'rgba(0, 240, 255, 0.95)';
        coreColor2 = 'rgba(139, 92, 246, 0.9)';   // violet flare
        outerGlow = 'rgba(0, 220, 255, 0.35)';
        rimColor = '#38BDF8';
      } else if (status === 'thinking') {
        coreColor1 = 'rgba(251, 191, 36, 0.9)';   // amber
        coreColor2 = 'rgba(244, 63, 94, 0.8)';    // rose
        outerGlow = 'rgba(251, 191, 36, 0.25)';
        rimColor = '#FBBF24';
      }

      // 1. Ambient Background Aura
      const ambientRadius = baseRadius * (1.6 + (status === 'speaking' ? audioEnergy * 0.5 : Math.sin(t) * 0.08));
      const ambientGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, outerGlow);
      ambientGrad.addColorStop(0.5, outerGlow.replace(/[\d.]+\)$/, '0.08)'));
      ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, ambientRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Harmonic Outer Wave Rings
      const ringCount = status === 'speaking' ? 3 : 2;
      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const ringOffset = r * 0.3;
        const ringRadius = baseRadius * (1.15 + r * 0.2 + (status === 'speaking' ? audioEnergy * 0.25 : Math.sin(t + ringOffset) * 0.04));

        for (let i = 0; i <= pointCount; i++) {
          const angle = (i / pointCount) * Math.PI * 2;
          const waveIdx = i % (waveData.length || 1);
          const rawWave = waveData[waveIdx] || 4;
          const waveVal = status === 'speaking' ? (rawWave / 60) * 16 : Math.sin(angle * 4 + t * 2 + ringOffset) * 4;

          const dist = ringRadius + waveVal;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = r === 0 ? rimColor : outerGlow;
        ctx.lineWidth = r === 0 ? 1.8 : 1;
        ctx.stroke();
      }

      // 3. Central Morphing Sphere Surface
      ctx.beginPath();
      for (let i = 0; i <= pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        const waveIdx = i % (waveData.length || 1);
        const rawWave = waveData[waveIdx] || 4;
        
        let distortion = 0;
        if (status === 'speaking') {
          distortion = (rawWave / 60) * 22 * audioEnergy + Math.sin(angle * 6 + t * 4) * 8;
        } else if (status === 'thinking') {
          distortion = Math.sin(angle * 5 + t * 3) * 6;
        } else {
          distortion = Math.sin(angle * 3 + t * 1.8) * 3 + Math.cos(angle * 2 - t) * 2;
        }

        const r = baseRadius + distortion;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Sphere core gradient
      const coreGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.25,
        cy - baseRadius * 0.25,
        baseRadius * 0.1,
        cx,
        cy,
        baseRadius * 1.2
      );
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.2, coreColor1);
      coreGrad.addColorStop(0.7, coreColor2);
      coreGrad.addColorStop(1, 'rgba(10, 15, 28, 0.95)');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = rimColor;
      ctx.shadowBlur = status === 'speaking' ? 24 : 12;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow

      // 4. Iridescent Inner Rings / Filament Details
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.9, 0, Math.PI * 2);
      ctx.clip();

      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        const innerAngleOffset = t * (j % 2 === 0 ? 1 : -1.2) + j;
        const innerRadius = baseRadius * (0.35 + j * 0.22);
        ctx.ellipse(
          cx + Math.cos(innerAngleOffset) * (baseRadius * 0.15),
          cy + Math.sin(innerAngleOffset) * (baseRadius * 0.15),
          innerRadius,
          innerRadius * 0.6,
          innerAngleOffset,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = j === 0 ? 'rgba(255,255,255,0.6)' : outerGlow;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [status, waveData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={className}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          maxHeight: '260px',
        }}
      />
    </div>
  );
}
