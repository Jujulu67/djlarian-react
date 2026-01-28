import { Prisma } from '@prisma/client';
import { addDays, addMonths } from 'date-fns';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { Event } from '@/types';

/**
 * Récupère les événements publiés pour la page d'accueil
 * Limite aux événements à venir, triés par date
 */
export async function getUpcomingEvents(limit: number = 3): Promise<Event[]> {
  try {
    let session = null;
    try {
      session = await auth();
    } catch (e) {
      // Possible outside of request context
    }
    const isAdmin = session?.user?.role === 'ADMIN';

    // Préparer la condition de filtrage
    const where: Prisma.EventWhereInput = {
      // Pour les non-admins, ne montrer que les événements publiés
      ...(isAdmin ? {} : { isPublished: true }),
      // On récupère les événements maîtres (potentiellement passés) car ils peuvent générer des occurrences futures
      OR: [
        {
          startDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        {
          RecurrenceConfig: { isNot: null },
        },
      ],
    };

    // Récupérer les événements
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        User: {
          select: {
            name: true,
          },
        },
        TicketInfo: true,
        RecurrenceConfig: true,
        Event: {
          select: {
            id: true,
          },
        },
      },
    });

    // Logique d'expansion des récurrences
    const allEvents: Event[] = [];
    const now = new Date();

    for (const event of events) {
      // Ajouter l'événement principal si il est dans le futur
      const isMasterUpcoming = new Date(event.startDate) >= new Date(now.setHours(0, 0, 0, 0));

      if (isMasterUpcoming) {
        allEvents.push({
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: event.startDate.toISOString(),
          location: event.location,
          imageId: event.imageId,
          ticketUrl: (event.TicketInfo as any)?.buyUrl,
          isVirtual: false,
        });
      }

      // Générer les occurrences virtuelles si il y a une récurrence
      if (event.RecurrenceConfig) {
        const config = event.RecurrenceConfig as any;
        const occurrences = generateOccurrences(event, config);

        for (const occDate of occurrences) {
          if (occDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
            allEvents.push({
              id: `${event.id}_virtual_${occDate.toISOString()}`,
              title: event.title,
              description: event.description || '',
              date: occDate.toISOString(),
              location: event.location,
              imageId: event.imageId,
              ticketUrl: (event.TicketInfo as any)?.buyUrl,
              isVirtual: true,
            });
          }
        }
      }
    }

    // Trier par date et limiter
    return allEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements', error);
    return [];
  }
}

/**
 * Génère les prochaines occurrences pour un événement récurrent
 */
function generateOccurrences(event: any, config: any): Date[] {
  const occurrences: Date[] = [];
  const start = new Date(event.startDate);
  const end = config.endDate ? new Date(config.endDate) : null;
  const maxSearch = new Date();

  if (config.frequency === 'weekly') {
    maxSearch.setDate(maxSearch.getDate() + 42); // 6 semaines
  } else {
    maxSearch.setMonth(maxSearch.getMonth() + 6); // 6 mois
  }

  let current = new Date(start);

  // Avancer jusqu'à la prochaine occurrence
  const step = () => {
    if (config.frequency === 'weekly') {
      current = addDays(current, 7);
    } else {
      current = addMonths(current, 1);
    }
  };

  step(); // Première occurrence virtuelle après le maître

  while ((!end || current <= end) && current <= maxSearch) {
    const isExcluded = ((config.excludedDates as string[]) || []).includes(
      current.toISOString().split('T')[0]
    );
    if (!isExcluded) {
      occurrences.push(new Date(current));
    }
    step();
  }

  return occurrences;
}
