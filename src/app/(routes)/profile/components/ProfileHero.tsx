'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  User,
  Mail,
  Calendar,
  Edit,
  Camera,
  Save,
  X,
  Trash2,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import ImageCropModal from '@/components/ui/ImageCropModal';
import { ProfileAvatarModal } from './ProfileAvatarModal';
import { getMemberSince } from '../utils/dateUtils';
import { SlotMachine } from './SlotMachine';
import { useState } from 'react';

interface ProfileHeroProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    createdAt?: string | Date | null;
  };
  isEditing: boolean;
  isSaving: boolean;
  isUploadingAvatar: boolean;
  editedName: string;
  editedEmail: string;
  error: string | null;
  imageToCrop: string | null;
  showFullscreenAvatar: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onAvatarClick: () => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCropComplete: (file: File, previewUrl: string) => void;
  onCropCancel: () => void;
  onResetAvatar: () => void;
  onShowFullscreenAvatar: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ProfileHero({
  user,
  isEditing,
  isSaving,
  isUploadingAvatar,
  editedName,
  editedEmail,
  error,
  imageToCrop,
  showFullscreenAvatar,
  onEdit,
  onSave,
  onCancel,
  onNameChange,
  onEmailChange,
  onAvatarClick,
  onAvatarChange,
  onCropComplete,
  onCropCancel,
  onResetAvatar,
  onShowFullscreenAvatar,
  fileInputRef,
}: ProfileHeroProps) {
  const [showSlotMachine, setShowSlotMachine] = useState(false);

  const getImageUrl = (image: string | null) => {
    if (!image) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image.includes('googleusercontent.com')
        ? `/api/images/proxy?url=${encodeURIComponent(image)}`
        : image;
    }
    return image;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative mb-4 sm:mb-6 lg:mb-6"
    >
      {/* Bannière réduite et optimisée */}
      <motion.div
        className="relative h-28 sm:h-32 lg:h-28 rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => setShowSlotMachine(true)}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        title="🎰 Cliquez pour jouer à la machine à sous"
      >
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
      </motion.div>

      {/* Carte profil avec glassmorphism */}
      <div className="relative -mt-10 sm:-mt-14 lg:-mt-12 px-4 sm:px-6">
        <div className="glass-modern glass-modern-hover rounded-2xl p-4 sm:p-6 lg:p-5 relative">
          {/* Bouton Modifier en haut à droite */}
          <div className="absolute top-4 right-4 z-10">
            {isEditing ? (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSave}
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
                  onClick={onCancel}
                  disabled={isSaving}
                  className="p-2 sm:p-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
                  aria-label="Annuler"
                >
                  <X size={18} className="text-white" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEdit}
                className="p-2 sm:p-2.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-all"
                aria-label="Modifier le profil"
              >
                <Edit size={18} className="text-white" />
              </motion.button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-5 lg:gap-4">
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: user.image ? 1.05 : 1 }}
              className="relative shrink-0 group"
            >
              {user.image ? (
                <>
                  <div
                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-lg shadow-purple-500/30 cursor-pointer"
                    onClick={() => onShowFullscreenAvatar(true)}
                  >
                    <Image
                      src={getImageUrl(user.image) || ''}
                      alt="Avatar"
                      fill
                      sizes="(max-width: 640px) 96px, 128px"
                      className="object-cover"
                      unoptimized
                      key={user.image}
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAvatarClick}
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
                    onClick={onResetAvatar}
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
                <>
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-lg shadow-purple-500/30">
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onAvatarClick}
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
                onChange={onAvatarChange}
                className="hidden"
              />

              {/* Modal de crop */}
              <ImageCropModal
                imageToEdit={imageToCrop}
                aspect={1}
                circular={true}
                onCrop={onCropComplete}
                onCancel={onCropCancel}
                title="Recadrer votre photo de profil"
                cropLabel="Appliquer"
                cancelLabel="Annuler"
              />

              {/* Modal d'affichage en grand */}
              {user.image && (
                <ProfileAvatarModal
                  isOpen={showFullscreenAvatar}
                  imageUrl={user.image}
                  onClose={() => onShowFullscreenAvatar(false)}
                />
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
              <div className="flex-1 w-full">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="text-xl sm:text-2xl lg:text-3xl font-audiowide bg-white/10 border border-purple-500/30 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full"
                    placeholder="Nom"
                    disabled={isSaving}
                  />
                ) : (
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-audiowide text-white mb-2">
                    {user.name || 'Utilisateur'}
                  </h1>
                )}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 mt-2">
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => onEmailChange(e.target.value)}
                      className="text-xs sm:text-sm lg:text-base text-gray-300 bg-white/10 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-full sm:w-auto"
                      placeholder="Email"
                      disabled={isSaving}
                    />
                  ) : (
                    <p className="text-xs sm:text-sm lg:text-base text-gray-300 flex items-center gap-2">
                      <Mail size={14} className="sm:w-4 sm:h-4" />
                      {user.email || ''}
                    </p>
                  )}
                  {getMemberSince(user.createdAt) && (
                    <p className="text-xs sm:text-sm lg:text-base text-gray-400 flex items-center gap-2">
                      <Calendar size={14} className="sm:w-4 sm:h-4" />
                      Membre depuis {getMemberSince(user.createdAt)}
                    </p>
                  )}
                </div>
                {/* Informations Rôle et Statut */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 mt-3 sm:mt-4">
                  <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 border border-white/10">
                    <User size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-300">
                      {user.role === 'ADMIN' ? '👑 Administrateur' : '👤 Utilisateur'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/5 border border-white/10">
                    <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-300">Actif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine à sous Modal */}
      <SlotMachine isOpen={showSlotMachine} onClose={() => setShowSlotMachine(false)} />
    </motion.div>
  );
}
