'use client';

import { useState, useEffect } from 'react';

interface Props {
  value: number;
  duration?: number;
  prefix?: string;
  className?: string;
}

export function AnimatedNumber({ value, duration = 1400, prefix = '', className }: Props) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{display.toLocaleString()}
    </span>
  );
}
