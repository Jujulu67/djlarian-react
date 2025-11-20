'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FaSpotify, FaApple, FaSoundcloud } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Track } from '@/lib/utils/types';
import { Loader } from 'lucide-react';
import { Music } from 'lucide-react';
import { logger } from '@/lib/logger';

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
        const data = await response.json();

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
      <section className="py-20 bg-black/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12"
          >
            {title}
          </motion.h2>
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader className="w-10 h-10 text-purple-500 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  // Si erreur, afficher un message
  if (error) {
    return (
      <section className="py-20 bg-black/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12"
          >
            {title}
          </motion.h2>
          <div className="flex justify-center items-center min-h-[200px]">
            <p className="text-red-400">{error}</p>
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

      <section className="py-20 bg-black/50 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-center mb-12"
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
                className="relative"
              >
                {/* Carte principale avec contour doré via box-shadow */}
                <div className="cursor-pointer golden-border rounded-lg overflow-hidden shadow-xl transform-gpu transition-all duration-500 hover:scale-[1.05]">
                  <div className="relative aspect-square">
                    {release.imageId && !imageErrors[release.id] ? (
                      <Image
                        src={`/uploads/${release.imageId}.jpg`}
                        alt={`Pochette de ${release.title} par ${release.artist}`}
                        fill
                        className="object-cover object-center rounded-lg shadow-lg"
                        priority={index < 3}
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

                    {/* Overlay léger */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-50 hover:opacity-30 transition-opacity duration-500" />

                    {/* Badge type qui s'élève au survol */}
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-purple-600/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full transform transition-all duration-500 hover:-translate-y-1 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/50">
                        {release.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 relative">
                    {/* Texte qui change légèrement de couleur au survol */}
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

                    {/* Icônes qui se soulèvent et s'illuminent au survol */}
                    <div className="flex gap-4">
                      {release.platforms.spotify?.url && (
                        <a
                          href={release.platforms.spotify.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-green-500 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1"
                          onClick={(e) => e.stopPropagation()} // Empêcher le déclenchement du onClick parent
                        >
                          <FaSpotify />
                        </a>
                      )}
                      {release.platforms.apple?.url && (
                        <a
                          href={release.platforms.apple.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-pink-500 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1"
                          onClick={(e) => e.stopPropagation()} // Empêcher le déclenchement du onClick parent
                        >
                          <FaApple />
                        </a>
                      )}
                      {release.platforms.soundcloud?.url && (
                        <a
                          href={release.platforms.soundcloud.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-400 hover:text-orange-500 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1"
                          onClick={(e) => e.stopPropagation()} // Empêcher le déclenchement du onClick parent
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
