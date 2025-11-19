import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Link from 'next/link';
import {
  CalendarDays,
  Music2,
  Ticket,
  Clock,
  ArrowLeft,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Suspense } from 'react';

// Définir un type pour les activités pour plus de clarté
type ActivityType = 'event' | 'track' | 'ticket';
type Activity = {
  id: string; // Ajouter ID pour lien et key
  type: ActivityType;
  title: string;
  description: string;
  date: Date;
  icon: React.ElementType; // Type pour les composants icônes Lucide
  href?: string; // Lien optionnel vers l'élément
};

// Helper pour formater les dates de groupe
const formatGroupDate = (dateString: string) => {
  const date = parseISO(dateString);
  if (isToday(date)) {
    return "Aujourd'hui";
  }
  if (isYesterday(date)) {
    return 'Hier';
  }
  return format(date, 'eeee d MMMM yyyy', { locale: fr });
};

// Composant de pagination moderne avec simple HTML
function ModernPagination({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
  // Fonction pour générer l'URL de pagination
  const getPageUrl = (page: number) => {
    if (baseUrl.includes('?')) {
      return `${baseUrl}&page=${page}`;
    }
    return `${baseUrl}?page=${page}`;
  };

  // Ne rien afficher s'il n'y a pas besoin de pagination
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center mt-8 space-x-4">
      {/* Navigation précédent */}
      {currentPage <= 1 ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronLeft className="h-5 w-5" />
        </span>
      ) : (
        <a
          href={getPageUrl(currentPage - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </a>
      )}

      {/* Indicateur de page */}
      <span className="text-sm text-gray-300 font-medium">
        Page {currentPage} sur {totalPages}
      </span>

      {/* Navigation suivant */}
      {currentPage >= totalPages ? (
        <span className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-gray-500 cursor-not-allowed">
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : (
        <a
          href={getPageUrl(currentPage + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-900/50 text-white hover:bg-purple-800 transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}

// Revenir au type standard pour searchParams
export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    // Rendre optionnel et objet standard
    type?: string;
    page?: string;
    limit?: string;
  }>;
}) {
  const session = await auth();

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Attendre d'abord searchParams lui-même avant d'accéder à ses propriétés
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // Utiliser les valeurs depuis l'objet résolu
  const filterType = resolvedSearchParams?.type;
  const currentPage = resolvedSearchParams?.page || '1';
  const currentLimit = resolvedSearchParams?.limit || '10';

  const page = parseInt(currentPage, 10);
  const limit = parseInt(currentLimit, 10);
  const skip = (page - 1) * limit;

  // --- Récupération des données --- (avec IDs pour les liens)
  let activitiesData: {
    id: string;
    type: ActivityType;
    date: Date;
    title: string;
    eventId?: string;
  }[] = [];
  let totalItems = 0;

  if (filterType) {
    // --- CAS: Filtre Actif ---
    let query;
    let countQuery;

    if (filterType === 'event') {
      totalItems = await prisma.event.count();
      query = prisma.event.findMany({
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true },
      });
      const events = await query;
      activitiesData = events.map((e) => ({
        id: e.id,
        type: 'event',
        date: e.createdAt,
        title: e.title,
      }));
    } else if (filterType === 'track') {
      totalItems = await prisma.track.count();
      query = prisma.track.findMany({
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true },
      });
      const tracks = await query;
      activitiesData = tracks.map((t) => ({
        id: t.id,
        type: 'track',
        date: t.createdAt,
        title: t.title,
      }));
    } else if (filterType === 'ticket') {
      const query = prisma.ticketInfo.findMany({
        take: limit,
        skip: skip,
        orderBy: { id: 'desc' },
        include: { Event: { select: { id: true, title: true, createdAt: true } } },
      });
      const tickets = (await query).filter((ti) => ti.Event);
      activitiesData = tickets.map((ti) => ({
        id: ti.id,
        type: 'ticket',
        date: ti.Event!.createdAt,
        title: ti.Event!.title,
        eventId: ti.Event!.id,
      }));
    }
    // Pas besoin de trier ici, Prisma l'a déjà fait
  } else {
    // --- CAS: Aucun Filtre ("Tous") ---
    // Paralléliser les requêtes pour améliorer les performances
    const [allEvents, allTracks, allTickets] = await Promise.all([
      prisma.event.findMany({
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.track.findMany({
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.ticketInfo.findMany({
        include: { Event: { select: { id: true, title: true, createdAt: true } } },
      }),
    ]);

    // Combiner et mapper
    let combinedData = [
      ...allEvents.map((e) => ({
        id: e.id,
        type: 'event' as ActivityType,
        date: e.createdAt,
        title: e.title,
      })),
      ...allTracks.map((t) => ({
        id: t.id,
        type: 'track' as ActivityType,
        date: t.createdAt,
        title: t.title,
      })),
      ...allTickets
        .filter((ti) => ti.Event)
        .map((ti) => ({
          id: ti.id,
          type: 'ticket' as ActivityType,
          date: ti.Event!.createdAt,
          title: ti.Event!.title,
          eventId: ti.Event!.id,
        })),
    ];

    // Trier le tout par date
    combinedData.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculer le total réel
    totalItems = combinedData.length;

    // Appliquer la pagination sur le tableau trié
    activitiesData = combinedData.slice(skip, skip + limit);
  }

  // Calculer totalPages basé sur totalItems réel ou compté
  const totalPages = Math.ceil(totalItems / limit);

  // --- Formatage des activités pour l'affichage ---
  const allActivities: Activity[] = activitiesData.map((data) => {
    let activityTitle = '';
    let description = '';
    let icon: React.ElementType = Clock; // default
    let href: string | undefined;

    switch (data.type) {
      case 'event':
        activityTitle = 'Nouvel événement créé';
        description = data.title
          ? `L'événement "${data.title}" a été créé`
          : 'Un nouvel événement a été créé';
        icon = CalendarDays;
        href = data.id ? `/admin/events/${data.id}` : undefined;
        break;
      case 'track':
        activityTitle = 'Nouveau morceau ajouté';
        description = data.title
          ? `Le morceau "${data.title}" a été ajouté`
          : 'Un nouveau morceau a été ajouté';
        icon = Music2;
        href = data.id ? `/admin/music/${data.id}/detail` : undefined;
        break;
      case 'ticket':
        activityTitle = 'Configuration Billets';
        description = data.title
          ? `Billets configurés pour "${data.title}"`
          : 'Billets configurés pour un événement';
        icon = Ticket;
        href = data.eventId ? `/admin/events/${data.eventId}` : undefined;
        break;
    }

    return {
      id: data.id,
      type: data.type,
      title: activityTitle,
      description: description,
      date: data.date,
      icon: icon,
      href: href,
    };
  });

  // --- Regroupement par jour ---
  const groupedActivities = allActivities.reduce(
    (acc, activity) => {
      const dateKey = activity.date.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(activity);
      return acc;
    },
    {} as Record<string, Activity[]>
  );

  // Fonction pour générer les classes CSS du bouton de filtre actif/inactif
  const getFilterButtonClass = (type: ActivityType | undefined) => {
    const baseClass =
      'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center';
    // Utiliser la variable déjà lue
    const currentUrlFilter = filterType;
    const isActive = currentUrlFilter === type;

    if (type === undefined && currentUrlFilter === undefined) {
      return `${baseClass} bg-purple-600 text-white shadow-md`;
    }
    return isActive
      ? `${baseClass} bg-purple-600 text-white shadow-md`
      : `${baseClass} bg-gray-700/50 text-gray-300 hover:bg-gray-600/70 hover:text-white`;
  };

  // Construire l'URL de base pour la pagination
  const getPaginationBaseUrl = () => {
    let baseUrl = '/admin/activities';
    if (filterType) {
      baseUrl += `?type=${filterType}`;
    }
    if (currentLimit !== '10') {
      baseUrl += (baseUrl.includes('?') ? '&' : '?') + `limit=${currentLimit}`;
    }
    return baseUrl;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-radial from-gray-950 to-black text-white">
      <div className="max-w-7xl mx-auto">
        {/* Structure réorganisée en 3 sections distinctes et séparées */}

        {/* 1. Lien de retour - Toujours en haut et à gauche */}
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour au Panel
          </Link>
        </div>

        {/* 2. En-tête principal avec titre - Centré, occupe toute la largeur */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center mb-4">
            <Clock className="h-10 w-10 mr-4 text-purple-400" />
            <h1 className="text-5xl font-audiowide">
              <span className="text-gradient">Historique des Activités</span>
            </h1>
          </div>
          <div className="bg-purple-500/30 h-1 w-40 mx-auto rounded-full mb-6"></div>
        </div>

        {/* 3. Filtres - Section dédiée en dessous du titre */}
        <div className="mb-8 flex justify-center items-center space-x-3 bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-purple-500/10">
          <Filter className="w-5 h-5 text-purple-400 mr-2" />
          <Link href="/admin/activities" className={getFilterButtonClass(undefined)}>
            Tous
          </Link>
          <Link href="/admin/activities?type=event" className={getFilterButtonClass('event')}>
            <CalendarDays className="w-4 h-4 mr-1.5" /> Événements
          </Link>
          <Link href="/admin/activities?type=track" className={getFilterButtonClass('track')}>
            <Music2 className="w-4 h-4 mr-1.5" /> Musique
          </Link>
          <Link href="/admin/activities?type=ticket" className={getFilterButtonClass('ticket')}>
            <Ticket className="w-4 h-4 mr-1.5" /> Billets
          </Link>
        </div>

        {/* Liste des activités regroupées par jour */}
        <div className="glass rounded-xl backdrop-blur-md overflow-hidden relative border border-purple-500/20 p-6">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 to-black/20"></div>
          <div className="relative z-10 space-y-6">
            {Object.keys(groupedActivities).length > 0 ? (
              <>
                {/* Contenu des activités regroupées par jour */}
                {Object.entries(groupedActivities).map(([dateKey, activities]) => (
                  <div key={dateKey}>
                    <h4 className="text-sm font-semibold text-purple-300 mb-2 sticky top-0 bg-black/60 backdrop-blur-sm py-2 px-3 rounded border-l-2 border-purple-400 -mx-2">
                      {formatGroupDate(dateKey)}
                    </h4>
                    <div className="space-y-3">
                      {activities.map((activity) => {
                        const Icon = activity.icon;
                        const relativeDate = formatDistanceToNow(activity.date, {
                          addSuffix: true,
                          locale: fr,
                        });
                        let bgColorClass = 'bg-gray-500/20';
                        let textColorClass = 'text-gray-400';
                        if (activity.type === 'event') {
                          bgColorClass = 'bg-purple-500/20';
                          textColorClass = 'text-purple-400';
                        } else if (activity.type === 'track') {
                          bgColorClass = 'bg-blue-500/20';
                          textColorClass = 'text-blue-400';
                        } else if (activity.type === 'ticket') {
                          bgColorClass = 'bg-pink-500/20';
                          textColorClass = 'text-pink-400';
                        }

                        const ActivityContent = () => (
                          <div className="flex items-center flex-grow min-w-0 mr-4">
                            <div className={`p-2 rounded-lg mr-4 flex-shrink-0 ${bgColorClass}`}>
                              <Icon className={`h-6 w-6 ${textColorClass}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium flex items-center truncate">
                                {activity.title}
                              </p>
                              <p className="text-sm text-gray-400 truncate">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        );

                        return activity.href ? (
                          <Link
                            key={activity.id}
                            href={activity.href}
                            scroll={false}
                            className={`bg-black/40 p-4 rounded-lg flex items-center justify-between transition-colors duration-200 hover:bg-black/60 cursor-pointer`}
                          >
                            <ActivityContent />
                            <span className="text-sm text-gray-500 flex-shrink-0 ml-auto pl-4">
                              {relativeDate}
                            </span>
                          </Link>
                        ) : (
                          <div
                            key={activity.id}
                            className={`bg-black/40 p-4 rounded-lg flex items-center justify-between cursor-default`}
                          >
                            <ActivityContent />
                            <span className="text-sm text-gray-500 flex-shrink-0 ml-auto pl-4">
                              {relativeDate}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Pagination moderne à afficher après le contenu s'il y a plus d'une page */}
                {totalPages > 1 && (
                  <ModernPagination
                    currentPage={page}
                    totalPages={totalPages}
                    baseUrl={getPaginationBaseUrl()}
                  />
                )}
              </>
            ) : (
              <div className="bg-black/30 p-4 rounded-lg text-center">
                <p className="text-gray-400">
                  Aucune activité {filterType ? `de type "${filterType}"` : ''} à afficher pour le
                  moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
