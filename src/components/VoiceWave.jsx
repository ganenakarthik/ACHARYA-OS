import React, { useEffect, useState } from 'react';

export default function VoiceWave({ active = false, color = '#00f0ff', width = 90, height = 22, bars = 14 }) {
  const [heights, setHeights] = useState(new Array(bars).fill(6));

  useEffect(() => {
    if (!active) {
      setHeights(new Array(bars).fill(6));
      return;
    }

    const iv = setInterval(() => {
      setHeights(Array.from({ length: bars }, () => Math.floor(Math.random() * (height - 4)) + 4));
    }, 90);

    return () => clearInterval(iv);
  }, [active, bars, height]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', width: `${width}px`, height: `${height}px` }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}px`,
            backgroundColor: color,
            borderRadius: '2px',
            transition: 'height 0.08s ease',
          }}
        />
      ))}
    </div>
  );
}
