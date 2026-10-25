'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  noScroll?: boolean; // Si true, désactive le scroll du contenu
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
  noScroll = false,
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

  // Escape pour fermer, focus déplacé dans la modale puis rendu à l'élément d'origine,
  // et Tab qui reste dans la modale (piège de focus minimal)
  const handleCloseRef = useRef(handleClose);
  useLayoutEffect(() => {
    handleCloseRef.current = handleClose;
  });
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    modalRef.current?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
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
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity v2:bg-black/55 v2:backdrop-blur-md v2:animate-[v2-fade-in_250ms_cubic-bezier(0.16,1,0.3,1)]"
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative transform overflow-hidden rounded-xl ${bgClass ?? 'glass-modern backdrop-blur-xl v2:surface-3'} ${borderClass ?? ''} w-full ${maxWidth} text-left shadow-2xl transition-all ${fullscreenContent ? 'w-screen h-screen m-0 rounded-none' : 'sm:my-8 v2:rounded-3xl'} animate-fadeIn outline-none v2:animate-[v2-modal-in_400ms_cubic-bezier(0.16,1,0.3,1)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10 v2:bg-white/[0.06] v2:hover:bg-white/[0.12] v2:hover:rotate-90 v2:transition-[transform,background-color,color] v2:duration-300"
          aria-label="Fermer la modale"
        >
          <X className="w-5 h-5" />
        </button>
        <div
          className={
            fullscreenContent
              ? 'w-full h-full p-0 m-0'
              : `p-6 md:p-8 lg:p-10 max-h-[80vh] ${noScroll ? 'overflow-y-auto md:overflow-hidden' : 'overflow-y-auto'}`
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
