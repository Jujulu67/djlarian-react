import { useEffect, useRef, useState } from 'react';
import type { SlotMachineStatus } from '@/types/slot-machine';

interface UseAutoSpinParams {
  isOpen: boolean;
  isSpinning: boolean;
  status: SlotMachineStatus | null;
  spin: () => unknown;
}

export function useAutoSpin({ isOpen, isSpinning, status, spin }: UseAutoSpinParams) {
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const autoSpinRef = useRef(false);

  // Auto spin effect
  useEffect(() => {
    autoSpinRef.current = isAutoSpinning;
  }, [isAutoSpinning]);

  useEffect(() => {
    // When spin completes and auto mode is on, spin again
    if (!isSpinning && autoSpinRef.current && status && status.tokens >= 3) {
      const timer = setTimeout(() => {
        if (autoSpinRef.current) {
          spin();
        }
      }, 500); // Small delay between spins
      return () => clearTimeout(timer);
    }
  }, [isSpinning, status, spin]);

  const toggleAutoSpin = () => {
    if (isAutoSpinning) {
      setIsAutoSpinning(false);
    } else {
      setIsAutoSpinning(true);
      if (!isSpinning && status && status.tokens >= 3) {
        spin(); // Start first spin
      }
    }
  };

  // Stop auto spin if tokens run out
  useEffect(() => {
    if (isAutoSpinning && status && status.tokens < 3) {
      setIsAutoSpinning(false);
    }
  }, [status, isAutoSpinning]);

  // Stop auto spin when dialog closes
  useEffect(() => {
    if (!isOpen && isAutoSpinning) {
      setIsAutoSpinning(false);
      autoSpinRef.current = false;
    }
  }, [isOpen, isAutoSpinning]);

  return { isAutoSpinning, toggleAutoSpin };
}
