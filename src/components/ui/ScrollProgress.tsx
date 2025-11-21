'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function ScrollProgress() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use scrollYProgress from window/document - no container needed
  const { scrollYProgress } = useScroll({
    layoutEffect: false, // Prevent layout shift warnings
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Don't render until mounted to avoid SSR/hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 origin-left z-50"
      style={{
        scaleX,
        position: 'fixed', // Explicitly set position to avoid warnings
      }}
    />
  );
}
