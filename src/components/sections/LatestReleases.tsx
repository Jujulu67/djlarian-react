'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Loader } from 'lucide-react';
import { Music } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSpotify, FaApple, FaSoundcloud } from 'react-icons/fa';

import { SectionHeading } from '@/components/ui/PageHeader';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useSpotlight } from '@/hooks/useSpotlight';
import { useUiVersion } from '@/hooks/useUiVersion';
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

const BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';

/* -------------------------------------------------------------------------- */
/* UI v2                                                                      */
/* -------------------------------------------------------------------------- */

const V2_SECTION = 'relative py-16 md:py-24';
const V2_CONTAINER = 'mx-auto max-w-[1180px] px-4';
const V2_GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3';

function ReleasesHeadingV2({ title }: { title: string }) {
  return (
    <SectionHeading eyebrow="Dernières sorties" title={title}>
      <Link
        href="/music"
        className="group/link hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/60 transition-colors duration-300 hover:text-white sm:inline-flex"
      >
        View all
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </SectionHeading>
  );
}

const V2_PLATFORM_LINK =
  'rounded-md p-1 text-xl text-white/50 transition-colors duration-300 hover:text-white';

function ReleaseCardV2({
  release,
  index,
  hasLongTitle,
  imageFailed,
  onOpen,
  onImageError,
  onImageLoad,
}: {
  release: Track;
  index: number;
  hasLongTitle: boolean;
  imageFailed: boolean;
  onOpen: () => void;
  onImageError: () => void;
  onImageLoad: () => void;
}) {
  const spotlight = useSpotlight<HTMLDivElement>();

  return (
    <div
      {...spotlight}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${release.title} by ${release.artist}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="surface-1 spotlight group flex h-full cursor-pointer flex-col rounded-2xl p-3 transition-[transform,border-color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/15 active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.04]">
        {release.imageId && !imageFailed ? (
          <Image
            src={getImageUrl(release.imageId) || ''}
            alt={`Cover for ${release.title} by ${release.artist}`}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            priority={index < 3}
            loading={index < 3 ? 'eager' : 'lazy'}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            onError={onImageError}
            onLoad={onImageLoad}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music className="h-12 w-12 text-white/20" aria-hidden="true" />
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-inset ring-white/15 backdrop-blur-md">
          {release.type}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <h3
          className={`line-clamp-2 text-lg font-semibold leading-snug text-white ${
            hasLongTitle ? 'min-h-[3.1rem]' : ''
          }`}
        >
          {release.title}
        </h3>
        <p className="mt-1 text-sm text-white/60">
          {release.artist}
          <span className="mx-1.5 text-white/30" aria-hidden="true">
            •
          </span>
          {new Date(release.releaseDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          })}
        </p>

        <div className="mt-auto flex min-h-[2.5rem] items-center gap-2 pt-3">
          {release.platforms.spotify?.url && (
            <a
              href={release.platforms.spotify.url}
              target="_blank"
              rel="noopener noreferrer"
              className={V2_PLATFORM_LINK}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Listen to ${release.title} on Spotify`}
            >
              <FaSpotify />
            </a>
          )}
          {release.platforms.apple?.url && (
            <a
              href={release.platforms.apple.url}
              target="_blank"
              rel="noopener noreferrer"
              className={V2_PLATFORM_LINK}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Listen to ${release.title} on Apple Music`}
            >
              <FaApple />
            </a>
          )}
          {release.platforms.soundcloud?.url && (
            <a
              href={release.platforms.soundcloud.url}
              target="_blank"
              rel="noopener noreferrer"
              className={V2_PLATFORM_LINK}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Listen to ${release.title} on SoundCloud`}
            >
              <FaSoundcloud />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ReleasesSkeletonV2({ title }: { title: string }) {
  return (
    <section className={V2_SECTION}>
      <div className={V2_CONTAINER}>
        <ReleasesHeadingV2 title={title} />
        <div className={V2_GRID} aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface-1 rounded-2xl p-3">
              <div className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
              <div className="space-y-3 px-2 pb-2 pt-4">
                <div className="h-5 w-3/4 animate-pulse rounded-md bg-white/[0.04]" />
                <div className="h-4 w-1/2 animate-pulse rounded-md bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReleasesMessageV2({ title, message }: { title: string; message: string }) {
  return (
    <section className={V2_SECTION}>
      <div className={V2_CONTAINER}>
        <ReleasesHeadingV2 title={title} />
        <div className="surface-1 mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
            <AlertTriangle className="h-5 w-5 text-white/60" aria-hidden="true" />
          </span>
          <p className="text-sm text-white/70">{message}</p>
        </div>
      </div>
    </section>
  );
}

// Props pour le composant LatestReleases
export interface LatestReleasesProps {
  title?: string;
  count?: number;
  isFirstSection?: boolean; // Indique si c'est la première section après le hero
  initialReleases?: Track[]; // Données préchargées côté serveur
}

export default function LatestReleases({
  title = 'Latest Releases',
  count = 3,
  isFirstSection = false,
  initialReleases,
}: LatestReleasesProps) {
  const [releases, setReleases] = useState<Track[]>(initialReleases || []);
  const [isLoading, setIsLoading] = useState(!initialReleases);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<ImageErrorState>({}); // Initialiser l'état des erreurs d'image
  const router = useRouter();
  const isV2 = useUiVersion() === 'v2';

  // Charger les morceaux depuis l'API seulement si initialReleases n'est pas fourni
  useEffect(() => {
    // Si on a déjà des données initiales, ne pas faire de fetch
    if (initialReleases && initialReleases.length > 0) {
      return;
    }

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
          throw new Error('Error fetching tracks');
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
          setError('Unable to load latest releases');
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
  }, [count, initialReleases]);

  // Fonction pour gérer le clic sur une carte
  const handleCardClick = (trackId: string) => {
    router.push(`/music?play=${trackId}`);
  };

  // Fonction pour gérer l'erreur de chargement d'une image
  const handleImageError = (trackId: string) => {
    setImageErrors((prevErrors) => ({ ...prevErrors, [trackId]: true }));
  };

  // Si en chargement, afficher un loader
  if (isLoading && isV2) return <ReleasesSkeletonV2 title={title} />;
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
  if (error && isV2) return <ReleasesMessageV2 title={title} message={error} />;
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

  // Calculer dynamiquement si on a besoin de l'espace pour 2 lignes
  // En se basant sur une longueur moyenne de titre > 32 caractères
  const hasLongTitle = releases.some((r) => r.title.length > 32);

  if (isV2) {
    if (releases.length === 0) {
      return <ReleasesMessageV2 title={title} message="No releases yet. Check back soon." />;
    }

    return (
      <section className={V2_SECTION}>
        <div className={V2_CONTAINER}>
          <ReleasesHeadingV2 title={title} />
          <RevealGroup className={V2_GRID}>
            {releases.map((release, index) => (
              <RevealItem key={release.id} className="h-full">
                <ReleaseCardV2
                  release={release}
                  index={index}
                  hasLongTitle={hasLongTitle}
                  imageFailed={Boolean(imageErrors[release.id])}
                  onOpen={() => handleCardClick(release.id)}
                  onImageError={() => handleImageError(release.id)}
                  onImageLoad={() => setImageErrors((prev) => ({ ...prev, [release.id]: false }))}
                />
              </RevealItem>
            ))}
          </RevealGroup>
          <div className="mt-8 flex justify-center sm:hidden">
            <Link
              href="/music"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Injection des keyframes CSS pour l'animation du glow */}
      <style dangerouslySetInnerHTML={{ __html: glowAnimation }} />

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
                className="relative lift-3d h-full"
              >
                {/* Card with Golden Glow Effect */}
                <div
                  className="cursor-pointer golden-border rounded-lg overflow-hidden shadow-xl transform-gpu transition-all duration-500 hover:scale-[1.05] group focus-within:outline-2 focus-within:outline-purple-500 focus-within:outline-offset-2 h-full flex flex-col"
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${release.title} by ${release.artist}`}
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
                        alt={`Cover for ${release.title} by ${release.artist}`}
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

                  <div className="p-6 relative flex flex-col flex-1">
                    {/* Title - Dynamic height: 2 lines space only if needed */}
                    <h3
                      className={`text-xl font-bold mb-2 text-white hover:text-purple-300 transition-colors duration-300 line-clamp-2 flex items-start ${
                        hasLongTitle ? 'min-h-[3.5rem]' : ''
                      }`}
                    >
                      {release.title}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-4">
                      <span>{release.artist}</span>
                      <span>•</span>
                      <span>
                        {new Date(release.releaseDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </div>

                    {/* Icons - Pushed to bottom */}
                    <div className="flex gap-4 mt-auto min-h-[2rem] items-center">
                      {release.platforms.spotify?.url && (
                        <a
                          href={release.platforms.spotify.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-2xl text-gray-300 hover:text-green-400 transition-all duration-300 transform hover:scale-125 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black rounded"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Listen to ${release.title} on Spotify`}
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
                          aria-label={`Listen to ${release.title} on Apple Music`}
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
                          aria-label={`Listen to ${release.title} on SoundCloud`}
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
