import type { MouseEventHandler } from 'react';

interface WaveformSeekInputProps {
  duration: number;
  currentTime: number;
  disabled?: boolean;
  /** Déplacement au clavier (flèches, Début, Fin) */
  onSeek: (time: number) => void;
  /** Clic à la souris : position exacte sous le curseur */
  onClick?: MouseEventHandler<HTMLElement>;
}

/**
 * Curseur invisible posé sur une forme d'onde : il la rend utilisable au clavier
 * et par les lecteurs d'écran, sans rien changer à son apparence.
 */
export function WaveformSeekInput({
  duration,
  currentTime,
  disabled = false,
  onSeek,
  onClick,
}: Readonly<WaveformSeekInputProps>) {
  return (
    <input
      type="range"
      aria-label="Position de lecture"
      min={0}
      max={duration}
      step={1}
      value={Math.min(currentTime, duration)}
      disabled={disabled}
      onChange={(e) => onSeek(Number(e.target.value))}
      onClick={onClick}
      className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
  );
}
