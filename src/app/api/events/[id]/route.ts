import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { requireAdmin } from '@/lib/api/requireAuth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createForbiddenResponse } from '@/lib/api/responseHelpers';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

// GET - Récupérer un événement spécifique par son ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    logger.debug(`Fetching event with ID: ${id}`);

    const session = await auth();
    const isAdmin = session?.user?.role === 'ADMIN';

    // Récupérer la date virtuelle depuis le paramètre de requête au lieu de l'ID
    const searchParams = request.nextUrl.searchParams;
    const virtualStartDate = searchParams.get('date');

    if (virtualStartDate) {
      logger.debug(`Virtual date from query parameter: ${virtualStartDate}`);
    }

    // Récupérer l'événement avec ses tickets associés
    const event = await prisma.event.findUnique({
      where: { id },
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
        other_Event: {
          select: {
            id: true,
            startDate: true,
          },
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    // Si l'événement n'existe pas
    if (!event) {
      return handleApiError(new Error('Événement non trouvé'), 'GET /api/events/[id]');
    }

    // Publication automatique si la date est passée (avant le contrôle d'accès,
    // sinon un visiteur ne verrait l'événement qu'après sa première ouverture par un admin)
    if (event.publishAt && !event.isPublished && new Date(event.publishAt) <= new Date()) {
      await prisma.event.update({
        where: { id: event.id },
        data: { isPublished: true },
      });
      event.isPublished = true;
    }

    // Si l'événement n'est pas publié et que l'utilisateur n'est pas admin
    if (!event.isPublished && !isAdmin) {
      return createForbiddenResponse('Accès non autorisé');
    }

    // Si c'est un événement virtuel avec une date valide, modifier les dates
    if (virtualStartDate) {
      try {
        logger.debug(
          `Creating virtual event based on master event ${id} with date ${virtualStartDate}`
        );

        // Calculer la durée entre la date de début et de fin de l'événement original
        let duration = 0;
        if (event.endDate) {
          duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
          logger.debug(`Original event duration: ${duration}ms`);
        }

        // Convertir la date virtuelle en objet Date puis en chaîne ISO pour assurer la cohérence
        const virtualDate = new Date(virtualStartDate);
        const formattedVirtualDate = virtualDate.toISOString();

        // Créer un événement virtuel basé sur l'événement maître
        const virtualEvent = {
          ...event,
          // Générer un ID virtuel pour référence interne uniquement
          id: `${id}___VIRTUAL___${formattedVirtualDate}`,
          // Remplacer complètement la date de début par la date virtuelle
          startDate: formattedVirtualDate,
          // Si l'événement a une date de fin, calculer la nouvelle date de fin
          endDate: event.endDate ? new Date(virtualDate.getTime() + duration).toISOString() : null,
          isVirtualOccurrence: true,
          virtualStartDate: formattedVirtualDate,
          masterId: id,
        };

        logger.debug(`Returning virtual event with date: ${virtualEvent.startDate}`);
        // Assurons-nous que la date virtuelle est bien appliquée
        logger.debug(
          `Date comparison - Original: ${event.startDate}, Virtual: ${virtualEvent.startDate}`
        );
        return createSuccessResponse(virtualEvent);
      } catch (error) {
        logger.error(`Error creating virtual event:`, error);
        return handleApiError(error, 'GET /api/events/[id]');
      }
    }

    logger.debug(`Returning regular event with date: ${event.startDate}`);

    // Formater l'événement pour correspondre à ce qu'attend le client
    const formattedEvent: Record<string, unknown> = { ...event };

    // Renommer les propriétés s'ils existent
    if ('TicketInfo' in event) {
      formattedEvent.tickets = event.TicketInfo;
      delete formattedEvent.TicketInfo;
    }

    if ('RecurrenceConfig' in event) {
      formattedEvent.recurrenceConfig = event.RecurrenceConfig;
      delete formattedEvent.RecurrenceConfig;
    }

    if ('User' in event) {
      formattedEvent.user = event.User;
      delete formattedEvent.User;
    }

    return createSuccessResponse(formattedEvent);
  } catch (error) {
    return handleApiError(error, 'GET /api/events/[id]');
  }
}

type JsonBody = Awaited<ReturnType<NextRequest['json']>>;

/** Champs simples de l'événement : seuls ceux présents dans la requête sont modifiés. */
function buildEventUpdate(body: JsonBody): Prisma.EventUpdateInput {
  const {
    title,
    description,
    location,
    address,
    startDate,
    endDate,
    status,
    isPublished,
    featured,
    imageId,
    publishAt,
  } = body;

  const dataToUpdate: Prisma.EventUpdateInput = {};

  if (title !== undefined) dataToUpdate.title = title;
  if (description !== undefined) dataToUpdate.description = description;
  if (location !== undefined) dataToUpdate.location = location;
  if (address !== undefined) dataToUpdate.address = address;
  if (startDate !== undefined) {
    dataToUpdate.startDate = startDate ? new Date(startDate) : undefined;
  }
  if (endDate !== undefined) {
    dataToUpdate.endDate = endDate ? new Date(endDate) : undefined;
  }
  if (status !== undefined) dataToUpdate.status = status;
  if (isPublished !== undefined) dataToUpdate.isPublished = isPublished;
  if (featured !== undefined) dataToUpdate.featured = featured;
  if (publishAt !== undefined) dataToUpdate.publishAt = publishAt ? new Date(publishAt) : null;

  if (imageId !== undefined) {
    dataToUpdate.imageId = imageId;
  }

  return dataToUpdate;
}

/** Rattache l'événement à l'admin qui le modifie, si son compte existe. */
async function connectEditor(dataToUpdate: Prisma.EventUpdateInput, userId: string): Promise<void> {
  // Vérifier si l'utilisateur existe avant d'essayer d'établir la relation
  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (userExists) {
      dataToUpdate.User = {
        connect: { id: userId },
      };
    } else {
      logger.debug(`Utilisateur avec ID ${userId} n'existe pas dans la base de données`);
    }
  } catch (error) {
    logger.error("Erreur lors de la vérification de l'utilisateur:", error);
    // On continue sans établir la relation utilisateur
  }
}

async function applyTickets(
  dataToUpdate: Prisma.EventUpdateInput,
  id: string,
  tickets: JsonBody
): Promise<void> {
  try {
    // Vérifier si l'événement a déjà des tickets
    const existingTickets = await prisma.ticketInfo.findUnique({
      where: { eventId: id },
    });

    if (existingTickets) {
      // Mettre à jour les tickets existants
      dataToUpdate.TicketInfo = {
        update: {
          price: tickets.price !== undefined ? Number(tickets.price) : undefined,
          currency: tickets.currency || undefined,
          buyUrl: tickets.buyUrl || undefined,
          quantity: tickets.quantity !== undefined ? Number(tickets.quantity) : undefined,
          availableFrom: tickets.availableFrom ? new Date(tickets.availableFrom) : undefined,
          availableTo: tickets.availableTo ? new Date(tickets.availableTo) : undefined,
        },
      };
    } else {
      // Créer de nouveaux tickets
      dataToUpdate.TicketInfo = {
        create: {
          currency: (tickets.currency || 'EUR') as string,
          ...(tickets.price !== undefined && { price: Number(tickets.price) }),
          ...(tickets.buyUrl && { buyUrl: tickets.buyUrl as string }),
          ...(tickets.quantity !== undefined && { quantity: Number(tickets.quantity) }),
          ...(tickets.availableFrom && { availableFrom: new Date(tickets.availableFrom) }),
          ...(tickets.availableTo && { availableTo: new Date(tickets.availableTo) }),
        } as Prisma.TicketInfoCreateWithoutEventInput,
      };
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des tickets:', error);
  }
}

async function applyRecurrence(
  dataToUpdate: Prisma.EventUpdateInput,
  id: string,
  recurrence: JsonBody
): Promise<void> {
  try {
    // Vérifier si l'événement a déjà une configuration de récurrence
    const existingRecurrence = await prisma.recurrenceConfig.findUnique({
      where: { eventId: id },
    });

    if (existingRecurrence) {
      // Mettre à jour la configuration existante
      dataToUpdate.RecurrenceConfig = {
        update: {
          frequency: recurrence.frequency || undefined,
          day: recurrence.day !== undefined ? recurrence.day : undefined,
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
          excludedDates: recurrence.excludedDates || undefined,
        },
      };
    } else if (recurrence.isRecurring) {
      // Créer une nouvelle configuration de récurrence
      dataToUpdate.RecurrenceConfig = {
        create: {
          frequency: recurrence.frequency || 'weekly',
          day: recurrence.day || new Date().getDay(),
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
          excludedDates: recurrence.excludedDates || [],
        },
      };
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la récurrence:', error);
  }
}

/** Noms de propriétés attendus par le client. */
function formatUpdatedEvent<T extends object>(updatedEvent: T): Record<string, unknown> {
  const { TicketInfo, RecurrenceConfig, User, ...event } = updatedEvent as T & {
    TicketInfo?: unknown;
    RecurrenceConfig?: unknown;
    User?: unknown;
  };
  return { ...event, tickets: TicketInfo, recurrenceConfig: RecurrenceConfig, user: User };
}

// PATCH - Mettre à jour un événement existant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  logger.debug(`--- PATCH /api/events/${id} ---`);

  try {
    // Vérifier d'abord si l'événement existe
    const eventExists = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!eventExists) {
      return handleApiError(new Error('Événement non trouvé'), 'PATCH /api/events/[id]');
    }

    logger.debug(`[API] Event with ID ${id} found, proceeding with update`);

    const { session, error: authError } = await requireAdmin({
      onAnonymous: () => createForbiddenResponse('Non autorisé'),
      onNonAdmin: () => createForbiddenResponse('Non autorisé'),
    });
    if (authError) return authError;

    // Afficher les informations de session pour debug
    logger.debug('Session user info for update:', JSON.stringify(session.user, null, 2));

    const body = await request.json();
    logger.debug(`Request body for PATCH ${id}:`, body);

    const dataToUpdate = buildEventUpdate(body);
    await connectEditor(dataToUpdate, session.user.id);
    if (body.tickets) await applyTickets(dataToUpdate, id, body.tickets);
    if (body.recurrence) await applyRecurrence(dataToUpdate, id, body.recurrence);

    logger.debug(
      `Attempting prisma.event.update for ${id} with data:`,
      JSON.stringify(dataToUpdate, null, 2)
    );

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: dataToUpdate,
      include: {
        User: { select: { name: true } },
        TicketInfo: true,
        RecurrenceConfig: true,
        Event: {
          select: {
            id: true,
          },
        },
      },
    });

    logger.debug(`Event ${id} updated successfully.`);

    return createSuccessResponse(formatUpdatedEvent(updatedEvent));
  } catch (error) {
    return handleApiError(error, 'PATCH /api/events/[id]');
  }
}

// DELETE - Supprimer un événement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const resolvedParams = await params;
  try {
    const id = resolvedParams.id;
    // Vérifier l'authentification et les autorisations
    const { error: authError } = await requireAdmin({
      onAnonymous: () => createForbiddenResponse('Non autorisé'),
      onNonAdmin: () => createForbiddenResponse('Non autorisé'),
    });
    if (authError) return authError;

    // Vérifier si l'événement existe
    const eventExists = await prisma.event.findUnique({
      where: { id },
    });

    if (!eventExists) {
      return handleApiError(new Error('Événement non trouvé'), 'DELETE /api/events/[id]');
    }

    // Supprimer l'événement et ses tickets associés (cascade)
    await prisma.event.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/events/[id]');
  }
}
