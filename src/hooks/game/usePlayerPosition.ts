import { useRef, useCallback } from 'react';

interface UsePlayerPositionProps {
  setPlayerPosition?: (x: number, y: number) => void;
  initialX?: number;
  initialY?: number;
}

/**
 * Hook to manage player position on canvas
 */
export const usePlayerPosition = ({
  setPlayerPosition,
  initialX = 0,
  initialY = 0,
}: UsePlayerPositionProps) => {
  const playerRef = useRef<{ x: number; y: number }>({ x: initialX, y: initialY });

  const updatePosition = useCallback(
    (x: number, y: number) => {
      playerRef.current = { x, y };
      if (setPlayerPosition) {
        setPlayerPosition(x, y);
      }
    },
    [setPlayerPosition]
  );

  const getPosition = useCallback(() => {
    return playerRef.current;
  }, []);

  const setInitialPosition = useCallback(
    (x: number, y: number) => {
      playerRef.current = { x, y };
      if (setPlayerPosition) {
        setPlayerPosition(x, y);
      }
    },
    [setPlayerPosition]
  );

  return {
    playerRef,
    updatePosition,
    getPosition,
    setInitialPosition,
  };
};
