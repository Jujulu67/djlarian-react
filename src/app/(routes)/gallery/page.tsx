'use client';

import { motion } from 'framer-motion';
import { Images, Instagram, Layers, Play, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { PageHeader } from '@/components/ui/PageHeader';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useUiVersion } from '@/hooks/useUiVersion';
import { cn } from '@/lib/utils/cn';
import { GalleryItem, InstagramPost } from '@/lib/utils/types';

const galleryItems: GalleryItem[] = [
  {
    id: '1',
    title: 'Electric Dreams Festival 2024',
    imageUrl: '/images/gallery/electric-dreams-1.jpg',
    type: 'image',
    date: '2024-03-15',
    description: 'Performance live au Electric Dreams Festival',
  },
  {
    id: '2',
    title: 'Studio Session',
    imageUrl: '/images/gallery/studio-session.jpg',
    type: 'video',
    date: '2024-02-20',
    description: 'Session de production en studio',
  },
  {
    id: '3',
    title: 'Club Nexus Night',
    imageUrl: '/images/gallery/club-nexus.jpg',
    type: 'image',
    date: '2024-01-15',
    description: 'Une nuit mémorable au Club Nexus',
  },
  {
    id: '4',
    title: 'Behind the Scenes',
    imageUrl: '/images/gallery/behind-scenes.jpg',
    type: 'video',
    date: '2024-01-10',
    description: 'Préparation avant le show',
  },
];

type TabType = 'gallery' | 'instagram';
type FilterType = 'all' | 'images' | 'videos';

/** Accessibilité clavier des cartes cliquables (Entrée / Espace) */
function onActivateKey(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
}

const formatInstagramDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const truncateCaption = (caption: string | undefined, maxLength = 100) => {
  if (!caption) return '';
  if (caption.length <= maxLength) return caption;
  return caption.substring(0, maxLength) + '...';
};

// ============================================================================
// UI V2
// ============================================================================

function chipClass(active: boolean) {
  return cn(
    'rounded-full px-4 py-2 text-sm font-medium transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] v3:rounded-md',
    active
      ? 'bg-white text-zinc-950 v3:bg-white'
      : 'bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10 hover:text-white'
  );
}

/** Tuile média : image arrondie, zoom doux au survol et voile dégradé en bas */
const TILE_CLASS =
  'group relative block aspect-square w-full overflow-hidden rounded-xl bg-white/[0.03] text-left transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] after:pointer-events-none after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-inset after:ring-white/[0.08]';
const TILE_IMAGE_CLASS =
  'h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]';
const TILE_VEIL = (
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
);
const PLAY_BADGE = (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
      <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
    </span>
  </div>
);

function EmptyStateV2({ title, description }: { title: string; description: string }) {
  return (
    <div className="surface-1 mx-auto flex max-w-md flex-col items-center rounded-2xl px-6 py-12 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
        <Instagram className="h-6 w-6 text-white/70" aria-hidden="true" />
      </span>
      <p className="mb-1 font-medium text-white">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}

function LightboxV2({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="surface-3 relative w-full max-w-4xl rounded-2xl p-3 md:p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          autoFocus
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/80 ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:text-white md:right-6 md:top-6"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black/40">
          {item.type === 'video' ? (
            <video src={item.imageUrl} controls className="h-full w-full object-cover" />
          ) : (
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={1200}
              height={675}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="px-2 pb-2 pt-4 text-center md:pt-5">
          <h2 className="text-display mb-2 text-xl text-white md:text-2xl">{item.title}</h2>
          <p className="text-white/60">{item.description}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface GalleryV2Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  filteredItems: GalleryItem[];
  instagramPosts: InstagramPost[];
  isLoadingInstagram: boolean;
  selectedItem: GalleryItem | InstagramPost | null;
  setSelectedItem: (item: GalleryItem | null) => void;
}

function GalleryV2({
  activeTab,
  setActiveTab,
  filter,
  setFilter,
  filteredItems,
  instagramPosts,
  isLoadingInstagram,
  selectedItem,
  setSelectedItem,
}: GalleryV2Props) {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'gallery', label: 'Galerie' },
    { id: 'instagram', label: 'Instagram' },
  ];
  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tout' },
    { id: 'images', label: 'Photos' },
    { id: 'videos', label: 'Vidéos' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-16 md:py-24">
      <div className="mx-auto max-w-[1180px]">
        <PageHeader
          eyebrow="Galerie"
          title="Galerie"
          description="Découvrez les moments forts de mes performances et sessions en studio."
        />

        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 md:mb-10">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Source">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={chipClass(activeTab === tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'gallery' && (
            <>
              <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type">
                {filters.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={filter === option.id}
                    onClick={() => setFilter(option.id)}
                    className={chipClass(filter === option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {activeTab === 'gallery' &&
          (filteredItems.length === 0 ? (
            <div className="surface-1 mx-auto flex max-w-md flex-col items-center rounded-2xl px-6 py-12 text-center">
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
                <Images className="h-6 w-6 text-white/70" aria-hidden="true" />
              </span>
              <p className="text-white/60">Aucun média dans cette catégorie.</p>
            </div>
          ) : (
            <RevealGroup
              key={filter}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
            >
              {filteredItems.map((item) => (
                <RevealItem key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    aria-label={`${item.title} : ouvrir l'aperçu`}
                    className={TILE_CLASS}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={800}
                      height={800}
                      className={TILE_IMAGE_CLASS}
                    />
                    {TILE_VEIL}
                    {item.type === 'video' && PLAY_BADGE}
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      <h3 className="mb-1 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="text-sm text-white/70">{item.description}</p>
                    </div>
                  </button>
                </RevealItem>
              ))}
            </RevealGroup>
          ))}

        {activeTab === 'instagram' &&
          (isLoadingInstagram ? (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
              aria-busy="true"
              aria-label="Chargement des posts Instagram"
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : instagramPosts.length === 0 ? (
            <EmptyStateV2
              title="Aucun post Instagram disponible"
              description="Les posts Instagram seront affichés ici une fois configurés."
            />
          ) : (
            <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {instagramPosts.map((post) => (
                <RevealItem key={post.id}>
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Voir le post Instagram du ${formatInstagramDate(post.timestamp)}`}
                    className={TILE_CLASS}
                  >
                    <Image
                      src={
                        post.mediaType === 'VIDEO'
                          ? post.thumbnailUrl || post.mediaUrl
                          : post.mediaUrl
                      }
                      alt={post.caption || 'Post Instagram'}
                      width={800}
                      height={800}
                      className={TILE_IMAGE_CLASS}
                    />
                    {TILE_VEIL}
                    {post.mediaType === 'VIDEO' && PLAY_BADGE}
                    <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between">
                      {post.mediaType === 'CAROUSEL_ALBUM' ? (
                        <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white/90 backdrop-blur-md">
                          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                          Carousel
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md">
                        <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      {post.caption && (
                        <p className="mb-2 line-clamp-2 text-sm text-white/85">
                          {truncateCaption(post.caption)}
                        </p>
                      )}
                      <p className="text-xs text-white/50">{formatInstagramDate(post.timestamp)}</p>
                    </div>
                  </a>
                </RevealItem>
              ))}
            </RevealGroup>
          ))}

        {selectedItem && 'title' in selectedItem && (
          <LightboxV2 item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | InstagramPost | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('gallery');
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [isLoadingInstagram, setIsLoadingInstagram] = useState(false);

  // Fetch Instagram posts
  useEffect(() => {
    if (activeTab === 'instagram') {
      setIsLoadingInstagram(true);
      fetch('/api/instagram/posts')
        .then((res) => res.json())
        .then((data) => {
          if (data.posts) {
            setInstagramPosts(data.posts);
          }
        })
        .catch((error) => {
          console.error('Error fetching Instagram posts:', error);
        })
        .finally(() => {
          setIsLoadingInstagram(false);
        });
    }
  }, [activeTab]);

  const filteredItems = galleryItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'images') return item.type === 'image';
    if (filter === 'videos') return item.type === 'video';
    return true;
  });

  const isV2 = useUiVersion() !== 'legacy';
  if (isV2) {
    return (
      <GalleryV2
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filter={filter}
        setFilter={setFilter}
        filteredItems={filteredItems}
        instagramPosts={instagramPosts}
        isLoadingInstagram={isLoadingInstagram}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-audiowide mb-6">Galerie</h1>
          <p className="text-xl text-gray-300 font-montserrat max-w-2xl mx-auto">
            Découvrez les moments forts de mes performances et sessions en studio.
          </p>
        </motion.div>

        {/* Onglets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex justify-center gap-4 mb-8"
        >
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              activeTab === 'gallery'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Galerie
          </button>
          <button
            onClick={() => setActiveTab('instagram')}
            className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
              activeTab === 'instagram'
                ? 'bg-purple-600 text-white'
                : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            Instagram
          </button>
        </motion.div>

        {/* Filtres (uniquement pour la galerie) */}
        {activeTab === 'gallery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center gap-4 mb-12"
          >
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilter('images')}
              className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
                filter === 'images'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
              }`}
            >
              Photos
            </button>
            <button
              onClick={() => setFilter('videos')}
              className={`px-6 py-2 rounded-full font-montserrat transition-colors duration-200 ${
                filter === 'videos'
                  ? 'bg-purple-600 text-white'
                  : 'bg-transparent border border-purple-600 text-purple-400 hover:bg-purple-600/10'
              }`}
            >
              Vidéos
            </button>
          </motion.div>
        )}

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative cursor-pointer"
                onClick={() => setSelectedItem(item)}
                onKeyDown={onActivateKey(() => setSelectedItem(item))}
                role="button"
                tabIndex={0}
                aria-label={item.title}
              >
                <div className="aspect-square overflow-hidden rounded-lg glass-modern">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover"
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-30">
                      <h3 className="text-xl font-audiowide mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-300">{item.description}</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'instagram' && (
          <>
            {isLoadingInstagram ? (
              <div className="flex justify-center items-center py-24">
                <div className="text-purple-400 font-montserrat">
                  Chargement des posts Instagram...
                </div>
              </div>
            ) : instagramPosts.length === 0 ? (
              <div className="flex justify-center items-center py-24">
                <div className="text-gray-400 font-montserrat text-center">
                  <p className="mb-2">Aucun post Instagram disponible</p>
                  <p className="text-sm">
                    Les posts Instagram seront affichés ici une fois configurés.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {instagramPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="group relative cursor-pointer"
                    onClick={() => window.open(post.permalink, '_blank')}
                    onKeyDown={onActivateKey(() => window.open(post.permalink, '_blank'))}
                    role="link"
                    tabIndex={0}
                  >
                    <div className="aspect-square overflow-hidden rounded-lg glass-modern">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
                        {/* Badge Instagram */}
                        <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 rounded-full flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                          <span className="text-white text-xs font-montserrat font-semibold">
                            Instagram
                          </span>
                        </div>
                        {/* Image ou vidéo */}
                        {post.mediaType === 'VIDEO' ? (
                          <>
                            <Image
                              src={post.thumbnailUrl || post.mediaUrl}
                              alt={post.caption || 'Post Instagram'}
                              width={800}
                              height={800}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-8 w-8 text-white"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          </>
                        ) : (
                          <Image
                            src={post.mediaUrl}
                            alt={post.caption || 'Post Instagram'}
                            width={800}
                            height={800}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Badge carousel */}
                        {post.mediaType === 'CAROUSEL_ALBUM' && (
                          <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-1 rounded flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                              <path
                                fillRule="evenodd"
                                d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-white text-xs font-montserrat">Carousel</span>
                          </div>
                        )}
                        {/* Caption et date */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 z-30">
                          {post.caption && (
                            <p className="text-sm text-gray-200 mb-2 line-clamp-2">
                              {truncateCaption(post.caption)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {formatInstagramDate(post.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal pour l'aperçu (uniquement pour la galerie) */}
        {selectedItem && 'title' in selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div className="max-w-4xl w-full">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                {selectedItem.type === 'video' ? (
                  <video
                    src={selectedItem.imageUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title}
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-2xl font-audiowide mb-2">{selectedItem.title}</h3>
                <p className="text-gray-300">{selectedItem.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
