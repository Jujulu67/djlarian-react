import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

// Props incluant searchParams pour les filtres et la pagination
export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams?: {
    type?: string;
    page?: string;
    limit?: string;
  };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Accéder aux searchParams de manière asynchrone
  const filterType = searchParams?.type ? String(searchParams.type) : undefined;
  const currentPage = searchParams?.page ? String(searchParams.page) : '1';
  const currentLimit = searchParams?.limit ? String(searchParams.limit) : '10';

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
      // Note: le comptage pour les tickets peut être imprécis si basé sur TicketInfo sans filtre event existant
      totalItems = await prisma.ticketInfo.count(); // Compte tous les ticketInfo
      query = prisma.ticketInfo.findMany({
        take: limit,
        skip: skip,
        orderBy: { id: 'desc' },
        include: { event: { select: { id: true, title: true, createdAt: true } } },
      });
      const tickets = (await query).filter((ti) => ti.event);
      activitiesData = tickets.map((ti) => ({
        id: ti.id,
        type: 'ticket',
        date: ti.event!.createdAt,
        title: ti.event!.title,
        eventId: ti.event!.id,
      }));
    }
    // Pas besoin de trier ici, Prisma l'a déjà fait
  } else {
    // --- CAS: Aucun Filtre ("Tous") ---
    // Récupérer *toutes* les données pertinentes d'abord
    const allEvents = await prisma.event.findMany({
      select: { id: true, title: true, createdAt: true },
    });
    const allTracks = await prisma.track.findMany({
      select: { id: true, title: true, createdAt: true },
    });
    const allTickets = await prisma.ticketInfo.findMany({
      include: { event: { select: { id: true, title: true, createdAt: true } } },
    });

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
        .filter((ti) => ti.event)
        .map((ti) => ({
          id: ti.id,
          type: 'ticket' as ActivityType,
          date: ti.event!.createdAt,
          title: ti.event!.title,
          eventId: ti.event!.id,
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
        href = data.id ? `/admin/events/${data.id}/detail` : undefined;
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
        // Lien vers l'événement associé
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

  // Fonction pour générer l'URL de pagination (corrigée et simplifiée)
  const getPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    // Conserver le filtre de type s'il est présent
    if (filterType) {
      // Utiliser la variable déjà lue
      params.set('type', filterType);
    }
    // Définir la nouvelle page
    params.set('page', newPage.toString());
    return `/admin/activities?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0c0117] to-black text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Lien Retour */}
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour au Panel
          </Link>
        </div>

        {/* En-tête */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center mb-4">
            <Clock className="h-10 w-10 mr-4 text-purple-400" />
            <h1 className="text-5xl font-audiowide">
              <span className="text-gradient">Historique des Activités</span>
            </h1>
          </div>
          <div className="bg-purple-500/30 h-1 w-40 mx-auto rounded-full mb-6"></div>
        </div>

        {/* Filtres */}
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
              Object.entries(groupedActivities).map(([dateKey, activities]) => (
                <div key={dateKey}>
                  <h4 className="text-sm font-semibold text-purple-300 mb-2 sticky top-0 bg-[#0c0117]/80 backdrop-blur-sm py-1 px-2 rounded -mx-2">
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
                            <p className="text-sm text-gray-400 truncate">{activity.description}</p>
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
              ))
            ) : (
              <div className="bg-black/30 p-4 rounded-lg text-center">
                <p className="text-gray-400">
                  Aucune activité {filterType ? `de type "${filterType}"` : ''} à afficher pour le
                  moment.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-purple-500/20 flex justify-between items-center">
              <Link
                href={getPageUrl(page - 1)}
                className={`inline-flex items-center px-4 py-2 border border-purple-500/30 text-sm font-medium rounded-md text-purple-300 bg-black/30 hover:bg-purple-900/40 transition-colors ${page <= 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Précédent
              </Link>
              <span className="text-sm text-gray-400">
                Page {page} sur {totalPages}
              </span>
              <Link
                href={getPageUrl(page + 1)}
                className={`inline-flex items-center px-4 py-2 border border-purple-500/30 text-sm font-medium rounded-md text-purple-300 bg-black/30 hover:bg-purple-900/40 transition-colors ${page >= totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
              >
                Suivant
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
