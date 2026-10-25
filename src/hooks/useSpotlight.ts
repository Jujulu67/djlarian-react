'use client';

import { useCallback } from 'react';
import type { PointerEvent } from 'react';

/**
 * Projecteur qui suit le curseur sur une carte (utilitaire CSS `spotlight`, UI v2).
 * Pose --spot-x / --spot-y / --spot-opacity sur l'élément ; rien au tactile.
 *
 * Usage : `<div className="v2:spotlight" {...useSpotlight()}>`
 */
export function useSpotlight<T extends HTMLElement = HTMLElement>() {
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== 'mouse') return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    el.style.setProperty('--spot-opacity', '1');
  }, []);

  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    event.currentTarget.style.setProperty('--spot-opacity', '0');
  }, []);

  return { onPointerMove, onPointerLeave };
}
