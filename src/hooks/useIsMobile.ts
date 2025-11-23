import { useEffect, useState } from 'react';

/**
 * Hook to detect if the current viewport is mobile
 * Uses the same pattern as the rest of the codebase: window.innerWidth <= 768
 *
 * @returns boolean indicating if the viewport is mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}
