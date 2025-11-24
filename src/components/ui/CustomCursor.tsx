'use client';

import { useEffect, useRef } from 'react';

const CustomCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const updateCursor = (e: MouseEvent) => {
      if (!cursor || !isVisibleRef.current) return;
      cursor.style.transform = `translate3d(${e.clientX - 24}px, ${e.clientY - 24}px, 0)`;
    };

    const handleVisibilityChange = () => {
      const isSoundActive = document.documentElement.classList.contains('custom-cursor-active');
      const isOverVisualizer = document.documentElement.classList.contains('over-visualizer');
      const isRhythmCatcherActive =
        document.documentElement.classList.contains('rhythm-catcher-active');
      // Masque le curseur si RhythmCatcher est actif (il a son propre curseur)
      isVisibleRef.current = (isSoundActive || isOverVisualizer) && !isRhythmCatcherActive;
      cursor.style.display = isVisibleRef.current ? 'block' : 'none';
    };

    window.addEventListener('mousemove', updateCursor, { passive: true });

    const observer = new MutationObserver(handleVisibilityChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    handleVisibilityChange();

    return () => {
      window.removeEventListener('mousemove', updateCursor);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .custom-cursor-active *,
        .over-visualizer * {
          cursor: none !important;
        }
        html.custom-cursor-active,
        html.over-visualizer,
        body.custom-cursor-active,
        body.over-visualizer {
          cursor: none !important;
        }
        .custom-cursor {
          position: fixed;
          top: 0;
          left: 0;
          width: 48px;
          height: 48px;
          pointer-events: none;
          z-index: 50;
          mix-blend-mode: difference;
          will-change: transform;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000;
          -webkit-perspective: 1000;
        }
        .custom-cursor-dot {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 50%;
          opacity: 0.9;
          transform: scale(1);
          transition: transform 0.1s ease-out;
        }
        .custom-cursor:active .custom-cursor-dot {
          transform: scale(0.9);
        }
      `}</style>
      <div ref={cursorRef} className="custom-cursor">
        <div className="custom-cursor-dot" />
      </div>
    </>
  );
};

export default CustomCursor;
