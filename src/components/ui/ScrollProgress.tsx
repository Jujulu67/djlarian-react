'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use scrollYProgress from window/document - no container needed
  // Optimiser sur mobile : utiliser une version simplifiée
  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: isMobile ? 50 : 100, // Moins de raideur sur mobile
    damping: isMobile ? 20 : 30, // Plus de damping sur mobile
    restDelta: isMobile ? 0.01 : 0.001, // Moins de précision sur mobile
  });

  // Don't render until mounted to avoid SSR/hydration issues
  if (!mounted) {
    return null;
  }

  // Optionnel : désactiver complètement sur mobile si nécessaire
  // if (isMobile) {
  //   return null;
  // }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 origin-left z-50"
      style={{
        scaleX,
        position: 'fixed', // Explicitly set position to avoid warnings
        willChange: isMobile ? 'auto' : 'transform', // Optimiser will-change sur mobile
      }}
    />
  );
}
