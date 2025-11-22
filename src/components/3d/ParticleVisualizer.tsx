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

    const padding = 20;
    const forceStrength = 0.1;

    if (this.x < padding) {
      this.speedX += forceStrength * (1 - this.x / padding);
    } else if (this.x > canvasWidth - padding) {
      this.speedX -= forceStrength * (1 - (canvasWidth - this.x) / padding);
    }

    if (this.y < padding) {
      this.speedY += forceStrength * (1 - this.y / padding);
    } else if (this.y > canvasHeight - padding) {
      this.speedY -= forceStrength * (1 - (canvasHeight - this.y) / padding);
    }

    if (isHovered) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 120;

      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * (isEffectActive ? 4 : 1.5);
        const directionX = distance === 0 ? 1 : dx / distance;
        const directionY = distance === 0 ? 1 : dy / distance;

        this.speedX += directionX * force * (isEffectActive ? 2 : 0.5);
        this.speedY += directionY * force * (isEffectActive ? 2 : 0.5);
      }
    }

    const randomForce = isEffectActive ? 0.4 : 0.1;
    this.speedX += (Math.random() - 0.5) * randomForce;
    this.speedY += (Math.random() - 0.5) * randomForce;

    const maxSpeed = isEffectActive ? 12 : 6;
    const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
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

    this.x += this.speedX;
    this.y += this.speedY;

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

    if (isEffectActive) {
      const distance = Math.sqrt((this.x - mouseX) ** 2 + (this.y - mouseY) ** 2);
      const maxDistance = 200;
      const targetSize = this.baseSize * (1 + (1 - Math.min(distance, maxDistance) / maxDistance));
      this.size = this.size * 0.9 + targetSize * 0.1;
    } else {
      this.size = this.size * 0.95 + this.baseSize * 0.05;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
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

      // Dessin des lignes avec dégradé de couleur
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = isEffectActive ? 150 : 100;

          if (distance < maxDistance) {
            const opacity = Math.pow(1 - distance / maxDistance, 1.5);
            const baseOpacity = isEffectActive ? 1 : 0.8;

            const gradient = ctx.createLinearGradient(
              particlesRef.current[i].x,
              particlesRef.current[i].y,
              particlesRef.current[j].x,
              particlesRef.current[j].y
            );

            if (isEffectActive) {
              gradient.addColorStop(0, `rgba(167, 71, 254, ${opacity * baseOpacity})`);
              gradient.addColorStop(0.5, `rgba(144, 58, 255, ${opacity * baseOpacity})`);
              gradient.addColorStop(1, `rgba(129, 40, 237, ${opacity * baseOpacity})`);
            } else {
              gradient.addColorStop(0, `rgba(147, 51, 234, ${opacity * baseOpacity})`);
              gradient.addColorStop(0.5, `rgba(124, 58, 237, ${opacity * baseOpacity})`);
              gradient.addColorStop(1, `rgba(109, 40, 217, ${opacity * baseOpacity})`);
            }

            ctx.strokeStyle = gradient;
            ctx.lineWidth = isEffectActive ? 2 : 1.2;
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.stroke();
          }
        }
      }

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
