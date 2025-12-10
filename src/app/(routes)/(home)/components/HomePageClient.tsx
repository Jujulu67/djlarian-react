'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Composant client pour gérer les effets de bord de la page d'accueil
 * - Nettoyage du callbackUrl de l'URL
 * - Gestion du scroll snapping
 */
export default function HomePageClient() {
  const router = useRouter();

  // Nettoyer le paramètre callbackUrl de l'URL après le chargement
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('callbackUrl')) {
      // Supprimer callbackUrl de l'URL sans recharger la page
      urlParams.delete('callbackUrl');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [router]);

  // Enable scroll snapping for homepage - désactivé sur mobile pour éviter les bugs
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth <= 768;
      // Ne pas ajouter la classe sur mobile pour éviter les problèmes de performance
      if (!isMobile) {
        document.documentElement.classList.add('homepage-scroll-snap');
      } else {
        document.documentElement.classList.remove('homepage-scroll-snap');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.documentElement.classList.remove('homepage-scroll-snap');
    };
  }, []);

  // S'assurer que le body a une position relative pour Framer Motion
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Si le body n'a pas de position, lui donner relative pour Framer Motion
      if (!document.body.style.position || document.body.style.position === 'static') {
        document.body.style.position = 'relative';
      }
    }
  }, []);

  return null; // Ce composant ne rend rien, il gère juste les effets de bord
}
