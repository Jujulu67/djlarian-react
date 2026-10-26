'use client';

import { useEffect, useRef } from 'react';

interface SignalWaveProps {
  /** Tempo qui cadence les impulsions (kick) */
  bpm?: number;
  className?: string;
}

/** Couleurs lues dans les tokens v3 au montage (fallbacks identiques à globals.css) */
function readToken(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `rgb(${value.split(' ').join(',')})` : fallback;
}

/**
 * Oscilloscope génératif : plusieurs harmoniques qui respirent au tempo, une impulsion
 * à chaque temps (plus forte sur le premier temps de la mesure), et une bosse qui suit
 * le pointeur pour « scratcher » le signal. Canvas 2D, en pause hors écran,
 * ligne immobile si prefers-reduced-motion.
 */
export default function SignalWave({ bpm = 124, className }: SignalWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ink = readToken('--ink', 'rgb(237,235,230)');
    const brand = readToken('--brand', 'rgb(157,107,255)');
    const signal = readToken('--signal', 'rgb(212,255,58)');
    const beatMs = 60000 / bpm;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    // Pointeur en coordonnées locales, lissé pour que la bosse glisse
    const pointer = { x: -1, target: -1, strength: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const mid = height / 2;

      // Enveloppe du kick : attaque instantanée, décroissance exponentielle sur le temps
      const beatPhase = (time % beatMs) / beatMs;
      const isDownbeat = Math.floor(time / beatMs) % 4 === 0;
      const kick = reduceMotion ? 0 : Math.exp(-beatPhase * 6) * (isDownbeat ? 1 : 0.6);

      pointer.x += (pointer.target - pointer.x) * 0.12;
      pointer.strength += ((pointer.target >= 0 ? 1 : 0) - pointer.strength) * 0.08;

      const layers = [
        { color: brand, alpha: 0.35, amp: 0.34, freq: 1.6, speed: 0.00035, lineWidth: 6, blur: 18 },
        { color: ink, alpha: 0.9, amp: 0.26, freq: 2.4, speed: 0.0006, lineWidth: 1.25, blur: 0 },
        { color: ink, alpha: 0.35, amp: 0.18, freq: 5.2, speed: 0.0011, lineWidth: 1, blur: 0 },
      ];

      for (const layer of layers) {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.globalAlpha = layer.alpha;
        ctx.lineWidth = layer.lineWidth;
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = layer.blur;

        for (let x = 0; x <= width; x += 3) {
          const u = x / width;
          // Fenêtre : le signal s'éteint vers les bords
          const windowing = Math.sin(Math.PI * u) ** 1.5;
          const t = reduceMotion ? 0 : time * layer.speed;
          let y =
            Math.sin(u * Math.PI * 2 * layer.freq + t) * 0.6 +
            Math.sin(u * Math.PI * 2 * layer.freq * 2.7 - t * 1.3) * 0.25 +
            Math.sin(u * Math.PI * 2 * layer.freq * 0.5 + t * 0.7) * 0.15;
          y *= layer.amp * (1 + kick * 1.4);

          // Bosse autour du pointeur
          if (pointer.strength > 0.01) {
            const d = (x - pointer.x) / (width * 0.08);
            y +=
              Math.exp(-d * d) *
              0.55 *
              pointer.strength *
              Math.sin(time * 0.02 + u * 40) *
              layer.amp *
              2;
          }

          const py = mid + y * windowing * mid;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }

      // Impulsion « signal » sur le premier temps : un trait vertical bref au centre
      if (isDownbeat && kick > 0.05) {
        ctx.globalAlpha = kick * 0.9;
        ctx.shadowBlur = 0;
        ctx.fillStyle = signal;
        ctx.fillRect(width / 2 - 1, mid - mid * 0.8 * kick, 2, mid * 1.6 * kick);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };

    const loop = (time: number) => {
      if (visible) draw(time);
      if (!reduceMotion) frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientY >= rect.top - 120 && event.clientY <= rect.bottom + 120;
      pointer.target = inside ? event.clientX - rect.left : -1;
      if (pointer.x < 0) pointer.x = pointer.target;
    };
    const onPointerLeave = () => {
      pointer.target = -1;
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(canvas);

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [bpm]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
