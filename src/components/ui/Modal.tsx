'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  children: React.ReactNode;
  maxWidth?: string; // ex: 'max-w-md', 'max-w-lg', etc.
  showLoader?: boolean; // pour contrôler l'animation de fadeIn/fadeOut
  isReady?: boolean; // nouveau
  bgClass?: string; // nouveau
  borderClass?: string; // nouveau
  onClose?: () => void; // nouveau
  zClass?: string; // nouveau, pour personnaliser le z-index
  fullscreenContent?: boolean; // Si true, désactive padding/margin/overflow pour un contenu 100% écran
}

export default function Modal({
  children,
  maxWidth = 'max-w-4xl',
  showLoader = true,
  isReady = true,
  bgClass,
  borderClass,
  onClose,
  zClass,
  fullscreenContent = false,
}: ModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isMouseDownOutside, setIsMouseDownOutside] = useState(false);

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  // Utiliser useLayoutEffect pour appliquer les styles AVANT le premier rendu visuel
  useLayoutEffect(() => {
    // Sauvegarder le scroll position actuel
    const scrollY = window.scrollY;

    // Calculer la largeur de la barre de défilement avant de bloquer le scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Appliquer immédiatement pour éviter le flash
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      // Restaurer le scrolling quand la modale se ferme
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';

      // Restaurer la position de défilement
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Vérifie si le clic a commencé en dehors du contenu de la modale
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      setIsMouseDownOutside(true);
    } else {
      setIsMouseDownOutside(false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Ferme la modale seulement si le mousedown et le mouseup sont tous deux en dehors
    if (isMouseDownOutside && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
    // Réinitialise l'état pour le prochain clic
    setIsMouseDownOutside(false);
  };

  const modalContent = (
    <div
      className={`fixed inset-0 ${zClass ?? 'z-[9999]'} flex items-center justify-center overflow-hidden`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className={`relative transform overflow-hidden rounded-xl ${bgClass ?? 'bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a]'} ${borderClass ?? 'border border-purple-500/30'} w-full ${maxWidth} text-left shadow-2xl transition-all ${fullscreenContent ? 'w-screen h-screen m-0 rounded-none' : 'sm:my-8'} animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
          aria-label="Fermer la modale"
        >
          <X className="w-5 h-5" />
        </button>
        <div
          className={
            fullscreenContent
              ? 'w-full h-full p-0 m-0'
              : 'p-6 md:p-8 lg:p-10 max-h-[80vh] overflow-y-auto'
          }
        >
          {isReady ? (
            showLoader ? (
              <div className="animate-fadeIn">{children}</div>
            ) : (
              children
            )
          ) : null}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
}

// Ajouter quelques keyframes pour l'animation dans un style global ou un fichier CSS séparé
// Si vous utilisez Tailwind, vous pouvez configurer ceci dans tailwind.config.js
/*
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
.animate-slide-up {
  animation: slideUp 0.4s ease-out forwards;
}
*/
