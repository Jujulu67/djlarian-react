'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { useProfileStats } from './hooks/useProfileStats';
import { useRecentProjects } from './hooks/useRecentProjects';
import { useOAuthAccounts } from './hooks/useOAuthAccounts';
import { useProfileBadges } from './hooks/useProfileBadges';
import { ProfileStats } from './components/ProfileStats';
import { ProfileProjects } from './components/ProfileProjects';
import { ProfileHero } from './components/ProfileHero';
import { ProfileBadges } from './components/ProfileBadges';
import { ProfileOAuth } from './components/ProfileOAuth';
import { ProfilePasswordModal } from './components/ProfilePasswordModal';

function ProfileContent() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedName, setEditedName] = useState(session?.user?.name || '');
  const [editedEmail, setEditedEmail] = useState(session?.user?.email || '');
  const [error, setError] = useState<string | null>(null);
  const { stats, isLoading: isLoadingStats, loadStats } = useProfileStats();
  const {
    recentProjects,
    isLoading: isLoadingRecentProjects,
    loadRecentProjects,
  } = useRecentProjects();
  const {
    oauthAccounts,
    oauthSecurity,
    isLoading: isLoadingOAuth,
    loadOAuthAccounts,
  } = useOAuthAccounts();
  const {
    badges: userBadges,
    unlockedBadges,
    lockedBadges,
    totalRegularBadges,
    unlockedSecretBadges,
    unlockedSecretCount,
  } = useProfileBadges(stats, session?.user || {});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showFullscreenAvatar, setShowFullscreenAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Charger les données au montage
  useEffect(() => {
    if (session?.user?.id) {
      loadStats();
      loadOAuthAccounts(session.user.id);
    }
  }, [session?.user?.id, loadStats, loadOAuthAccounts]);

  useEffect(() => {
    if (session?.user?.id && stats.projects > 0) {
      loadRecentProjects(stats.projects);
    }
  }, [session?.user?.id, stats.projects, loadRecentProjects]);

  // Vérifier si un compte vient d'être associé
  useEffect(() => {
    if (searchParams.get('linked') === 'true') {
      toast.success('Compte OAuth associé avec succès !');
      if (session?.user?.id) {
        loadOAuthAccounts(session.user.id);
      }
      // Nettoyer l'URL
      router.replace('/profile');
    }
  }, [searchParams, loadOAuthAccounts, router, session?.user?.id]);

  // Synchroniser les valeurs éditées avec la session
  useEffect(() => {
    if (session?.user) {
      setEditedName(session.user.name || '');
      setEditedEmail(session.user.email || '');
    }
  }, [session?.user]);

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
        setError(null);
        toast.success('Profil mis à jour avec succès');
        router.refresh();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Erreur lors de la mise à jour';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      setError(errorMessage);
      toast.error(errorMessage);
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
      const errorMessage = 'Le fichier doit être une image';
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const errorMessage = "L'image est trop volumineuse (max 5MB)";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    // Lire le fichier et ouvrir le modal de crop
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile: File, previewUrl: string) => {
    if (!session?.user?.id) return;

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

        setError(null);
        toast.success('Photo de profil mise à jour avec succès');

        // Rafraîchir la page pour mettre à jour toutes les images (profil + header)
        router.refresh();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Erreur lors de l'upload";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      setError(errorMessage);
      toast.error(errorMessage);
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

        setError(null);
        toast.success('Photo de profil supprimée avec succès');

        // Rafraîchir la page pour mettre à jour toutes les images (profil + header)
        router.refresh();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Erreur lors de la suppression';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Gérer l'association d'un compte OAuth
  const handleLinkAccount = async (provider: 'google' | 'twitch') => {
    try {
      // Rediriger vers OAuth avec callbackUrl vers /profile?link=true
      await signIn(provider, {
        redirect: true,
        callbackUrl: '/profile?link=true',
      });
    } catch (error) {
      console.error(`[Profile] Erreur association ${provider}:`, error);
      toast.error(`Erreur lors de l'association du compte ${provider}`);
    }
  };

  // Gérer la désassociation d'un compte OAuth
  const handleUnlinkAccount = async (provider: 'google' | 'twitch', accountId: string | null) => {
    if (!accountId) return;

    // Vérifier si c'est le dernier compte OAuth et s'il n'y a pas de mot de passe
    if (oauthSecurity && oauthSecurity.oauthCount === 1 && !oauthSecurity.hasPassword) {
      toast.error(
        "Impossible de désassocier le dernier compte OAuth. Veuillez d'abord définir un mot de passe.",
        { duration: 5000 }
      );
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir désassocier votre compte ${provider} ?`)) {
      return;
    }

    setUnlinkingProvider(provider);
    try {
      const response = await fetchWithAuth('/api/profile/accounts/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (response.ok) {
        toast.success(`Compte ${provider} désassocié avec succès`);
        if (session?.user?.id) {
          loadOAuthAccounts(session.user.id);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la désassociation');
      }
    } catch (error) {
      console.error(`[Profile] Erreur désassociation ${provider}:`, error);
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setUnlinkingProvider(null);
    }
  };

  // Gérer la modification/définition du mot de passe
  const handlePasswordSubmit = async () => {
    if (!session?.user?.id) return;

    // Réinitialiser l'erreur
    setPasswordError(null);

    // Validation
    if (oauthSecurity?.hasPassword) {
      // Modification : vérifier l'ancien mot de passe
      if (!passwordData.currentPassword) {
        setPasswordError('Veuillez entrer votre mot de passe actuel');
        return;
      }
    }

    if (!passwordData.newPassword) {
      setPasswordError('Veuillez entrer un nouveau mot de passe');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Si l'utilisateur a déjà un mot de passe, vérifier l'ancien
      if (oauthSecurity?.hasPassword) {
        // Vérifier l'ancien mot de passe
        const verifyResponse = await fetchWithAuth('/api/profile/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: passwordData.currentPassword,
          }),
        });

        if (!verifyResponse.ok) {
          const error = await verifyResponse.json();
          setPasswordError(error.error || 'Mot de passe actuel incorrect');
          setIsChangingPassword(false);
          return;
        }
      }

      // Mettre à jour le mot de passe
      const response = await fetchWithAuth(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success(
          oauthSecurity?.hasPassword
            ? 'Mot de passe modifié avec succès'
            : 'Mot de passe défini avec succès'
        );
        setShowPasswordModal(false);
        setPasswordError(null);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        if (session?.user?.id) {
          loadOAuthAccounts(session.user.id); // Recharger pour mettre à jour hasPassword
        }
      } else {
        const error = await response.json();
        setPasswordError(error.error || 'Erreur lors de la modification du mot de passe');
      }
    } catch (error) {
      console.error('[Profile] Erreur modification mot de passe:', error);
      setPasswordError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto pt-4 sm:pt-8 pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        {session.user && (
          <ProfileHero
            user={session.user}
            isEditing={isEditing}
            isSaving={isSaving}
            isUploadingAvatar={isUploadingAvatar}
            editedName={editedName}
            editedEmail={editedEmail}
            error={error}
            imageToCrop={imageToCrop}
            showFullscreenAvatar={showFullscreenAvatar}
            onEdit={() => setIsEditing(true)}
            onSave={handleSave}
            onCancel={handleCancel}
            onNameChange={setEditedName}
            onEmailChange={setEditedEmail}
            onAvatarClick={handleAvatarClick}
            onAvatarChange={handleAvatarChange}
            onCropComplete={handleCropComplete}
            onCropCancel={handleCropCancel}
            onResetAvatar={handleResetAvatar}
            onShowFullscreenAvatar={setShowFullscreenAvatar}
            fileInputRef={fileInputRef}
          />
        )}

        {/* Statistiques */}
        <ProfileStats stats={stats} isLoading={isLoadingStats} />

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 items-stretch">
          {/* Colonne gauche - Mes Projets */}
          <div className="lg:col-span-1 flex flex-col">
            <ProfileProjects
              projects={stats.projects}
              recentProjects={recentProjects}
              isLoading={isLoadingRecentProjects}
              userName={session.user?.name}
            />
          </div>

          {/* Colonne droite - Badges */}
          <div className="lg:col-span-2 flex flex-col">
            <ProfileBadges
              unlockedBadges={unlockedBadges}
              lockedBadges={lockedBadges}
              totalBadges={totalRegularBadges}
              unlockedSecretBadges={unlockedSecretBadges}
              unlockedSecretCount={unlockedSecretCount}
            />
          </div>
        </div>

        {/* Section Comptes connectés */}
        <ProfileOAuth
          oauthAccounts={oauthAccounts}
          oauthSecurity={oauthSecurity}
          isLoading={isLoadingOAuth}
          unlinkingProvider={unlinkingProvider}
          onLinkAccount={handleLinkAccount}
          onUnlinkAccount={handleUnlinkAccount}
          onOpenPasswordModal={() => {
            setPasswordError(null);
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            setShowPasswordModal(true);
          }}
        />
      </div>

      {/* Modal de modification/définition du mot de passe */}
      <ProfilePasswordModal
        isOpen={showPasswordModal}
        hasPassword={oauthSecurity?.hasPassword || false}
        isChanging={isChangingPassword}
        error={passwordError}
        passwordData={passwordData}
        showPasswords={showPasswords}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordError(null);
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }}
        onSubmit={handlePasswordSubmit}
        onPasswordDataChange={setPasswordData}
        onShowPasswordsChange={setShowPasswords}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-white font-audiowide animate-pulse">Chargement du profil...</div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
