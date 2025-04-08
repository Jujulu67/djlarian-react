'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Edit, Camera } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Accès non autorisé</h1>
          <p className="text-gray-400">Veuillez vous connecter pour accéder à votre profil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* En-tête du profil */}
        <div className="relative mb-8">
          {/* Bannière */}
          <div className="h-48 rounded-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900 via-black to-blue-900" />
            <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-5 mix-blend-overlay" />
          </div>

          {/* Avatar et informations principales */}
          <div className="flex flex-col md:flex-row items-center gap-6 -mt-16 px-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black relative">
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Avatar"
                    fill
                    sizes="(max-width: 768px) 100px, 150px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
                <Camera size={16} className="text-white" />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <h1 className="text-3xl font-audiowide">{session.user?.name}</h1>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Edit size={20} />
                </button>
              </div>
              <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 mt-2">
                <Mail size={16} />
                {session.user?.email}
              </p>
              <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 mt-1">
                <Calendar size={16} />
                Membre depuis janvier 2024
              </p>
            </div>
          </div>
        </div>

        {/* Contenu du profil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistiques */}
            <div className="bg-black/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/10">
              <h2 className="text-xl font-medium mb-4">Statistiques</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm">Événements assistés</div>
                  <div className="text-2xl font-medium">12</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Playlists créées</div>
                  <div className="text-2xl font-medium">5</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Commentaires</div>
                  <div className="text-2xl font-medium">24</div>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="bg-black/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/10">
              <h2 className="text-xl font-medium mb-4">Badges</h2>
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <span className="text-xs">🏆</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="md:col-span-2 space-y-6">
            {/* Préférences */}
            <div className="bg-black/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/10">
              <h2 className="text-xl font-medium mb-4">Préférences musicales</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['House', 'Techno', 'Trance', 'Drum & Bass', 'Ambient', 'Progressive'].map(
                  (genre) => (
                    <div
                      key={genre}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 text-center"
                    >
                      {genre}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Activité récente */}
            <div className="bg-black/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/10">
              <h2 className="text-xl font-medium mb-4">Activité récente</h2>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-600/5 to-blue-600/5 border border-purple-500/10"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                      <span className="text-lg">🎵</span>
                    </div>
                    <div>
                      <h3 className="font-medium">A écouté un nouveau mix</h3>
                      <p className="text-sm text-gray-400">Il y a 2 heures</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
