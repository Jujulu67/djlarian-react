import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import {
  CalendarDays,
  ImageIcon,
  Music2,
  Users,
  BarChart3,
  Settings,
  Zap,
  Clock,
  Ticket,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Récupérer les statistiques des événements
  const eventsCount = await prisma.event.count();
  const recentEvents = await prisma.event.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
      },
    },
  });

  // Statistiques simulées pour les tables qui n'existent pas encore
  const mediaCount = '156 (placeholder)'; // Valeur fictive pour la démo
  let tracksCount = '42 (placeholder)'; // Valeur fictive pour la démo

  // Récupérer les statistiques des utilisateurs
  const usersCount = await prisma.user.count();
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN' },
  });

  // Récupérer les activités récentes
  const recentActivities = [];

  // Récupérer les événements récents
  const latestEvents = await prisma.event.findMany({
    take: 1,
    orderBy: { createdAt: 'desc' },
  });

  if (latestEvents.length > 0) {
    recentActivities.push({
      type: 'event',
      title: 'Nouvel événement créé',
      description: `L'événement "${latestEvents[0].title}" a été créé`,
      date: latestEvents[0].createdAt,
      icon: CalendarDays,
      isPlaceholder: false,
    });
  }

  // Ajouter un morceau de musique simulé pour la démo
  recentActivities.push({
    type: 'track',
    title: 'Nouveau morceau ajouté (placeholder)',
    description: 'Le morceau "Midnight Pulse" a été ajouté à la bibliothèque',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
    icon: Music2,
    isPlaceholder: true,
  });

  // Récupérer les ventes de billets récentes si disponible
  const latestTickets = await prisma.ticketInfo.findMany({
    take: 1,
    orderBy: { id: 'desc' },
    include: { event: true },
  });

  if (latestTickets.length > 0 && latestTickets[0].event) {
    recentActivities.push({
      type: 'ticket',
      title: 'Vente de billets',
      description: `Nouvelle configuration de billets pour "${latestTickets[0].event.title}"`,
      date: latestTickets[0].event.createdAt,
      icon: Ticket,
      isPlaceholder: false,
    });
  } else {
    // Ajouter une vente de billets simulée si aucune n'est trouvée
    recentActivities.push({
      type: 'ticket',
      title: 'Vente de billets (placeholder)',
      description: '12 nouveaux billets vendus pour "Summer Festival"',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Il y a 3 jours
      icon: Ticket,
      isPlaceholder: true,
    });
  }

  // Trier les activités par date (plus récent en premier)
  recentActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-audiowide text-white mb-4">
            <span className="text-gradient">Panel Administrateur</span>
          </h1>
          <div className="bg-purple-500/10 h-1 w-32 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Carte Événements */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-purple-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <CalendarDays className="text-purple-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-purple-300 transition-colors">
                Événements
              </h2>
              <p className="text-gray-400 mb-8">
                Gérez les événements à venir et passés, créez des récurrences et configurez la
                billetterie.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                  Concerts
                </span>
                <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                  Festivals
                </span>
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Master Events
                </span>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  href="/admin/events"
                  className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium group"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Gérer
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </Link>
                <span className="text-xs text-purple-300/70 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Récents: {recentEvents}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Galerie */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-blue-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <ImageIcon className="text-blue-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-blue-300 transition-colors">
                Galerie
              </h2>
              <p className="text-gray-400 mb-8">
                Gérez les photos et médias, organisez vos collections et contrôlez la visibilité du
                contenu.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                  Photos
                </span>
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Vidéos
                </span>
                <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                  Albums
                </span>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  href="/admin/gallery"
                  className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium group"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Gérer
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </Link>
                <span className="text-xs text-blue-300/70 flex items-center">
                  <ImageIcon className="h-3 w-3 mr-1" /> Total: {mediaCount}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Musique */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-indigo-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <Music2 className="text-indigo-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-indigo-300 transition-colors">
                Musique
              </h2>
              <p className="text-gray-400 mb-8">
                Gérez les morceaux et playlists, intégrez du contenu depuis Spotify ou SoundCloud.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Tracks
                </span>
                <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                  Albums
                </span>
                <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                  Playlists
                </span>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  href="/admin/music"
                  className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium group"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Gérer
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </Link>
                <span className="text-xs text-indigo-300/70 flex items-center">
                  <Music2 className="h-3 w-3 mr-1" /> Titres: {tracksCount}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Utilisateurs */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl group-hover:bg-pink-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-pink-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <Users className="text-pink-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-pink-300 transition-colors">
                Utilisateurs
              </h2>
              <p className="text-gray-400 mb-8">
                Gérez les comptes utilisateurs, les rôles et les permissions d'accès au site.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-pink-900/30 text-pink-300 text-xs px-2 py-1 rounded-full">
                  Comptes
                </span>
                <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                  Rôles
                </span>
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Permissions
                </span>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  href="/admin/users"
                  className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium group"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Gérer
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </Link>
                <span className="text-xs text-pink-300/70 flex items-center">
                  <Users className="h-3 w-3 mr-1" /> Actifs: {usersCount}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Statistiques */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-teal-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-teal-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <BarChart3 className="text-teal-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-teal-300 transition-colors">
                Statistiques
              </h2>
              <p className="text-gray-400 mb-8">
                Consultez les statistiques du site, analysez le trafic et l'engagement des
                visiteurs.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-teal-900/30 text-teal-300 text-xs px-2 py-1 rounded-full">
                  Visites
                </span>
                <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                  Trafic
                </span>
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Conversion
                </span>
              </div>

              <div className="flex justify-between items-center">
                <button className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-blue-600 text-white font-medium group">
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-teal-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Voir
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </button>
                <span className="text-xs text-teal-300/70 flex items-center">
                  {adminCount > 0
                    ? `${adminCount} admin${adminCount > 1 ? 's' : ''}`
                    : 'Aucune donnée'}
                </span>
              </div>
            </div>
          </div>

          {/* Carte Configuration */}
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden group relative transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-purple-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>

            <div className="p-6 relative z-10">
              <div className="bg-indigo-500/20 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                <Settings className="text-indigo-400 h-6 w-6" />
              </div>
              <h2 className="text-2xl font-audiowide text-white mb-2 group-hover:text-indigo-300 transition-colors">
                Configuration
              </h2>
              <p className="text-gray-400 mb-8">
                Configurez les paramètres du site, les intégrations API et les options globales.
              </p>

              <div className="flex space-x-2 mb-6">
                <span className="bg-indigo-900/30 text-indigo-300 text-xs px-2 py-1 rounded-full">
                  Site
                </span>
                <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded-full">
                  API
                </span>
                <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded-full">
                  Email
                </span>
              </div>

              <div className="flex justify-between items-center">
                <button className="relative overflow-hidden px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium group">
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="relative flex items-center">
                    Configurer
                    <Zap className="ml-2 h-4 w-4" />
                  </span>
                </button>
                <span className="text-xs text-indigo-300/70 flex items-center">
                  <Settings className="h-3 w-3 mr-1" /> Dernière:{' '}
                  <span className="italic opacity-75">2j (placeholder)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-audiowide text-white mb-4">Activités récentes</h3>

              <div className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="bg-black/30 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div
                          className={`${
                            activity.type === 'event'
                              ? 'bg-purple-500/20'
                              : activity.type === 'track'
                                ? 'bg-blue-500/20'
                                : 'bg-pink-500/20'
                          } p-2 rounded-lg mr-3`}
                        >
                          <activity.icon
                            className={`h-5 w-5 ${
                              activity.type === 'event'
                                ? 'text-purple-400'
                                : activity.type === 'track'
                                  ? 'text-blue-400'
                                  : 'text-pink-400'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-white font-medium flex items-center">
                            {activity.title}
                            {activity.isPlaceholder && (
                              <span className="ml-1 text-xs text-gray-400 italic">
                                (données fictives)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{activity.description}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.date, { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/30 p-3 rounded-lg text-center">
                    <p className="text-gray-400">Aucune activité récente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
