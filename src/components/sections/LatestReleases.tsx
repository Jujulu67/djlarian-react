'use client';

import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import { Music } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSpotify, FaApple, FaSoundcloud } from 'react-icons/fa';

import { logger } from '@/lib/logger';
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
}

export default function LatestReleases({
  title = 'Latest Releases',
  count = 3,
}: LatestReleasesProps) {
  const [releases, setReleases] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<ImageErrorState>({}); // Initialiser l'état des erreurs d'image
  const router = useRouter();

  // Charger les morceaux depuis l'API
  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/music');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des morceaux');
        }
        const result = await response.json();
        // La réponse API utilise createSuccessResponse qui retourne { data: [...] }
        const data = result.data || [];

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

        setReleases(filteredReleases);
        setError(null);
      } catch (err) {
        logger.error('Erreur:', err);
        setError('Impossible de charger les dernières sorties');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
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
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader className="w-10 h-10 text-purple-500 animate-spin glow-purple" />
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-audiowide text-center mb-12 text-gradient-animated"
          >
            {title}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {releases.map((release, index) => (
              <motion.div
                key={release.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleCardClick(release.id)}
                className="relative lift-3d"
              >
                {/* Modern Glassmorphism Card */}
                <div className="cursor-pointer glass-modern glass-modern-hover rounded-2xl overflow-hidden shadow-2xl group">
                  <div className="relative aspect-square overflow-hidden">
                    {release.imageId && !imageErrors[release.id] ? (
                      <Image
                        src={`/uploads/${release.imageId}.jpg`}
                        alt={`Pochette de ${release.title} par ${release.artist}`}
                        fill
                        className="object-cover object-center transition-transform duration-700 group-hover:scale-110"
                        priority={index < 3}
                        onError={() => handleImageError(release.id)}
                        onLoad={() => setImageErrors((prev) => ({ ...prev, [release.id]: false }))}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-purple-900/40 flex items-center justify-center animate-gradient-pulse">
                        {(imageErrors[release.id] || !release.imageId) && (
                          <Music className="w-16 h-16 text-gray-500" />
                        )}
                      </div>
                    )}

                    {/* Animated Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70 group-hover:opacity-50 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 via-transparent to-blue-600/0 group-hover:from-purple-600/20 group-hover:to-blue-600/20 transition-all duration-500" />

                    {/* Enhanced Badge */}
                    <div className="absolute top-4 left-4 z-20">
                      <span className="glass-modern px-3 py-1.5 text-white text-xs font-semibold rounded-full backdrop-blur-md border border-white/20 glow-purple group-hover:animate-glow-pulse">
                        {release.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 relative glass-modern border-t border-white/10">
                    {/* Enhanced Title */}
                    <h3 className="text-xl font-bold mb-2 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 transition-all duration-300">
                      {release.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-300 mb-4 text-sm">
                      <span>{release.artist}</span>
                      <span>•</span>
                      <span>
                        {new Date(release.releaseDate).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </div>

                    {/* Enhanced Icons with 3D effect */}
                    <div className="flex gap-4">
                      {release.platforms.spotify?.url && (
                        <a
                          href={release.platforms.spotify.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-green-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-2 hover:rotate-3 micro-bounce"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaSpotify />
                        </a>
                      )}
                      {release.platforms.apple?.url && (
                        <a
                          href={release.platforms.apple.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-pink-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-2 hover:-rotate-3 micro-bounce"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaApple />
                        </a>
                      )}
                      {release.platforms.soundcloud?.url && (
                        <a
                          href={release.platforms.soundcloud.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-orange-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-2 hover:rotate-3 micro-bounce"
                          onClick={(e) => e.stopPropagation()}
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
