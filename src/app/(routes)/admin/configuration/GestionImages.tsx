'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Eye,
  Download,
  Trash2,
  RefreshCcw,
  Image as ImageIcon,
  AlertTriangle,
  Music,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import { ImageMeta } from '@/app/api/admin/images/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// Utiliser un spinner temporaire en attendant l'installation du package
// import { ClipLoader } from 'react-spinners';

// Composant de spinner simple en attendant l'installation du package react-spinners
const ClipLoader = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <div
    className="animate-spin rounded-full border-t-2 border-b-2 border-purple-500"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderColor: color,
    }}
  ></div>
);

interface GestionImagesProps {
  showHeader?: boolean;
  showBackLink?: boolean;
  isFullPage?: boolean;
}

type LinkedTo = { type: 'track' | 'event'; id: string; title: string } | null;

type GroupedImage = {
  imageId: string;
  crop: ImageMeta | null;
  ori: ImageMeta | null;
  linkedTo: LinkedTo;
};

export default function GestionImages({
  showHeader = true,
  showBackLink = true,
  isFullPage = false,
}: GestionImagesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageMeta[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupedImage | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDuplicates, setShowDuplicates] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [groupedImages, setGroupedImages] = useState<GroupedImage[]>([]);
  const [sortOption, setSortOption] = useState<
    | 'date-desc'
    | 'date-asc'
    | 'name-asc'
    | 'name-desc'
    | 'size-asc'
    | 'size-desc'
    | 'type'
    | 'linked'
  >('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [deleteTarget, setDeleteTarget] = useState<ImageMeta | null>(null);
  const [showOriginalFull, setShowOriginalFull] = useState(false);

  // Charger les images depuis l'API au chargement du composant
  useEffect(() => {
    fetchImages();
  }, []);

  // Effet pour effacer automatiquement les notifications toast après 3 secondes
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fonction utilitaire pour extraire l'identifiant de base d'une image
  const extractImageId = (name: string): string => {
    // Ex: cover1.jpg, cover1-ori.jpg, cover1-ori.png
    return name.replace(/-ori(\.[a-zA-Z0-9]+)?$/, '').replace(/\.[a-zA-Z0-9]+$/, '');
  };

  // Fonction pour regrouper crop/ori et faire le mapping des liaisons
  const groupAndLinkImages = useCallback(async (images: ImageMeta[]) => {
    // 1. Récupérer tracks et events
    const [tracksRes, eventsRes] = await Promise.all([fetch('/api/music'), fetch('/api/events')]);
    const tracksData = await tracksRes.json();
    const eventsData = await eventsRes.json();
    const tracks = Array.isArray(tracksData.tracks) ? tracksData.tracks : tracksData;
    const events = Array.isArray(eventsData.events) ? eventsData.events : eventsData;

    // 2. Regrouper les images crop/ori
    const groups: Record<string, GroupedImage> = {};
    images.forEach((img) => {
      const baseId = extractImageId(img.name);
      const isOri = /-ori\.[a-zA-Z0-9]+$/.test(img.name);
      if (!groups[baseId]) {
        groups[baseId] = { imageId: baseId, crop: null, ori: null, linkedTo: null };
      }
      if (isOri) {
        groups[baseId].ori = img;
      } else {
        groups[baseId].crop = img;
      }
    });

    // 3. Mapping des liaisons
    Object.values(groups).forEach((group) => {
      // Chercher dans tracks
      const track = tracks.find((t: any) => t.imageId === group.imageId);
      if (track) {
        group.linkedTo = { type: 'track', id: track.id, title: track.title };
        return;
      }
      // Chercher dans events
      const event = events.find((e: any) => e.imageId === group.imageId);
      if (event) {
        group.linkedTo = { type: 'event', id: event.id, title: event.title };
      }
    });

    setGroupedImages(Object.values(groups));
  }, []);

  // Adapter le fetchImages pour utiliser le regroupement
  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des images: ${response.status}`);
      }
      const data = await response.json();
      const formattedImages = data.images.map((img: any) => ({
        id: img.id,
        url: img.path,
        name: img.name,
        size: img.size,
        date: img.lastModified,
        type: img.type,
        linkedTo: null,
        isDuplicate: false,
      }));
      setImages(formattedImages);
      // Appeler le regroupement et mapping
      groupAndLinkImages(formattedImages);
    } catch (err) {
      console.error('Erreur de chargement des images:', err);
      setError('Impossible de charger les images. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de rafraîchissement des images
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchImages();
    setIsRefreshing(false);
  };

  // Fonction pour supprimer une image
  const deleteImage = async (id: string) => {
    setError(null);

    try {
      // Récupérer le nom du fichier à partir de l'image
      const imageToDelete = images.find((img) => img.id === id);
      if (!imageToDelete) {
        throw new Error('Image non trouvée');
      }

      const response = await fetch(
        `/api/images?filename=${encodeURIComponent(imageToDelete.name)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur lors de la suppression: ${response.status}`);
      }

      // Supprimer l'image de l'état local
      setImages(images.filter((img) => img.id !== id));
      setGroupedImages(
        groupedImages.filter((group) => group.crop?.id !== id && group.ori?.id !== id)
      );
      setFilteredImages(filteredImages.filter((img) => img.id !== id));

      // Afficher un message de succès
      setToast('Image supprimée avec succès');
    } catch (err: any) {
      console.error('Erreur de suppression:', err);
      setError(err.message || "Impossible de supprimer l'image. Veuillez réessayer.");
    }
  };

  // Filtrer les images en fonction du terme de recherche et du type sélectionné
  useEffect(() => {
    let result = images;

    // Filtrer par type
    if (filter !== 'all') {
      result = result.filter((img) => img.type.toLowerCase() === filter.toLowerCase());
    }

    // Filtrer par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((img) => img.name.toLowerCase().includes(term));
    }

    // Filtrer les doublons si demandé
    if (showDuplicates) {
      result = result.filter((img) => img.isDuplicate);
    }

    setFilteredImages(result);
  }, [images, searchTerm, filter, showDuplicates]);

  // Obtenir les types uniques des images pour le filtre
  const uniqueTypes = ['all', ...Array.from(new Set(images.map((img) => img.type)))];

  // Téléchargement de l'image
  const handleDownload = (image: ImageMeta) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGoToLinked = (group: GroupedImage) => {
    if (!group.linkedTo) return;
    if (group.linkedTo.type === 'track') {
      window.open(`/admin/music/${group.linkedTo.id}/detail`, '_blank');
    } else if (group.linkedTo.type === 'event') {
      window.open(`/admin/events/${group.linkedTo.id}`, '_blank');
    }
  };

  // Fonction de tri
  const getSortedGroups = () => {
    const sorted = [...groupedImages];
    switch (sortOption) {
      case 'date-desc':
        sorted.sort((a, b) => {
          const dA = a.crop?.date || a.ori?.date || '';
          const dB = b.crop?.date || b.ori?.date || '';
          return new Date(dB).getTime() - new Date(dA).getTime();
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          const dA = a.crop?.date || a.ori?.date || '';
          const dB = b.crop?.date || b.ori?.date || '';
          return new Date(dA).getTime() - new Date(dB).getTime();
        });
        break;
      case 'name-asc':
        sorted.sort((a, b) =>
          (a.crop?.name || a.ori?.name || '').localeCompare(b.crop?.name || b.ori?.name || '')
        );
        break;
      case 'name-desc':
        sorted.sort((a, b) =>
          (b.crop?.name || b.ori?.name || '').localeCompare(a.crop?.name || a.ori?.name || '')
        );
        break;
      case 'size-asc':
        sorted.sort(
          (a, b) => (a.crop?.size || a.ori?.size || 0) - (b.crop?.size || b.ori?.size || 0)
        );
        break;
      case 'size-desc':
        sorted.sort(
          (a, b) => (b.crop?.size || b.ori?.size || 0) - (a.crop?.size || a.ori?.size || 0)
        );
        break;
      case 'type':
        sorted.sort((a, b) =>
          (a.crop?.type || a.ori?.type || '').localeCompare(b.crop?.type || b.ori?.type || '')
        );
        break;
      case 'linked':
        sorted.sort((a, b) => {
          if (a.linkedTo && !b.linkedTo) return -1;
          if (!a.linkedTo && b.linkedTo) return 1;
          return 0;
        });
        break;
    }
    return sorted;
  };

  // Pagination + cache trié
  const paginatedGroups = useMemo(() => {
    const sorted = getSortedGroups();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sorted.slice(start, end);
  }, [getSortedGroups, currentPage, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(getSortedGroups().length / itemsPerPage),
    [getSortedGroups, itemsPerPage]
  );

  return (
    <div className="w-full">
      {showHeader && (
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackLink && (
              <Link
                href="/admin/configuration"
                className="text-purple-400 hover:text-purple-300 flex items-center"
              >
                <ImageIcon className="w-6 h-6 mr-2" /> Retour config
              </Link>
            )}
            <h1 className="text-3xl font-audiowide text-white flex items-center gap-3">
              <ImageIcon className="w-8 h-8 text-purple-400" /> Gestion des images uploadées
            </h1>
          </div>
          <Button onClick={handleRefresh} className="gap-2" disabled={isRefreshing}>
            {isRefreshing ? (
              <ClipLoader size={16} color="#fff" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg border border-purple-500/30 animate-fade-in">
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          {error}
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={uniqueTypes.map((type) => ({ value: type, label: type }))}
          className="w-32"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-purple-500"
        >
          <option value="date-desc">Plus récent</option>
          <option value="date-asc">Plus ancien</option>
          <option value="name-asc">Nom A-Z</option>
          <option value="name-desc">Nom Z-A</option>
          <option value="size-asc">Taille croissante</option>
          <option value="size-desc">Taille décroissante</option>
          <option value="type">Type</option>
          <option value="linked">Liées en premier</option>
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showDuplicates}
            onChange={(e) => setShowDuplicates(e.target.checked)}
            className="rounded bg-transparent border-gray-600"
          />
          Doublons
        </label>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="bg-gray-800 border border-gray-700 text-gray-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-purple-500"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <ClipLoader size={40} color="#9042f5" />
        </div>
      ) : getSortedGroups().length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {searchTerm || filter !== 'all' || showDuplicates
            ? 'Aucune image ne correspond aux critères de recherche.'
            : "Aucune image n'est disponible."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {paginatedGroups.map((group) => {
              const image = group.crop || group.ori;
              if (!image) return null;
              return (
                <div
                  key={group.imageId}
                  className="relative border border-gray-800 rounded-xl overflow-hidden flex flex-col bg-gradient-to-br from-gray-900/70 to-gray-800/80 shadow-lg transition-transform hover:scale-[1.025] hover:shadow-purple-900/30 group cursor-pointer"
                  onClick={(e) => {
                    // Ne pas ouvrir la modale si clic sur un bouton d'action
                    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
                    setSelectedGroup(group);
                  }}
                  tabIndex={0}
                  aria-label={`Voir le détail de l'image ${image.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedGroup(group);
                  }}
                >
                  <div className="relative h-44 bg-gray-800 flex items-center justify-center">
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-all group-hover:scale-105"
                    />
                    {group.ori && group.crop && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-purple-600/80 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
                        <ImageIcon className="w-3 h-3 mr-1" /> Crop + Ori
                      </div>
                    )}
                    {!group.crop && group.ori && (
                      <div className="absolute top-2 right-2 bg-blue-500/80 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
                        Originale seule
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <h3
                      className="font-semibold truncate text-gray-100 text-base mb-1"
                      title={image.name}
                    >
                      {image.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center text-xs mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${image.type === 'Couverture' ? 'bg-purple-700/30 text-purple-200' : image.type === 'Événement' ? 'bg-blue-700/30 text-blue-200' : 'bg-gray-700/30 text-gray-200'}`}
                      >
                        {image.type}
                      </span>
                      <span className="text-gray-400">{(image.size / 1024).toFixed(1)} Ko</span>
                    </div>
                    {group.linkedTo && (
                      <div className="mt-2 w-full">
                        <span
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm w-full bg-${group.linkedTo.type === 'track' ? 'purple' : 'blue'}-700/30 text-${group.linkedTo.type === 'track' ? 'purple' : 'blue'}-200 whitespace-nowrap overflow-hidden`}
                          title={group.linkedTo.title}
                          style={{ minHeight: '2.5rem' }}
                        >
                          {group.linkedTo.type === 'track' ? (
                            <Music className="w-5 h-5 flex-shrink-0" />
                          ) : (
                            <Calendar className="w-5 h-5 flex-shrink-0" />
                          )}
                          <span className="truncate">{group.linkedTo.title}</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row gap-3 justify-center items-center py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image!);
                      }}
                      className="hover:bg-purple-900/30"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-900/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(image);
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-purple-800/40 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Page précédente"
            >
              &lt;
            </button>
            <span className="text-gray-300 text-sm">
              Page {currentPage} / {totalPages}
            </span>
            <button
              className="px-3 py-1 rounded bg-gray-800 text-gray-300 hover:bg-purple-800/40 disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Page suivante"
            >
              &gt;
            </button>
          </div>
        </>
      )}
      {selectedGroup && (
        <Modal
          maxWidth="max-w-5xl"
          showLoader={false}
          bgClass="bg-gradient-to-br from-gray-900 to-gray-800"
          borderClass="border-purple-500/30"
          onClose={() => setSelectedGroup(null)}
        >
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-row gap-8 w-full justify-center mb-6">
              {/* Crop */}
              {selectedGroup.crop && (
                <div className="flex flex-col items-center w-full max-w-[400px]">
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: '1 / 1', maxWidth: 400, height: 'auto' }}
                  >
                    <img
                      src={selectedGroup.crop.url}
                      alt={selectedGroup.crop.name}
                      className="absolute inset-0 w-full h-full rounded-lg object-cover border-2 border-purple-700 shadow-lg"
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded-lg px-3 py-1 opacity-90 group-hover:opacity-100 transition-all z-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(selectedGroup.crop!)}
                        aria-label="Télécharger Crop"
                        className="text-purple-300 hover:bg-purple-900/40"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-purple-300 font-semibold mt-2">Crop</div>
                  <div className="text-xs text-purple-200 mt-1">
                    {(selectedGroup.crop.size / 1024).toFixed(1)} Ko
                  </div>
                </div>
              )}
              {/* Originale */}
              {selectedGroup.ori && (
                <div className="flex flex-col items-center w-full max-w-[400px]">
                  <div
                    className="relative w-full flex items-center justify-center"
                    style={{ aspectRatio: '1 / 1', maxWidth: 400, height: 'auto' }}
                  >
                    <img
                      src={selectedGroup.ori.url}
                      alt={selectedGroup.ori.name}
                      className="rounded-lg object-contain border-2 border-blue-700 shadow-lg cursor-zoom-in mx-auto"
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        height: '100%',
                        width: 'auto',
                        display: 'block',
                      }}
                      onClick={() => setShowOriginalFull(true)}
                      tabIndex={0}
                      aria-label="Afficher l'originale en grand"
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded-lg px-3 py-1 opacity-90 group-hover:opacity-100 transition-all z-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(selectedGroup.ori!)}
                        aria-label="Télécharger Originale"
                        className="text-blue-300 hover:bg-blue-900/40"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-blue-300 font-semibold mt-2">Originale</div>
                  <div className="text-xs text-blue-200 mt-1">
                    {(selectedGroup.ori.size / 1024).toFixed(1)} Ko
                  </div>
                </div>
              )}
            </div>
            {/* Infos détaillées sous les images */}
            <div className="w-full flex flex-col items-center mb-6">
              <div className="flex flex-row gap-8 w-full max-w-2xl justify-center">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-white font-mono text-base truncate text-center"
                    title={selectedGroup.crop?.name || selectedGroup.ori?.name}
                  >
                    {selectedGroup.crop?.name || selectedGroup.ori?.name}
                  </div>
                  <div className="text-gray-400 text-xs text-center mt-1">
                    {selectedGroup.crop
                      ? new Date(selectedGroup.crop.date).toLocaleString()
                      : selectedGroup.ori
                        ? new Date(selectedGroup.ori.date).toLocaleString()
                        : ''}
                  </div>
                </div>
              </div>
            </div>
            {/* Badge de liaison */}
            {selectedGroup.linkedTo &&
              (() => {
                const linked = selectedGroup.linkedTo;
                return (
                  <div className="w-full flex flex-col items-center mb-6 gap-3">
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Voir la page liée à ${linked.title}`}
                      onClick={() => {
                        if (linked.type === 'track') {
                          window.open(`/admin/music?edit=${linked.id}`, '_blank');
                        } else {
                          window.open(`/admin/events/${linked.id}`, '_blank');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (linked.type === 'track') {
                            window.open(`/admin/music?edit=${linked.id}`, '_blank');
                          } else {
                            window.open(`/admin/events/${linked.id}`, '_blank');
                          }
                        }
                      }}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg w-full max-w-xl justify-center transition-colors duration-150 cursor-pointer outline-none focus:outline-none focus:ring-2 ${linked.type === 'track' ? 'bg-purple-700/30 text-purple-200 hover:bg-purple-700/60 hover:text-white focus:ring-purple-400' : 'bg-blue-700/30 text-blue-200 hover:bg-blue-700/60 hover:text-white focus:ring-blue-400'}`}
                      style={{ minHeight: '3rem' }}
                      title={linked.title}
                    >
                      {linked.type === 'track' ? (
                        <Music className="w-6 h-6 flex-shrink-0" />
                      ) : (
                        <Calendar className="w-6 h-6 flex-shrink-0" />
                      )}
                      <span className="truncate">{linked.title}</span>
                    </span>
                  </div>
                );
              })()}
          </div>
        </Modal>
      )}
      {/* Modale d'affichage de l'originale en grand */}
      {showOriginalFull && selectedGroup?.ori && (
        <Modal
          maxWidth="max-w-none"
          bgClass="bg-black/90"
          borderClass="border-none"
          zClass="z-[10000]"
          onClose={() => setShowOriginalFull(false)}
          fullscreenContent
        >
          <div className="w-screen h-screen flex items-center justify-center p-0 m-0">
            <img
              src={selectedGroup.ori.url}
              alt={selectedGroup.ori.name}
              className="max-w-full max-h-full object-contain"
              style={{ display: 'block' }}
              aria-label="Image originale en grand"
            />
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          maxWidth="max-w-md"
          bgClass="bg-gradient-to-br from-gray-900 to-gray-800"
          borderClass="border-red-500/30"
          onClose={() => setDeleteTarget(null)}
        >
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="text-center text-white text-lg font-semibold mb-2">
              Êtes-vous sûr de vouloir supprimer&nbsp;
              <span className="text-red-300">{deleteTarget.name}</span> ?
            </div>
            <div className="text-gray-400 text-sm mb-4">
              Cette action ne peut pas être annulée. Cela supprimera définitivement l'image.
            </div>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteImage(deleteTarget.id);
                  setDeleteTarget(null);
                  setTimeout(() => {
                    if (paginatedGroups.length === 1 && currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                    }
                  }, 100);
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
