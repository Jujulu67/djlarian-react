'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  children: React.ReactNode;
}

export default function Modal({ children }: ModalProps) {
  const router = useRouter();

  const handleClose = () => {
    router.back(); // Navigue en arrière pour fermer la modale
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose} // Fermer en cliquant sur l'arrière-plan
    >
      <div
        className="bg-gradient-to-br from-[#1a0f2a] via-[#0c0117] to-[#1a0f2a] rounded-xl shadow-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Empêcher la fermeture en cliquant sur le contenu
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
          aria-label="Fermer la modale"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 md:p-8 lg:p-10">{children}</div>
      </div>
    </div>
  );
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
