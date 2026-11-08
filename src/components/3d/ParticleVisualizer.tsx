'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  baseSize: number;
  speedX: number;
  speedY: number;
  baseSpeedX: number;
  baseSpeedY: number;
  color: string;
  inertia: number;
  update: (
    canvasWidth: number,
    canvasHeight: number,
    mouseX: number,
    mouseY: number,
    isHovered: boolean,
    isEffectActive: boolean
  ) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const EDGE_PADDING = 20;
const EDGE_FORCE = 0.1;

/** Force de rappel près d'un bord (positive vers l'intérieur ; 0 hors de la zone) */
function edgePush(position: number, limit: number, padding: number, strength: number) {
  if (position < padding) return strength * (1 - position / padding);
  if (position > limit - padding) return -strength * (1 - (limit - position) / padding);
  return 0;
}

class ParticleImpl implements Particle {
  x: number = 0;
  y: number = 0;
  size: number = 0;
  baseSize: number = 0;
  speedX: number = 0;
  speedY: number = 0;
  baseSpeedX: number = 0;
  baseSpeedY: number = 0;
  color: string = '';
  inertia: number = 0.98;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.baseSize = Math.random() * 3 + 1;
    this.size = this.baseSize;
    this.baseSpeedX = (Math.random() * 2 - 1) * 1.2;
    this.baseSpeedY = (Math.random() * 2 - 1) * 1.2;
    this.speedX = this.baseSpeedX;
    this.speedY = this.baseSpeedY;
    this.color = `hsla(${Math.random() * 40 + 250}, 80%, 65%, 0.9)`;
  }

  update(
    canvasWidth: number,
    canvasHeight: number,
    mouseX: number,
    mouseY: number,
    isHovered: boolean,
    isEffectActive: boolean
  ) {
    this.speedX *= this.inertia;
    this.speedY *= this.inertia;

    this.applyEdgeForces(canvasWidth, canvasHeight);

    if (isHovered) {
      this.applyMouseForce(mouseX, mouseY, isEffectActive);
    }

    const randomForce = isEffectActive ? 0.4 : 0.1;
    this.speedX += (Math.random() - 0.5) * randomForce;
    this.speedY += (Math.random() - 0.5) * randomForce;

    this.clampSpeed(isEffectActive);

    this.x += this.speedX;
    this.y += this.speedY;

    this.bounceAtEdges(canvasWidth, canvasHeight);
    if (isEffectActive) {
      this.growNearCursor(mouseX, mouseY);
    } else {
      this.shrinkToBaseSize();
    }
  }

  /** Repousse doucement la particule vers l'intérieur près des bords */
  private applyEdgeForces(canvasWidth: number, canvasHeight: number) {
    this.speedX += edgePush(this.x, canvasWidth, EDGE_PADDING, EDGE_FORCE);
    this.speedY += edgePush(this.y, canvasHeight, EDGE_PADDING, EDGE_FORCE);
  }

  /** Attire / repousse la particule autour du curseur */
  private applyMouseForce(mouseX: number, mouseY: number, isEffectActive: boolean) {
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const distance = Math.hypot(dx, dy);
    const maxDistance = 120;

    if (distance < maxDistance) {
      const force = (1 - distance / maxDistance) * (isEffectActive ? 4 : 1.5);
      const directionX = distance === 0 ? 1 : dx / distance;
      const directionY = distance === 0 ? 1 : dy / distance;

      this.speedX += directionX * force * (isEffectActive ? 2 : 0.5);
      this.speedY += directionY * force * (isEffectActive ? 2 : 0.5);
    }
  }

  /** Borne la vitesse entre un minimum et un maximum */
  private clampSpeed(isEffectActive: boolean) {
    const maxSpeed = isEffectActive ? 12 : 6;
    const currentSpeed = Math.hypot(this.speedX, this.speedY);
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.speedX *= scale;
      this.speedY *= scale;
    }

    const minSpeed = isEffectActive ? 0.5 : 0.2;
    if (currentSpeed < minSpeed) {
      const scale = minSpeed / (currentSpeed || 1);
      this.speedX *= scale;
      this.speedY *= scale;
    }
  }

  /** Rebond sur les bords du canvas (vitesse amortie) */
  private bounceAtEdges(canvasWidth: number, canvasHeight: number) {
    if (this.x > canvasWidth) {
      this.x = canvasWidth;
      this.speedX *= -0.5;
    } else if (this.x < 0) {
      this.x = 0;
      this.speedX *= -0.5;
    }

    if (this.y > canvasHeight) {
      this.y = canvasHeight;
      this.speedY *= -0.5;
    } else if (this.y < 0) {
      this.y = 0;
      this.speedY *= -0.5;
    }
  }

  /** Taille qui grossit près du curseur quand l'effet est actif */
  private growNearCursor(mouseX: number, mouseY: number) {
    const distance = Math.hypot(this.x - mouseX, this.y - mouseY);
    const maxDistance = 200;
    const targetSize = this.baseSize * (1 + (1 - Math.min(distance, maxDistance) / maxDistance));
    this.size = this.size * 0.9 + targetSize * 0.1;
  }

  /** Retour progressif à la taille de base */
  private shrinkToBaseSize() {
    this.size = this.size * 0.95 + this.baseSize * 0.05;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

const ACTIVE_LINK_RGB = ['167, 71, 254', '144, 58, 255', '129, 40, 237'];
const IDLE_LINK_RGB = ['147, 51, 234', '124, 58, 237', '109, 40, 217'];

/** Dégradé d'une ligne : trois couleurs du thème, à l'opacité donnée */
function addLinkColorStops(gradient: CanvasGradient, rgb: string[], alpha: number) {
  gradient.addColorStop(0, `rgba(${rgb[0]}, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(${rgb[1]}, ${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb[2]}, ${alpha})`);
}

/** Dessine les liens entre particules proches */
function drawLinks(ctx: CanvasRenderingContext2D, particles: Particle[], isEffectActive: boolean) {
  const maxDistance = isEffectActive ? 150 : 100;
  const baseOpacity = isEffectActive ? 1 : 0.8;
  const rgb = isEffectActive ? ACTIVE_LINK_RGB : IDLE_LINK_RGB;

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (distance < maxDistance) {
        const opacity = Math.pow(1 - distance / maxDistance, 1.5);
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        addLinkColorStops(gradient, rgb, opacity * baseOpacity);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = isEffectActive ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}

const ParticleVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isEffectActive, setIsEffectActive] = useState(false);
  const mousePosition = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);

  // Effet pour gérer le curseur personnalisé
  useEffect(() => {
    const cursorCanvas = cursorCanvasRef.current;
    if (!cursorCanvas) return;

    const ctx = cursorCanvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const setCanvasSize = () => {
      if (!cursorCanvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = cursorCanvas.getBoundingClientRect();
      cursorCanvas.width = rect.width * dpr;
      cursorCanvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = cursorCanvas.getBoundingClientRect();
      mousePosition.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      requestAnimationFrame(() => {
        ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
        if (isEffectActive) {
          ctx.beginPath();
          ctx.arc(mousePosition.current.x, mousePosition.current.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(mousePosition.current.x, mousePosition.current.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isEffectActive]);

  // Effet pour gérer les particules
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Initialize particles
    if (particlesRef.current.length === 0) {
      const particleCount = 150;
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(new ParticleImpl(canvas.width, canvas.height));
      }
    }

    let animationFrameId: number;
    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.update(
          canvas.width,
          canvas.height,
          mousePosition.current.x,
          mousePosition.current.y,
          isHovered,
          isEffectActive
        );
        particle.draw(ctx);
      });

      drawLinks(ctx, particlesRef.current, isEffectActive);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered, isEffectActive]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    document.documentElement.classList.add('over-visualizer');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!document.documentElement.classList.contains('custom-cursor-active')) {
      document.documentElement.classList.remove('over-visualizer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="relative aspect-[2/1] w-full rounded-lg overflow-hidden music-visualizer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsEffectActive(!isEffectActive)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <canvas
        ref={cursorCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none', touchAction: 'none' }}
      />
    </motion.div>
  );
};

export default ParticleVisualizer;
