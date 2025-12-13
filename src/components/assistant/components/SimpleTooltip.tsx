'use client';

/**
 * Tooltip simple et rapide
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip simple et rapide avec Portal pour éviter le clipping
 */
export function SimpleTooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position centré au-dessus de l'élément
      setPosition({
        top: rect.top - 8, // 8px de marge
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Mettre à jour la position au scroll ou resize
  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center min-w-0"
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              top: position.top,
              left: position.left,
            }}
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full px-2 py-1 bg-gray-900/95 backdrop-blur border border-white/10 rounded text-[10px] text-white shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
          >
            {content}
            {/* Petite flèche vers le bas */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
          </div>,
          document.body
        )}
    </div>
  );
}
