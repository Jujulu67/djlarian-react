'use client';

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { Music } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSpotify, FaApple, FaSoundcloud } from 'react-icons/fa';

import { logger } from '@/lib/logger';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import { Track } from '@/lib/utils/types';

// Ajouter un état pour gérer l'erreur d'une image spécifique
type ImageErrorState = { [key: string]: boolean };

// Keyframes pour l'animation du glow doré
const glowAnimation = `
  @keyframes shimmer {
    0% {
      box-shadow: 0 0 5px 2px #FFF3A3, 0 0 7px 4px #F6C26D;
    }
    50% {
      box-shadow: 0 0 10px 2px #DAA520, 0 0 12px 4px #B8860B;
    }
    100% {
      box-shadow: 0 0 5px 2px #FFF3A3, 0 0 7px 4px #F6C26D;
    }
  }

  /* Style pour le contour doré avec box-shadow */
  .golden-border {
    position: relative;
    background: #111827; /* bg-gray-900 */
    transition: all 0.5s ease;
  }
  
  .golden-border:hover {
    box-shadow: 0 0 8px 2px #FFF3A3, 0 0 15px 5px #DAA520;
    animation: shimmer 3s ease-in-out infinite;
  }
`;

// Props pour le composant LatestReleases
export interface LatestReleasesProps {
  title?: string;
  count?: number;
  isFirstSection?: boolean; // Indique si c'est la première section après le hero
}

export default function LatestReleases({
  title = 'Latest Releases',
  count = 3,
  isFirstSection = false,
}: LatestReleasesProps) {
  const [releases, setReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<ImageErrorState>({}); // Initialiser l'état des erreurs d'image
  const router = useRouter();

  // Charger les morceaux depuis l'API
  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();

    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/music', {
          cache: 'no-store', // Force le fetch à chaque fois
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des morceaux');
        }
        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: [...] }
        const data = result.data || [];

        if (!isMounted) return; // Éviter les mises à jour si le composant est démonté

        // Filtrer et trier: uniquement les singles, EPs et albums (pas les DJ sets ou videos)
        // Et trier par date (du plus récent au plus ancien)
        const filteredReleases = data
          .filter((track: Track) => ['single', 'ep', 'album', 'remix'].includes(track.type))
          .sort((a: Track, b: Track) => {
            const dateA = new Date(a.releaseDate);
            const dateB = new Date(b.releaseDate);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, count); // Limiter au nombre demandé

        if (!isMounted) return;

        setReleases(filteredReleases);
        setError(null);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError' || !isMounted) return;
        logger.error('Erreur:', err);
        if (isMounted) {
          setError('Impossible de charger les dernières sorties');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Démarrer le fetch immédiatement, même si isFirstSection
    fetchTracks();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [count]);

  // Fonction pour gérer le clic sur une carte
  const handleCardClick = (trackId: string) => {
    router.push(`/music?play=${trackId}`);
  };

  // Fonction pour gérer l'erreur de chargement d'une image
  const handleImageError = (trackId: string) => {
    setImageErrors((prevErrors) => ({ ...prevErrors, [trackId]: true }));
  };

  // Si en chargement, afficher un loader
  if (isLoading) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-audiowide text-center mb-12 text-gradient-animated"
          >
            {title}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-modern rounded-lg overflow-hidden shadow-xl animate-pulse"
              >
                <div className="aspect-square bg-gradient-to-r from-purple-900/30 to-blue-900/30" />
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-700/50 rounded w-3/4" />
                  <div className="h-4 bg-gray-700/30 rounded w-1/2" />
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gray-700/30 rounded" />
                    <div className="w-8 h-8 bg-gray-700/30 rounded" />
                    <div className="w-8 h-8 bg-gray-700/30 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si erreur, afficher un message
  if (error) {
    return (
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-audiowide text-center mb-12 text-gradient-animated"
          >
            {title}
          </motion.h2>
          <div className="flex justify-center items-center min-h-[200px]">
            <p className="text-red-400 glass-modern px-6 py-3 rounded-lg">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Injection des keyframes CSS pour l'animation du glow */}
      <style jsx global>
        {glowAnimation}
      </style>

      <section className="py-20 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-900/10 to-black">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-blue-900/20 animate-gradient-pulse" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.h2
            initial={isFirstSection ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            animate={isFirstSection ? { opacity: 1, y: 0 } : undefined}
            whileInView={isFirstSection ? undefined : { opacity: 1, y: 0 }}
            viewport={isFirstSection ? undefined : { once: true }}
            className="text-4xl md:text-5xl font-audiowide text-center mb-12 text-gradient-animated"
          >
            {title}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {releases.map((release, index) => (
              <motion.div
                key={release.id}
                initial={isFirstSection ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={isFirstSection ? { opacity: 1, y: 0 } : undefined}
                whileInView={isFirstSection ? undefined : { opacity: 1, y: 0 }}
                viewport={isFirstSection ? undefined : { once: true }}
                transition={{ delay: isFirstSection ? 0 : index * 0.1 }}
                onClick={() => handleCardClick(release.id)}
                className="relative lift-3d"
              >
                {/* Card with Golden Glow Effect */}
                <div
                  className="cursor-pointer golden-border rounded-lg overflow-hidden shadow-xl transform-gpu transition-all duration-500 hover:scale-[1.05] group focus-within:outline-2 focus-within:outline-purple-500 focus-within:outline-offset-2"
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir les détails de ${release.title} par ${release.artist}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCardClick(release.id);
                    }
                  }}
                >
                  <div className="relative aspect-square overflow-hidden">
                    {release.imageId && !imageErrors[release.id] ? (
                      <Image
                        src={getImageUrl(release.imageId) || ''}
                        alt={`Pochette de ${release.title} par ${release.artist}`}
                        fill
                        className="object-cover object-center rounded-lg shadow-lg transition-opacity duration-300"
                        priority={index < 3}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        onError={() => handleImageError(release.id)}
                        onLoad={() => setImageErrors((prev) => ({ ...prev, [release.id]: false }))}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center rounded-lg shadow-lg">
                        {(imageErrors[release.id] || !release.imageId) && (
                          <Music className="w-16 h-16 text-gray-600" />
                        )}
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-50 hover:opacity-30 transition-opacity duration-500" />

                    {/* Badge */}
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-purple-600/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full transform transition-all duration-500 hover:-translate-y-1 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50">
                        {release.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 relative">
                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 text-white hover:text-purple-300 transition-colors duration-300">
                      {release.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-4">
                      <span>{release.artist}</span>
                      <span>•</span>
                      <span>
                        {new Date(release.releaseDate).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </div>

                    {/* Icons */}
                    <div className="flex gap-4">
                      {release.platforms.spotify?.url && (
                        <a
                          href={release.platforms.spotify.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-300 hover:text-green-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Écouter ${release.title} sur Spotify`}
                        >
                          <FaSpotify />
                        </a>
                      )}
                      {release.platforms.apple?.url && (
                        <a
                          href={release.platforms.apple.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-300 hover:text-pink-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Écouter ${release.title} sur Apple Music`}
                        >
                          <FaApple />
                        </a>
                      )}
                      {release.platforms.soundcloud?.url && (
                        <a
                          href={release.platforms.soundcloud.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-300 hover:text-orange-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Écouter ${release.title} sur SoundCloud`}
                        >
                          <FaSoundcloud />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
