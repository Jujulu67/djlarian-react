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
  Search,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
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
import ReactDOM from 'react-dom';
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
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [fusionModal, setFusionModal] = useState<{
    family: { signature: string; groups: GroupedImage[] };
  } | null>(null);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [isLoadingFusion, setIsLoadingFusion] = useState(false);

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
    setIsGrouping(true);
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

    // 4. Détection des doublons d'originale (même taille d'ori)
    const groupList = Object.values(groups);
    const oriMap: Record<string, GroupedImage[]> = {};
    groupList.forEach((group) => {
      if (!group.ori) return;
      const oriSig = `${group.ori.size}`;
      if (!oriMap[oriSig]) oriMap[oriSig] = [];
      oriMap[oriSig].push(group);
    });
    const duplicateOriSignatures = Object.entries(oriMap)
      .filter(([_, groups]) => groups.length > 1)
      .map(([signature]) => signature);
    groupList.forEach((group) => {
      if (!group.ori) return;
      const oriSig = `${group.ori.size}`;
      const isDuplicate = duplicateOriSignatures.includes(oriSig);
      if (group.ori) group.ori.isDuplicate = isDuplicate;
      if (group.crop) group.crop.isDuplicate = isDuplicate;
    });
    setGroupedImages(groupList);
    // Synchroniser le state images pour le filtre doublons
    setImages((prevImages) =>
      prevImages.map((img) => {
        const found = groupList.find(
          (g) => (g.crop && g.crop.id === img.id) || (g.ori && g.ori.id === img.id)
        );
        if (!found) return img;
        const isDuplicate =
          (found.crop && found.crop.id === img.id && found.crop.isDuplicate) ||
          (found.ori && found.ori.id === img.id && found.ori.isDuplicate) ||
          false;
        return { ...img, isDuplicate };
      })
    );
    setIsGrouping(false);
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
      // Détection des doublons par nom de base
      const nameMap: Record<string, number> = {};
      formattedImages.forEach((img: ImageMeta) => {
        const baseName = extractImageId(img.name);
        nameMap[baseName] = (nameMap[baseName] || 0) + 1;
      });
      const imagesWithDuplicates = formattedImages.map((img: ImageMeta) => {
        const baseName = extractImageId(img.name);
        return { ...img, isDuplicate: nameMap[baseName] > 1 };
      });
      setImages(imagesWithDuplicates);
      // Appeler le regroupement et mapping
      groupAndLinkImages(imagesWithDuplicates);
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

    // DEBUG LOGS
    console.log('[DEBUG] Filtrage images:', {
      total: images.length,
      doublons: images.filter((img) => img.isDuplicate).length,
      showDuplicates,
      searchTerm,
      filter,
    });

    // Filtrer par type
    if (filter) {
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

    console.log(
      '[DEBUG] Images après filtrage:',
      result.length,
      result.map((i) => i.name)
    );
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
  const getSortedGroups = (groups: GroupedImage[]) => {
    const sorted = [...groups];
    if (showDuplicates) {
      // Tri par signature d'originale (taille), puis par nom
      sorted.sort((a, b) => {
        const aSig = a.ori?.size || 0;
        const bSig = b.ori?.size || 0;
        if (aSig !== bSig) return bSig - aSig; // du plus gros au plus petit
        return (a.crop?.name || a.ori?.name || '').localeCompare(b.crop?.name || b.ori?.name || '');
      });
      return sorted;
    }
    // Tri normal sinon
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

  // Filtrage des groupes selon showDuplicates
  const filteredGroups = useMemo(() => {
    let result = groupedImages;
    if (showDuplicates) {
      result = result.filter(
        (group) => (group.crop && group.crop.isDuplicate) || (group.ori && group.ori.isDuplicate)
      );
    }
    // (Optionnel: autres filtres à ajouter ici)
    return result;
  }, [groupedImages, showDuplicates]);

  // Pagination + cache trié
  const paginatedGroups = useMemo(() => {
    const sorted = getSortedGroups(filteredGroups);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sorted.slice(start, end);
  }, [filteredGroups, getSortedGroups, currentPage, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(getSortedGroups(filteredGroups).length / itemsPerPage),
    [getSortedGroups, filteredGroups, itemsPerPage]
  );

  // Regroupement des familles de doublons (par taille d'ori)
  const doublonFamilies = useMemo(() => {
    if (!showDuplicates) return [];
    const map: Record<string, GroupedImage[]> = {};
    filteredGroups.forEach((group) => {
      const oriSig = group.ori?.size ? `${group.ori.size}` : 'noori';
      if (!map[oriSig]) map[oriSig] = [];
      map[oriSig].push(group);
    });
    // On ne garde que les familles avec au moins 2 groupes (vrais doublons)
    return Object.entries(map)
      .filter(([_, groups]) => groups.length > 1)
      .map(([signature, groups]) => ({ signature, groups }));
  }, [filteredGroups, showDuplicates]);

  // 2. COMPOSANT DRY POUR LA BARRE DE FILTRES
  const FiltersBar = () => {
    // Filtrer les types qui ne sont pas "Autre"
    const filteredTypes = [
      ...Array.from(new Set(images.map((img) => img.type))).filter((type) => type !== 'Autre'),
    ];

    return (
      <div className="mb-6 flex flex-wrap items-center bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-4 shadow-md">
        <div className="w-full flex items-center gap-3 mb-3 justify-between">
          <div className="relative flex-grow w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/80 border-gray-700 focus:border-purple-500"
              aria-label="Rechercher une image"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {filteredTypes.length > 0 && (
              <div className="flex items-center gap-2 min-w-[120px]">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  options={filteredTypes.map((type) => ({ value: type, label: type }))}
                  className="w-full"
                  aria-label="Filtrer par type"
                />
              </div>
            )}
            <div className="flex items-center gap-2 min-w-[160px]">
              <SlidersHorizontal className="h-4 w-4 text-gray-400" />
              <Select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                options={[
                  { value: 'date-desc', label: 'Plus récent' },
                  { value: 'date-asc', label: 'Plus ancien' },
                  { value: 'name-asc', label: 'Nom A-Z' },
                  { value: 'name-desc', label: 'Nom Z-A' },
                  { value: 'size-asc', label: 'Taille croissante' },
                  { value: 'size-desc', label: 'Taille décroissante' },
                  { value: 'type', label: 'Type' },
                  { value: 'linked', label: 'Liées en premier' },
                ]}
                className="w-full"
                aria-label="Trier les images"
              />
            </div>
          </div>
        </div>

        <div className="w-full flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={showDuplicates}
              onCheckedChange={(checked) => {
                setShowDuplicates(checked);
                console.log('[DEBUG] Checkbox Doublons changé:', checked);
              }}
              label="Doublons"
              aria-label="Afficher uniquement les doublons"
            />

            <div className="flex items-center gap-2 min-w-[160px]">
              <Select
                value={String(itemsPerPage)}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                options={[
                  { value: '25', label: '25 par page' },
                  { value: '50', label: '50 par page' },
                  { value: '100', label: '100 par page' },
                ]}
                className="w-full"
                aria-label="Nombre d'images par page"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {/* Bouton Sélection multiple : affiché seulement si le filtre doublons n'est PAS actif */}
            {!showDuplicates && (
              <Button
                variant={isMultiSelectMode ? 'secondary' : 'default'}
                size="sm"
                onClick={() => {
                  setIsMultiSelectMode((v) => !v);
                  setSelectedImageIds([]);
                }}
                aria-pressed={isMultiSelectMode}
                aria-label="Activer le mode sélection multiple"
                className={`whitespace-nowrap min-w-[140px] px-4 py-2 transition-all duration-200 ${
                  isMultiSelectMode
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white'
                }`}
              >
                {isMultiSelectMode ? '✓ Mode sélection' : '+ Sélection multiple'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilter('');
                setSortOption('date-desc');
                setShowDuplicates(false);
                setItemsPerPage(25);
                setCurrentPage(1);
              }}
              aria-label="Réinitialiser les filtres"
              className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white border-gray-600 hover:border-gray-500 px-4 py-2"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 3. BARRE D'ACTION GROUPEE POUR LA SUPPRESSION MULTIPLE VIA PORTAL
  const MultiSelectBarPortal = ({
    isMultiSelectMode,
    selectedImageIds,
    paginatedGroups,
    setSelectedImageIds,
    setDeleteTarget,
  }: {
    isMultiSelectMode: boolean;
    selectedImageIds: string[];
    paginatedGroups: GroupedImage[];
    setSelectedImageIds: (ids: string[]) => void;
    setDeleteTarget: (img: any) => void;
  }) => {
    if (typeof window === 'undefined') return null;
    return ReactDOM.createPortal(
      <div
        className={`
          fixed bottom-4 left-1/2 transform -translate-x-1/2
          z-[9999] max-w-2xl w-[calc(100vw-2rem)] px-0
          transition-all duration-300
          ${isMultiSelectMode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
        `}
        role="dialog"
        aria-label="Barre de sélection multiple"
      >
        <div
          className="
          bg-gray-900/90
          backdrop-blur-lg
          border border-purple-500/40
          ring-2 ring-purple-400/20
          rounded-2xl
          px-8 py-5
          flex items-center gap-4
          shadow-3xl
          transition-all duration-300
          hover:-translate-y-1
        "
        >
          <div className="flex items-center flex-grow">
            <Checkbox
              checked={
                selectedImageIds.length === paginatedGroups.filter((g) => g.crop || g.ori).length &&
                paginatedGroups.length > 0
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedImageIds(paginatedGroups.map((g) => (g.crop?.id || g.ori?.id)!));
                } else {
                  setSelectedImageIds([]);
                }
              }}
              label="Tout sélectionner"
              labelClassName="text-gray-200 text-sm"
              aria-label="Tout sélectionner"
            />

            <div className="ml-auto bg-gray-800/70 px-4 py-1.5 rounded-lg text-gray-100 text-sm font-medium">
              {selectedImageIds.length} sélectionné(s)
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            disabled={selectedImageIds.length === 0}
            onClick={() =>
              setDeleteTarget({
                id: 'multi',
                name: `${selectedImageIds.length} images`,
                url: '',
                size: 0,
                date: '',
                type: '',
                linkedTo: null,
                isDuplicate: false,
              })
            }
            aria-label="Supprimer la sélection"
            className="whitespace-nowrap"
          >
            Supprimer la sélection
          </Button>
        </div>
      </div>,
      document.body
    );
  };

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
      {/* Barre de sélection multiple sticky en bas overlay via Portal */}
      <MultiSelectBarPortal
        isMultiSelectMode={isMultiSelectMode}
        selectedImageIds={selectedImageIds}
        paginatedGroups={paginatedGroups}
        setSelectedImageIds={setSelectedImageIds}
        setDeleteTarget={setDeleteTarget}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          {error}
        </div>
      )}
      <FiltersBar />
      {isLoading || isGrouping ? (
        <div className="flex justify-center items-center h-64">
          <ClipLoader size={40} color="#9042f5" />
        </div>
      ) : showDuplicates ? (
        doublonFamilies.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Aucun doublon détecté.</div>
        ) : (
          <>
            {doublonFamilies.map((family) => (
              <div
                key={family.signature}
                className="mb-8 p-4 rounded-xl border-2 border-yellow-400 bg-yellow-50/10"
              >
                <div className="mb-4 font-bold text-yellow-400 flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Doublons potentiels (taille originale :{' '}
                    {(Number(family.signature) / 1024).toFixed(1)} Ko)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFusionModal({ family })}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Fusionner
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {family.groups.map((group) => {
                    const image = group.crop || group.ori;
                    if (!image) return null;
                    const isSelected = selectedImageIds.includes(image.id);
                    return (
                      <div
                        key={group.imageId}
                        className={`relative overflow-hidden flex flex-col rounded-xl shadow-lg transition-all duration-200 group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${
                          isMultiSelectMode && isSelected
                            ? 'ring-2 ring-purple-500 border border-purple-500/40'
                            : 'border border-gray-800'
                        }`}
                        onClick={(e) => {
                          if (isMultiSelectMode) {
                            // Sélectionner/désélectionner l'image
                            if (isSelected) {
                              setSelectedImageIds(selectedImageIds.filter((id) => id !== image.id));
                            } else {
                              setSelectedImageIds([...selectedImageIds, image.id]);
                            }
                            return;
                          }
                          if ((e.target as HTMLElement).closest('button, a, [role="button"]'))
                            return;
                          setSelectedGroup(group);
                        }}
                        tabIndex={0}
                        aria-label={`Voir le détail de l'image ${image.name}`}
                        onKeyDown={(e) => {
                          if (isMultiSelectMode) {
                            if (e.key === ' ' || e.key === 'Enter') {
                              if (isSelected) {
                                setSelectedImageIds(
                                  selectedImageIds.filter((id) => id !== image.id)
                                );
                              } else {
                                setSelectedImageIds([...selectedImageIds, image.id]);
                              }
                              e.preventDefault();
                            }
                            return;
                          }
                          if (e.key === 'Enter' || e.key === ' ') setSelectedGroup(group);
                        }}
                        style={{
                          background:
                            'linear-gradient(to bottom right, rgba(30, 30, 40, 0.8), rgba(20, 20, 25, 0.9))',
                        }}
                      >
                        {isMultiSelectMode && (
                          <div className="absolute top-3 left-3 z-20">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (!checked) {
                                  setSelectedImageIds(
                                    selectedImageIds.filter((id) => id !== image.id)
                                  );
                                } else {
                                  setSelectedImageIds([...selectedImageIds, image.id]);
                                }
                              }}
                              className="bg-gray-900/80 border-gray-600"
                              aria-label={`Sélectionner l'image ${image.name}`}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="relative h-44 bg-gray-800/60 flex items-center justify-center overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
                          />
                          {group.ori && group.crop && (
                            <Badge
                              variant="default"
                              className="absolute top-2 right-2 gap-1"
                              icon={<ImageIcon className="w-3 h-3" />}
                            >
                              Crop + Ori
                            </Badge>
                          )}
                          {!group.crop && group.ori && (
                            <Badge variant="secondary" className="absolute top-2 right-2">
                              Originale seule
                            </Badge>
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
                            {image.type !== 'Autre' && (
                              <Badge
                                variant={
                                  image.type === 'Couverture'
                                    ? 'default'
                                    : image.type === 'Événement'
                                      ? 'secondary'
                                      : 'ghost'
                                }
                                size="sm"
                              >
                                {image.type}
                              </Badge>
                            )}
                            <span className="text-purple-300 font-mono text-xs">
                              {(image.size / 1024).toFixed(1)} Ko
                            </span>
                          </div>
                          {group.linkedTo && (
                            <div className="mt-2 w-full">
                              <span
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm w-full ${
                                  group.linkedTo.type === 'track'
                                    ? 'bg-purple-700/30 text-purple-200'
                                    : 'bg-blue-700/30 text-blue-200'
                                } whitespace-nowrap overflow-hidden transition-colors duration-200 hover:bg-opacity-50`}
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
                        <div className="flex flex-row gap-1 justify-center items-center py-3 px-2 bg-gray-900/40">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(image!);
                            }}
                            className="hover:bg-purple-900/30 rounded-lg"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-900/30 rounded-lg"
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
              </div>
            ))}
          </>
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {paginatedGroups.map((group) => {
              const image = group.crop || group.ori;
              if (!image) return null;
              const isSelected = selectedImageIds.includes(image.id);
              return (
                <div
                  key={group.imageId}
                  className={`relative overflow-hidden flex flex-col rounded-xl shadow-lg transition-all duration-200 group hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${
                    isMultiSelectMode && isSelected
                      ? 'ring-2 ring-purple-500 border border-purple-500/40'
                      : 'border border-gray-800'
                  }`}
                  onClick={(e) => {
                    if (isMultiSelectMode) {
                      // Sélectionner/désélectionner l'image
                      if (isSelected) {
                        setSelectedImageIds(selectedImageIds.filter((id) => id !== image.id));
                      } else {
                        setSelectedImageIds([...selectedImageIds, image.id]);
                      }
                      return;
                    }
                    if ((e.target as HTMLElement).closest('button, a, [role="button"]')) return;
                    setSelectedGroup(group);
                  }}
                  tabIndex={0}
                  aria-label={`Voir le détail de l'image ${image.name}`}
                  onKeyDown={(e) => {
                    if (isMultiSelectMode) {
                      if (e.key === ' ' || e.key === 'Enter') {
                        if (isSelected) {
                          setSelectedImageIds(selectedImageIds.filter((id) => id !== image.id));
                        } else {
                          setSelectedImageIds([...selectedImageIds, image.id]);
                        }
                        e.preventDefault();
                      }
                      return;
                    }
                    if (e.key === 'Enter' || e.key === ' ') setSelectedGroup(group);
                  }}
                  style={{
                    background:
                      'linear-gradient(to bottom right, rgba(30, 30, 40, 0.8), rgba(20, 20, 25, 0.9))',
                  }}
                >
                  {isMultiSelectMode && (
                    <div className="absolute top-3 left-3 z-20">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            setSelectedImageIds(selectedImageIds.filter((id) => id !== image.id));
                          } else {
                            setSelectedImageIds([...selectedImageIds, image.id]);
                          }
                        }}
                        className="bg-gray-900/80 border-gray-600"
                        aria-label={`Sélectionner l'image ${image.name}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div className="relative h-44 bg-gray-800/60 flex items-center justify-center overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-all duration-300 group-hover:scale-110"
                    />
                    {group.ori && group.crop && (
                      <Badge
                        variant="default"
                        className="absolute top-2 right-2 gap-1"
                        icon={<ImageIcon className="w-3 h-3" />}
                      >
                        Crop + Ori
                      </Badge>
                    )}
                    {!group.crop && group.ori && (
                      <Badge variant="secondary" className="absolute top-2 right-2">
                        Originale seule
                      </Badge>
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
                      {image.type !== 'Autre' && (
                        <Badge
                          variant={
                            image.type === 'Couverture'
                              ? 'default'
                              : image.type === 'Événement'
                                ? 'secondary'
                                : 'ghost'
                          }
                          size="sm"
                        >
                          {image.type}
                        </Badge>
                      )}
                      <span className="text-purple-300 font-mono text-xs">
                        {(image.size / 1024).toFixed(1)} Ko
                      </span>
                    </div>
                    {group.linkedTo && (
                      <div className="mt-2 w-full">
                        <span
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm w-full ${
                            group.linkedTo.type === 'track'
                              ? 'bg-purple-700/30 text-purple-200'
                              : 'bg-blue-700/30 text-blue-200'
                          } whitespace-nowrap overflow-hidden transition-colors duration-200 hover:bg-opacity-50`}
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
                  <div className="flex flex-row gap-1 justify-center items-center py-3 px-2 bg-gray-900/40">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image!);
                      }}
                      className="hover:bg-purple-900/30 rounded-lg"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-900/30 rounded-lg"
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
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="justify-center"
            />
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
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-6">
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
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg w-full max-w-xl justify-center transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 ${
                        linked.type === 'track'
                          ? 'bg-purple-700/30 text-purple-200 hover:bg-purple-700/60 hover:text-white hover:scale-[1.02] focus:ring-purple-400'
                          : 'bg-blue-700/30 text-blue-200 hover:bg-blue-700/60 hover:text-white hover:scale-[1.02] focus:ring-blue-400'
                      }`}
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
          bgClass="bg-black/95 backdrop-blur-sm"
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
          bgClass="bg-gradient-to-br from-gray-900 to-gray-850 backdrop-blur-sm"
          borderClass="border-red-500/30"
          onClose={() => setDeleteTarget(null)}
        >
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="text-center text-white text-lg font-semibold mb-2">
              {deleteTarget.id === 'multi' ? (
                <>
                  Êtes-vous sûr de vouloir supprimer{' '}
                  <span className="text-red-300">{selectedImageIds.length} images</span> ?
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir supprimer{' '}
                  <span className="text-red-300">{deleteTarget.name}</span> ?
                </>
              )}
            </div>
            <div className="text-gray-400 text-sm mb-4">
              Cette action ne peut pas être annulée. Cela supprimera définitivement{' '}
              {deleteTarget.id === 'multi' ? 'les images sélectionnées' : "l'image"}.
            </div>
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="border-gray-700 hover:bg-gray-800"
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deleteTarget.id === 'multi') {
                    setError(null);
                    let errorCount = 0;
                    for (const id of selectedImageIds) {
                      try {
                        await deleteImage(id);
                      } catch {
                        errorCount++;
                      }
                    }
                    setSelectedImageIds([]);
                    setIsMultiSelectMode(false);
                    setDeleteTarget(null);
                    setTimeout(() => {
                      if (paginatedGroups.length === 1 && currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                      }
                    }, 100);
                    if (errorCount > 0)
                      setError(`${errorCount} image(s) n'ont pas pu être supprimées.`);
                    else setToast('Images supprimées avec succès');
                  } else {
                    await deleteImage(deleteTarget.id);
                    setDeleteTarget(null);
                    setTimeout(() => {
                      if (paginatedGroups.length === 1 && currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                      }
                    }, 100);
                  }
                }}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modale de fusion MVP */}
      {fusionModal && (
        <Modal
          maxWidth="max-w-3xl"
          onClose={() => {
            setFusionModal(null);
            setSelectedMasterId(null);
            setIgnoredIds([]);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="font-bold text-lg text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Fusionner les doublons (taille originale :{' '}
              {(Number(fusionModal.family.signature) / 1024).toFixed(1)} Ko)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {fusionModal.family.groups.map((group) => {
                const image = group.crop || group.ori;
                if (!image) return null;
                const isIgnored = ignoredIds.includes(image.id);
                const isMaster = selectedMasterId === image.id;
                return (
                  <div
                    key={group.imageId}
                    className={`flex flex-col items-center border rounded-lg p-4 bg-gray-900/60 transition-all duration-200 relative ${
                      isMaster ? 'ring-2 ring-purple-500 bg-purple-900/30' : 'border-gray-700'
                    } ${isIgnored ? 'opacity-50 grayscale' : ''}`}
                    tabIndex={-1}
                    aria-label={`Carte image ${image.name}`}
                  >
                    {/* Zone haute : sélection maître */}
                    <div
                      className={`w-full flex flex-col items-center cursor-pointer ${isIgnored ? 'pointer-events-none' : ''}`}
                      onClick={() => {
                        if (!isIgnored) setSelectedMasterId(image.id);
                      }}
                      onKeyDown={(e) => {
                        if (!isIgnored && (e.key === 'Enter' || e.key === ' ')) {
                          setSelectedMasterId(image.id);
                          e.preventDefault();
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Sélectionner comme maître ${image.name}`}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <div className="text-xs text-gray-300 mb-1">{image.name}</div>
                      <div className="text-purple-300 font-mono text-xs mb-1">
                        {(image.size / 1024).toFixed(1)} Ko
                      </div>
                      {group.linkedTo ? (
                        <div className="text-xs text-blue-400 mb-1">
                          Lié à : {group.linkedTo.title} ({group.linkedTo.type})
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mb-1">Aucun lien</div>
                      )}
                      {isMaster && !isIgnored && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded shadow">
                          Maître
                        </div>
                      )}
                    </div>
                    {/* Zone basse : checkbox Ignorer, toujours interactive */}
                    <div className="mt-3 flex justify-center w-full">
                      <Checkbox
                        checked={isIgnored}
                        onCheckedChange={(checked) => {
                          console.log('[DEBUG] Checkbox Ignorer changée', {
                            imageId: image.id,
                            checked,
                            prevIgnoredIds: ignoredIds,
                            callStack: new Error().stack,
                          });
                          setIgnoredIds((prev) => {
                            let next;
                            if (checked) {
                              next = Array.from(new Set([...prev, image.id]));
                            } else {
                              next = prev.filter((id) => id !== image.id);
                            }
                            console.log('[DEBUG] Nouvel état ignoredIds', next);
                            return next;
                          });
                          if (checked && selectedMasterId === image.id) setSelectedMasterId(null);
                        }}
                        label="Ignorer"
                        className="text-xs"
                        onClick={() => {
                          console.log('[DEBUG] Checkbox onClick déclenché', { imageId: image.id });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* TODO: Résumé des actions, bouton Confirmer */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFusionModal(null);
                  setSelectedMasterId(null);
                  setIgnoredIds([]);
                }}
              >
                Annuler
              </Button>
              <Button
                variant="outline"
                className="bg-purple-600 text-white hover:bg-purple-700"
                disabled={
                  !selectedMasterId || ignoredIds.includes(selectedMasterId) || isLoadingFusion
                }
                onClick={async () => {
                  setIsLoadingFusion(true);
                  setError(null);
                  try {
                    // 1. Déterminer la carte maître
                    const masterGroup = fusionModal.family.groups.find(
                      (g) => (g.crop?.id || g.ori?.id) === selectedMasterId
                    );
                    if (!masterGroup) throw new Error('Carte maître introuvable');
                    const masterImage = masterGroup.crop || masterGroup.ori;
                    // 2. Déterminer les images ignorées
                    const ignoredSet = new Set(ignoredIds);
                    // 3. Déterminer les images à supprimer (tous les ids crop et ori sauf maître et ignorés)
                    const protectedIds = [
                      ...(masterGroup.crop ? [masterGroup.crop.id] : []),
                      ...(masterGroup.ori ? [masterGroup.ori.id] : []),
                      ...fusionModal.family.groups
                        .filter((g) => {
                          const id = g.crop?.id || g.ori?.id;
                          return id && ignoredSet.has(id);
                        })
                        .flatMap((g) => [g.crop?.id, g.ori?.id].filter(Boolean)),
                    ];
                    const toDelete = fusionModal.family.groups
                      .flatMap((g) => [g.crop?.id, g.ori?.id])
                      .filter((id): id is string => !!id && !protectedIds.includes(id));
                    // LOGS DEBUG FUSION
                    console.log('[FUSION] masterGroup', masterGroup);
                    console.log('[FUSION] masterIds utilisés pour update', protectedIds);
                    console.log('[FUSION] ignoredIds', ignoredIds);
                    console.log('[FUSION] toDelete (ids supprimés)', toDelete);
                    // 4. Mettre à jour les entités liées (hors ignorées)
                    const extractBaseId = (id: string) => id.replace(/\.[a-zA-Z0-9]+$/, '');
                    for (const group of fusionModal.family.groups) {
                      const imageId = group.crop?.id || group.ori?.id;
                      if (!imageId || protectedIds.includes(imageId)) continue;
                      if (group.linkedTo) {
                        // On veut pointer vers le crop du maître si possible, sinon ori, SANS extension
                        const newImageId = masterGroup.crop
                          ? extractBaseId(masterGroup.crop.id)
                          : masterGroup.ori
                            ? extractBaseId(masterGroup.ori.id)
                            : undefined;
                        console.log(
                          '[FUSION] PATCH entity',
                          group.linkedTo,
                          '-> imageId',
                          newImageId
                        );
                        const endpoint =
                          group.linkedTo.type === 'track'
                            ? `/api/music/${group.linkedTo.id}`
                            : `/api/events/${group.linkedTo.id}`;
                        await fetch(endpoint, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ imageId: newImageId }),
                        });
                      }
                    }
                    // 5. Supprimer les images à supprimer
                    for (const id of toDelete) {
                      await deleteImage(id);
                    }
                    // LOGS DEBUG POST-SUPPRESSION
                    const imagesAfter = await (async () => {
                      const response = await fetch('/api/images');
                      if (!response.ok) return [];
                      const data = await response.json();
                      return data.images;
                    })();
                    console.log(
                      '[FUSION] Images restantes après suppression',
                      imagesAfter.map((img: any) => img.id)
                    );
                    setToast('Fusion réussie !');
                    setFusionModal(null);
                    setSelectedMasterId(null);
                    setIgnoredIds([]);
                    await fetchImages();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError('Erreur lors de la fusion : ' + message);
                  } finally {
                    setIsLoadingFusion(false);
                  }
                }}
              >
                {isLoadingFusion ? 'Fusion en cours...' : 'Confirmer la fusion'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
