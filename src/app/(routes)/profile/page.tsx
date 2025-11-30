'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Calendar,
  Edit,
  Camera,
  Save,
  X,
  Award,
  TrendingUp,
  Settings,
  FolderKanban,
  Loader2,
  Crown,
  Star,
  Rocket,
  Trophy,
  Sparkles,
  Zap,
  Gem,
  Flame,
  Target,
  CheckCircle2,
  Medal,
  BadgeCheck,
  Heart,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import ImageCropModal from '@/components/ui/ImageCropModal';

interface UserStats {
  projects: number;
  projectsEnCours: number;
  projectsTermines: number;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(session?.user?.name || '');
  const [editedEmail, setEditedEmail] = useState(session?.user?.email || '');
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>({
    projects: 0,
    projectsEnCours: 0,
    projectsTermines: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les statistiques utilisateur
  useEffect(() => {
    if (session?.user?.id) {
      loadUserStats();
    }
  }, [session?.user?.id]);

  // Synchroniser les valeurs éditées avec la session
  useEffect(() => {
    if (session?.user) {
      setEditedName(session.user.name || '');
      setEditedEmail(session.user.email || '');
    }
  }, [session?.user]);

  const loadUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetchWithAuth('/api/projects/counts');
      if (response.ok) {
        const data = await response.json();
        const counts = data.data || data;
        setStats({
          projects: counts.total || 0,
          projectsEnCours: counts.statusBreakdown?.EN_COURS || 0,
          projectsTermines: counts.statusBreakdown?.TERMINE || 0,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-modern rounded-2xl p-8 text-center max-w-md"
        >
          <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-audiowide mb-4 text-white">Accès non autorisé</h1>
          <p className="text-gray-400">Veuillez vous connecter pour accéder à votre profil.</p>
        </motion.div>
      </div>
    );
  }

  const userStats = [
    {
      label: 'Projets',
      value: isLoadingStats ? '...' : stats.projects.toString(),
      icon: FolderKanban,
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'En cours',
      value: isLoadingStats ? '...' : stats.projectsEnCours.toString(),
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Terminés',
      value: isLoadingStats ? '...' : stats.projectsTermines.toString(),
      icon: Award,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Membre',
      value: 'Actif',
      icon: User,
      color: 'from-purple-500 to-blue-500',
    },
  ];

  const handleSave = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName || null,
          email: editedEmail,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Mettre à jour la session
        await updateSession({
          ...session,
          user: {
            ...session.user,
            name: updatedUser.name,
            email: updatedUser.email,
          },
        });
        setIsEditing(false);
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(session?.user?.name || '');
    setEditedEmail(session?.user?.email || '');
    setError(null);
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image est trop volumineuse (max 5MB)");
      return;
    }

    // Lire le fichier et ouvrir le modal de crop
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile: File, previewUrl: string) => {
    if (!session?.user?.id) return;

    setShowCropModal(false);
    setIsUploadingAvatar(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', croppedFile);

      const response = await fetchWithAuth('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Ajouter un timestamp pour forcer le rechargement de l'image
        const imageUrlWithCacheBust = `${data.imageUrl}?t=${Date.now()}`;

        // Mettre à jour la session avec la nouvelle image
        await updateSession({
          ...session,
          user: {
            ...session.user,
            image: imageUrlWithCacheBust,
          },
        });

        // Attendre un peu pour que la session soit mise à jour
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Forcer un refresh complet pour mettre à jour toutes les images (profil + header)
        window.location.reload();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de l'upload");
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      console.error("Erreur lors de l'upload:", err);
    } finally {
      setIsUploadingAvatar(false);
      setImageToCrop(null);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetAvatar = async () => {
    if (!session?.user?.id || !session.user.image) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/profile/delete-avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        // Mettre à jour la session pour supprimer l'image
        await updateSession({
          ...session,
          user: {
            ...session.user,
            image: null,
          },
        });

        // Attendre un peu pour que la session soit mise à jour
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Forcer un refresh complet pour mettre à jour toutes les images (profil + header)
        window.location.reload();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Calculer la date d'inscription
  const getMemberSince = () => {
    if (!session?.user) return 'janvier 2024';
    // Si on a une date de création, l'utiliser
    const userWithCreatedAt = session.user as { createdAt?: string | Date };
    const createdAt = userWithCreatedAt.createdAt;
    if (createdAt) {
      const date = new Date(createdAt);
      return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    return 'janvier 2024';
  };

  // Calculer l'ancienneté en mois
  const getMemberMonths = () => {
    if (!session?.user) return 0;
    const userWithCreatedAt = session.user as { createdAt?: string | Date };
    const createdAt = userWithCreatedAt.createdAt;
    if (createdAt) {
      const created = new Date(createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
      return diffMonths;
    }
    return 0;
  };

  // Système de badges basé sur les réalisations
  interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    color: string;
    gradient: string;
    iconColor: string; // Couleur solide pour l'icône
    unlocked: boolean;
  }

  const calculateBadges = (): Badge[] => {
    const memberMonths = getMemberMonths();
    const userWithIsVip = session?.user as { isVip?: boolean };
    const isVip = userWithIsVip?.isVip || false;
    const isAdmin = session?.user?.role === 'ADMIN';

    const badges: Badge[] = [
      // Badge nouveau membre
      {
        id: 'newcomer',
        name: 'Nouveau Membre',
        description: 'Bienvenue dans la communauté !',
        icon: Sparkles,
        color: 'from-blue-400 to-cyan-400',
        gradient: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
        iconColor: 'text-cyan-400',
        unlocked: memberMonths < 1,
      },
      // Badge membre actif (3 mois)
      {
        id: 'active',
        name: 'Membre Actif',
        description: 'Membre depuis 3 mois',
        icon: Heart,
        color: 'from-purple-400 to-pink-400',
        gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
        iconColor: 'text-pink-400',
        unlocked: memberMonths >= 3,
      },
      // Badge membre fidèle (6 mois)
      {
        id: 'loyal',
        name: 'Membre Fidèle',
        description: 'Membre depuis 6 mois',
        icon: Medal,
        color: 'from-amber-400 to-orange-400',
        gradient: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
        iconColor: 'text-orange-400',
        unlocked: memberMonths >= 6,
      },
      // Badge vétéran (1 an)
      {
        id: 'veteran',
        name: 'Vétéran',
        description: 'Membre depuis 1 an',
        icon: Trophy,
        color: 'from-yellow-400 to-amber-400',
        gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
        iconColor: 'text-amber-400',
        unlocked: memberMonths >= 12,
      },
      // Badge premier projet
      {
        id: 'first-project',
        name: 'Premier Pas',
        description: 'A créé son premier projet',
        icon: Rocket,
        color: 'from-green-400 to-emerald-400',
        gradient: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
        iconColor: 'text-emerald-400',
        unlocked: stats.projects >= 1,
      },
      // Badge productif (5 projets)
      {
        id: 'productive',
        name: 'Productif',
        description: 'A créé 5 projets',
        icon: Zap,
        color: 'from-blue-400 to-indigo-400',
        gradient: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20',
        iconColor: 'text-indigo-400',
        unlocked: stats.projects >= 5,
      },
      // Badge maître (10 projets)
      {
        id: 'master',
        name: 'Maître',
        description: 'A créé 10 projets',
        icon: Gem,
        color: 'from-purple-400 to-violet-400',
        gradient: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20',
        iconColor: 'text-violet-400',
        unlocked: stats.projects >= 10,
      },
      // Badge finisseur (1 projet terminé)
      {
        id: 'finisher',
        name: 'Finisseur',
        description: 'A terminé un projet',
        icon: CheckCircle2,
        color: 'from-emerald-400 to-teal-400',
        gradient: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
        iconColor: 'text-teal-400',
        unlocked: stats.projectsTermines >= 1,
      },
      // Badge VIP
      {
        id: 'vip',
        name: 'VIP',
        description: 'Membre VIP',
        icon: Star,
        color: 'from-yellow-400 to-amber-400',
        gradient: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
        iconColor: 'text-yellow-400',
        unlocked: isVip,
      },
      // Badge administrateur
      {
        id: 'admin',
        name: 'Administrateur',
        description: 'Gestionnaire du site',
        icon: Crown,
        color: 'from-purple-500 to-pink-500',
        gradient: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
        iconColor: 'text-pink-400',
        unlocked: isAdmin,
      },
    ];

    return badges;
  };

  const userBadges = calculateBadges();
  const unlockedBadges = userBadges.filter((b) => b.unlocked);
  const lockedBadges = userBadges.filter((b) => !b.unlocked);

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section - Optimisée pour mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-6 sm:mb-8"
        >
          {/* Bannière réduite et optimisée */}
          <div className="relative h-32 sm:h-40 rounded-2xl overflow-hidden">
            {/* Gradient animé */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 opacity-60"
              style={{
                backgroundSize: '200% 100%',
                animation: 'gradient-shift 8s ease infinite',
              }}
            />
            {/* Overlay avec texture */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
          </div>

          {/* Carte profil avec glassmorphism */}
          <div className="relative -mt-12 sm:-mt-16 px-4 sm:px-6">
            <div className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Avatar */}
                <motion.div
                  whileHover={{ scale: session.user?.image ? 1.05 : 1 }}
                  className="relative shrink-0 group"
                >
                  {session.user?.image ? (
                    // Style sans bordure pour les photos personnalisées
                    <>
                      <div
                        className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-lg shadow-purple-500/30 cursor-pointer"
                        onClick={() => setShowFullscreenAvatar(true)}
                      >
                        <Image
                          src={session.user.image}
                          alt="Avatar"
                          fill
                          sizes="(max-width: 640px) 96px, 128px"
                          className="object-cover"
                          unoptimized
                          key={session.user.image}
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 p-2 sm:p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Changer la photo de profil"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 size={14} className="sm:w-4 sm:h-4 text-white animate-spin" />
                        ) : (
                          <Camera size={14} className="sm:w-4 sm:h-4 text-white" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleResetAvatar}
                        disabled={isUploadingAvatar}
                        className="absolute top-0 right-0 p-2 sm:p-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg hover:shadow-red-500/50 transition-all border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        aria-label="Supprimer la photo de profil"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 size={14} className="sm:w-4 sm:h-4 text-white animate-spin" />
                        ) : (
                          <Trash2 size={14} className="sm:w-4 sm:h-4 text-white" />
                        )}
                      </motion.button>
                    </>
                  ) : (
                    // Style avec bordure pour l'icône par défaut
                    <>
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-lg shadow-purple-500/30">
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 p-2 sm:p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg hover:shadow-purple-500/50 transition-all border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Changer la photo de profil"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 size={14} className="sm:w-4 sm:h-4 text-white animate-spin" />
                        ) : (
                          <Camera size={14} className="sm:w-4 sm:h-4 text-white" />
                        )}
                      </motion.button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  {/* Modal de crop */}
                  <ImageCropModal
                    imageToEdit={imageToCrop}
                    aspect={1}
                    circular={true}
                    onCrop={handleCropComplete}
                    onCancel={handleCropCancel}
                    title="Recadrer votre photo de profil"
                    cropLabel="Appliquer"
                    cancelLabel="Annuler"
                  />

                  {/* Modal d'affichage en grand - Rendu via Portal pour être au-dessus de tout */}
                  {typeof window !== 'undefined' &&
                    ReactDOM.createPortal(
                      <AnimatePresence>
                        {showFullscreenAvatar && session.user?.image && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                            onMouseDown={(e) => {
                              // Fermer uniquement si on clique sur le fond (pas sur l'image)
                              if (e.target === e.currentTarget) {
                                setShowFullscreenAvatar(false);
                              }
                            }}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                          >
                            {/* Bouton de fermeture */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setShowFullscreenAvatar(false);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-gray-900/80 hover:bg-gray-800/80 border border-gray-700/50 flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pointer-events-auto"
                              aria-label="Fermer"
                            >
                              <X className="w-6 h-6 text-white" />
                            </button>

                            {/* Image en grand */}
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center pointer-events-none"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] pointer-events-auto">
                                <Image
                                  src={session.user.image}
                                  alt="Avatar en grand"
                                  fill
                                  className="object-contain"
                                  unoptimized
                                  sizes="90vw"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>,
                      document.body
                    )}
                </motion.div>

                {/* Informations */}
                <div className="flex-1 text-center sm:text-left w-full">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1 w-full">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="text-xl sm:text-2xl lg:text-3xl font-audiowide bg-white/10 border border-purple-500/30 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full"
                          placeholder="Nom"
                          disabled={isSaving}
                        />
                      ) : (
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-audiowide text-white mb-2">
                          {session.user?.name || 'Utilisateur'}
                        </h1>
                      )}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mt-2">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editedEmail}
                            onChange={(e) => setEditedEmail(e.target.value)}
                            className="text-xs sm:text-sm lg:text-base text-gray-300 bg-white/10 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full sm:w-auto"
                            placeholder="Email"
                            disabled={isSaving}
                          />
                        ) : (
                          <p className="text-xs sm:text-sm lg:text-base text-gray-300 flex items-center gap-2">
                            <Mail size={14} className="sm:w-4 sm:h-4" />
                            {session.user?.email}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm lg:text-base text-gray-400 flex items-center gap-2">
                          <Calendar size={14} className="sm:w-4 sm:h-4" />
                          Membre depuis {getMemberSince()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-2 sm:p-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Sauvegarder"
                          >
                            {isSaving ? (
                              <Loader2 size={18} className="text-white animate-spin" />
                            ) : (
                              <Save size={18} className="text-white" />
                            )}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="p-2 sm:p-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
                            aria-label="Annuler"
                          >
                            <X size={18} className="text-white" />
                          </motion.button>
                        </>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsEditing(true)}
                          className="p-2 sm:p-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-all"
                          aria-label="Modifier le profil"
                        >
                          <Edit size={18} className="text-white" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
        >
          {userStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="glass-modern glass-modern-hover rounded-xl p-4 sm:p-6 text-center lift-3d"
            >
              <div
                className={`inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-r ${stat.color} mb-2 sm:mb-3`}
              >
                <stat.icon size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Colonne gauche - Informations */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Informations personnelles */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lift-3d"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
                  <Settings size={18} className="sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-audiowide text-white">Informations</h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <User size={16} className="sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <div className="text-xs sm:text-sm text-gray-400">Rôle</div>
                    <div className="text-sm sm:text-base text-white font-medium">
                      {session.user?.role === 'ADMIN' ? '👑 Administrateur' : '👤 Utilisateur'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <TrendingUp size={16} className="sm:w-5 sm:h-5 text-gray-400" />
                  <div>
                    <div className="text-xs sm:text-sm text-gray-400">Statut</div>
                    <div className="text-sm sm:text-base text-white font-medium">Actif</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Lien vers les projets */}
            {stats.projects > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lift-3d"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
                    <FolderKanban size={18} className="sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-audiowide text-white">Mes Projets</h2>
                </div>
                <motion.a
                  href="/projects"
                  whileHover={{ scale: 1.02 }}
                  className="block p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {stats.projects}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">Voir mes projets</div>
                </motion.a>
              </motion.div>
            )}
          </div>

          {/* Colonne droite - Section principale */}
          <div className="lg:col-span-2">
            {/* Message d'accueil pour nouveaux utilisateurs */}
            {stats.projects === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="glass-modern glass-modern-hover rounded-2xl p-6 sm:p-8 lift-3d mb-6"
              >
                <div className="text-center">
                  <FolderKanban size={48} className="mx-auto mb-4 text-purple-400" />
                  <h2 className="text-xl sm:text-2xl font-audiowide text-white mb-3">
                    Bienvenue {session.user?.name || ''} !
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Commencez par créer votre premier projet musical pour suivre votre progression.
                  </p>
                  <motion.a
                    href="/projects"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    Créer mon premier projet
                  </motion.a>
                </div>
              </motion.div>
            )}

            {/* Section projets récents ou informations */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-8 lift-3d"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
                  <TrendingUp size={18} className="sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-audiowide text-white">
                  {stats.projects > 0 ? 'Résumé' : 'À propos'}
                </h2>
              </div>
              <div className="space-y-4">
                {stats.projects > 0 ? (
                  <>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Projets en cours</span>
                        <span className="text-xl font-bold text-white">
                          {stats.projectsEnCours}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Projets terminés</span>
                        <span className="text-xl font-bold text-white">
                          {stats.projectsTermines}
                        </span>
                      </div>
                    </div>
                    <motion.a
                      href="/projects"
                      whileHover={{ x: 5 }}
                      className="block p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Gérer mes projets</span>
                        <FolderKanban size={20} className="text-purple-400" />
                      </div>
                    </motion.a>
                  </>
                ) : (
                  <div className="space-y-3 text-gray-400 text-sm sm:text-base">
                    <p>
                      Votre profil est prêt ! Utilisez cette page pour gérer vos informations
                      personnelles et suivre votre activité.
                    </p>
                    <p>
                      Créez des projets musicaux pour organiser votre travail et suivre votre
                      progression dans vos créations.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Section Badges - Sous le Résumé */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-8 lift-3d"
            >
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg">
                  <Award size={18} className="sm:w-5 sm:h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-audiowide text-white">Badges</h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    {unlockedBadges.length} / {userBadges.length} débloqués
                  </p>
                </div>
              </div>

              {/* Badges débloqués */}
              {unlockedBadges.length > 0 && (
                <div className="mb-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                    {unlockedBadges.map((badge) => {
                      const Icon = badge.icon;
                      return (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.15, z: 10 }}
                          className="relative group"
                        >
                          <div
                            className={`aspect-square rounded-xl ${badge.gradient} border-2 border-purple-500/30 flex flex-col items-center justify-center p-2 sm:p-3 cursor-pointer transition-all hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20 relative overflow-hidden`}
                          >
                            {/* Effet shimmer animé */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
                                style={{
                                  animation: 'shimmer 3s ease-in-out infinite',
                                }}
                              />
                            </div>

                            {/* Effet de glow pulsant */}
                            <motion.div
                              className={`absolute inset-0 rounded-xl bg-gradient-to-r ${badge.color} opacity-0 group-hover:opacity-20`}
                              animate={{
                                opacity: [0, 0.1, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />

                            {/* Icône avec animation subtile */}
                            <motion.div
                              animate={{
                                y: [0, -2, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: Math.random() * 0.5,
                              }}
                            >
                              <Icon
                                size={24}
                                className={`sm:w-7 sm:h-7 relative z-10 ${badge.iconColor} drop-shadow-lg filter group-hover:drop-shadow-[0_0_8px_currentColor] transition-all duration-300`}
                              />
                            </motion.div>

                            {/* Overlay au hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 rounded-xl transition-all" />

                            {/* Particules brillantes */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <motion.div
                                className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full"
                                animate={{
                                  scale: [0, 1, 0],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 0,
                                }}
                              />
                              <motion.div
                                className="absolute top-2 right-2 w-1 h-1 bg-white rounded-full"
                                animate={{
                                  scale: [0, 1, 0],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 0.5,
                                }}
                              />
                              <motion.div
                                className="absolute bottom-2 left-2 w-1 h-1 bg-white rounded-full"
                                animate={{
                                  scale: [0, 1, 0],
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: 1,
                                }}
                              />
                            </div>
                          </div>
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                            <div className="bg-black/95 backdrop-blur-md rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap border border-purple-500/50 shadow-2xl shadow-purple-500/20">
                              <div className="font-semibold mb-0.5 text-white">{badge.name}</div>
                              <div className="text-gray-200">{badge.description}</div>
                            </div>
                            {/* Flèche du tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                              <div className="w-2 h-2 bg-black/95 border-r border-b border-purple-500/50 rotate-45"></div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Badges verrouillés (optionnel, affichés en gris) */}
              {lockedBadges.length > 0 && unlockedBadges.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">À débloquer</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                    {lockedBadges.slice(0, 8).map((badge) => {
                      const Icon = badge.icon;
                      return (
                        <div
                          key={badge.id}
                          className="aspect-square rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-2 sm:p-3 opacity-40"
                        >
                          <Icon size={24} className="sm:w-7 sm:h-7 text-gray-500" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message si aucun badge */}
              {unlockedBadges.length === 0 && (
                <div className="text-center py-6">
                  <Award size={40} className="mx-auto mb-3 text-gray-500" />
                  <p className="text-sm sm:text-base text-gray-400 mb-1">
                    Aucun badge débloqué pour le moment
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Créez des projets pour débloquer vos premiers badges !
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
