import React, { useEffect, useRef } from 'react';

export default function KnowledgeGraph({ width = 240, height = 190 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const cx = width / 2;
    const cy = height / 2;

    const nodes = [
      { label: 'Data Structures (85%)', x: cx, y: cy, color: '#00f0ff', main: true },
      { label: 'Arrays 92%',            x: cx - 60, y: cy - 45, color: '#00eb69' },
      { label: 'Recursion 90%',         x: cx + 65, y: cy - 45, color: '#00eb69' },
      { label: 'Trees 76%',             x: cx + 70, y: cy + 30, color: '#1e78ff' },
      { label: 'DP 60%',                x: cx - 10, y: cy + 55, color: '#ff1e37' },
      { label: 'Heap 70%',              x: cx - 70, y: cy + 35, color: '#1e78ff' },
    ];

    ctx.clearRect(0, 0, width, height);

    // Draw connecting edges
    const center = nodes[0];
    nodes.slice(1).forEach(n => {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      const r = n.main ? 16 : 10;
      ctx.fillStyle = n.color;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.label.split(' ')[0], n.x, n.y + r + 10);
    });

  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
