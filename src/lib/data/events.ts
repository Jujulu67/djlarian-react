import { Prisma } from '@prisma/client';

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
    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    // Préparer la condition de filtrage
    const where: Prisma.EventWhereInput = {
      // Pour les non-admins, ne montrer que les événements publiés
      ...(isAdmin ? {} : { isPublished: true }),
      // Seulement les événements à venir
      startDate: {
        gte: new Date(),
      },
    };

    // Récupérer les événements
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      take: limit,
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

    // LOGIQUE AUTO-PUBLICATION
    for (const event of events) {
      if (event.publishAt && !event.isPublished && new Date(event.publishAt) <= new Date()) {
        await prisma.event.update({
          where: { id: event.id },
          data: { isPublished: true },
        });
        event.isPublished = true;
      }
    }

    // Formater les événements pour correspondre au type Event attendu par UpcomingEvents
    const formattedEvents: Event[] = events.map((event) => {
      const ticketInfo = event.TicketInfo as { buyUrl?: string } | null;

      return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: event.startDate.toISOString(),
        location: event.location,
        imageId: event.imageId,
        ticketUrl: ticketInfo?.buyUrl,
        isVirtual: false, // Par défaut, on peut l'ajouter au modèle si nécessaire
      };
    });

    return formattedEvents;
  } catch (error) {
    logger.error('Erreur lors de la récupération des événements', error);
    return [];
  }
}
