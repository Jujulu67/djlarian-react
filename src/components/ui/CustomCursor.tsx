'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleVisibilityChange = () => {
      const isSoundActive = document.documentElement.classList.contains('custom-cursor-active');
      const isOverVisualizer = document.documentElement.classList.contains('over-visualizer');
      setIsVisible(isSoundActive || isOverVisualizer);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Observer les changements de classe sur documentElement
    const observer = new MutationObserver(handleVisibilityChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Vérifier l'état initial
    handleVisibilityChange();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 w-6 h-6 pointer-events-none z-50 mix-blend-difference"
      initial={{ x: mousePosition.x - 12, y: mousePosition.y - 12, scale: 1.5 }}
      animate={{
        x: mousePosition.x - 12,
        y: mousePosition.y - 12,
        scale: 1.5,
      }}
      transition={{
        duration: 0.05,
        ease: [0.16, 1, 0.3, 1], // ease-out-expo
      }}
    >
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
      `}</style>
      <div className="w-full h-full rounded-full bg-white" />
    </motion.div>
  );
};

export default CustomCursor;
