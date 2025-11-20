import { useState, useCallback } from 'react';

interface ScreenShakeState {
  active: boolean;
  intensity: number;
}

/**
 * Hook to manage screen shake effects
 */
export const useScreenShake = () => {
  const [screenShake, setScreenShake] = useState<ScreenShakeState>({
    active: false,
    intensity: 0,
  });

  const triggerShake = useCallback((intensity: number) => {
    setScreenShake({ active: true, intensity });
  }, []);

  const updateShake = useCallback((reduceFactor: number = 0.9) => {
    setScreenShake((prev) => ({
      active: prev.intensity > 0.5,
      intensity: prev.intensity * reduceFactor,
    }));
  }, []);

  const getShakeOffset = useCallback(() => {
    if (!screenShake.active) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * screenShake.intensity,
      y: (Math.random() - 0.5) * screenShake.intensity,
    };
  }, [screenShake]);

  return {
    screenShake,
    triggerShake,
    updateShake,
    getShakeOffset,
  };
};
