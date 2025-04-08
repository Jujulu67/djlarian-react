'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dispatch, SetStateAction } from 'react';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0 to 1
  timestamp: number;
}

interface ParticleSystemProps {
  particles: Particle[];
  setParticles: Dispatch<SetStateAction<Particle[]>>;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles, setParticles }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Fonction d'animation des particules
  const animateParticles = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculer deltaTime pour des animations fluides
      const deltaTime = (timestamp - (lastFrameTimeRef.current || timestamp)) / 16; // Normaliser à 60fps
      lastFrameTimeRef.current = timestamp;

      // Effacer le canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mettre à jour et dessiner chaque particule
      setParticles((prevParticles) =>
        prevParticles
          .map((particle) => {
            // Calculer l'âge de la particule
            const age = (timestamp - particle.timestamp) / 1000; // en secondes

            // Réduire progressivement la vie
            const newLife = Math.max(0, particle.life - 0.025 * deltaTime);

            // Appliquer la physique
            const gravity = 0.05 * deltaTime;
            const drag = 0.98;

            const newVx = particle.vx * drag;
            const newVy = particle.vy * drag + gravity;

            const newX = particle.x + newVx * deltaTime;
            const newY = particle.y + newVy * deltaTime;

            // Réduire la taille progressivement
            const newSize = particle.size * (0.9 + 0.1 * newLife);

            // Dessiner la particule
            const alpha = newLife * 0.8; // Progressivement plus transparent

            ctx.beginPath();
            ctx.arc(newX, newY, newSize, 0, Math.PI * 2);

            // Extraire les composantes de couleur
            let r = 255,
              g = 255,
              b = 255;
            if (particle.color.startsWith('#')) {
              const hex = particle.color.substring(1);
              r = parseInt(hex.substring(0, 2), 16);
              g = parseInt(hex.substring(2, 4), 16);
              b = parseInt(hex.substring(4, 6), 16);
            } else if (particle.color.startsWith('rgb')) {
              const matches = particle.color.match(/\d+/g);
              if (matches && matches.length >= 3) {
                r = parseInt(matches[0]);
                g = parseInt(matches[1]);
                b = parseInt(matches[2]);
              }
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fill();

            // Ajouter un halo lumineux
            if (newLife > 0.5) {
              ctx.beginPath();
              ctx.arc(newX, newY, newSize * 1.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
              ctx.fill();
            }

            return {
              ...particle,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy,
              size: newSize,
              life: newLife,
            };
          })
          .filter((particle) => particle.life > 0)
      );

      // Continuer l'animation si des particules existent encore
      if (particles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animateParticles);
      } else {
        animationFrameRef.current = null;
      }
    },
    [particles.length, setParticles]
  );

  // Démarrer/arrêter l'animation quand les particules changent
  useEffect(() => {
    if (particles.length > 0 && !animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animateParticles);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [particles.length, animateParticles]);

  // Ajuster la taille du canvas quand le composant est monté
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;

      const parentElement = canvasRef.current.parentElement;
      if (!parentElement) return;

      canvasRef.current.width = parentElement.clientWidth;
      canvasRef.current.height = parentElement.clientHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
  );
};

export default ParticleSystem;
