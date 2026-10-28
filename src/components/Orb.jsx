import React, { useEffect, useRef } from 'react';

export default function Orb({ state = 'idle', size = 310, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    const render = () => {
      t += 0.025;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.28;

      // Color maps
      const colors = {
        idle:      { primary: '#00f0ff', secondary: '#a032ff' },
        listening: { primary: '#1e78ff', secondary: '#00f0ff' },
        thinking:  { primary: '#a032ff', secondary: '#ec4899' },
        speaking:  { primary: '#00f0ff', secondary: '#00eb69' },
        learning:  { primary: '#00eb69', secondary: '#00f0ff' },
        planning:  { primary: '#ff9b00', secondary: '#a032ff' },
        coding:    { primary: '#ff1e37', secondary: '#ff9b00' },
        youtube:   { primary: '#3b82f6', secondary: '#00f0ff' },
        pdf:       { primary: '#eab308', secondary: '#ff9b00' },
        email:     { primary: '#ec4899', secondary: '#a032ff' },
        exam:      { primary: '#10b981', secondary: '#00eb69' },
      }[state] || { primary: '#00f0ff', secondary: '#a032ff' };

      // Outer glow aura
      const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.6);
      auraGrad.addColorStop(0, `${colors.primary}40`);
      auraGrad.addColorStop(0.6, `${colors.secondary}20`);
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Main Orb Sphere
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.3, colors.primary);
      sphereGrad.addColorStop(0.7, colors.secondary);
      sphereGrad.addColorStop(1, '#060a17');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + Math.sin(t * 2) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Orbiting rings
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * (i + 1) * 0.4 * (i % 2 === 0 ? 1 : -1));
        ctx.scale(1, 0.4 + i * 0.15);

        ctx.strokeStyle = i === 0 ? colors.primary : colors.secondary;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(0, 0, radius * (1.2 + i * 0.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    />
  );
}
