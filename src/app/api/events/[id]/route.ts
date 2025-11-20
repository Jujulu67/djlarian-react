import { NextRequest } from 'next/server';
import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createForbiddenResponse } from '@/lib/api/responseHelpers';

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

    // Si l'événement n'est pas publié et que l'utilisateur n'est pas admin
    if (!event.isPublished && !isAdmin) {
      return createForbiddenResponse('Accès non autorisé');
    }

    // Publication automatique si la date est passée
    if (event.publishAt && !event.isPublished && new Date(event.publishAt) <= new Date()) {
      // Mettre à jour en base
      await prisma.event.update({
        where: { id: event.id },
        data: { isPublished: true },
      });
      // Recharger l'événement à jour
      event.isPublished = true;
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

    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createForbiddenResponse('Non autorisé');
    }

    // Afficher les informations de session pour debug
    logger.debug('Session user info for update:', JSON.stringify(session.user, null, 2));

    const body = await request.json();
    logger.debug(`Request body for PATCH ${id}:`, body);

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
      tickets,
      recurrence,
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

    // Vérifier si l'utilisateur existe avant d'essayer d'établir la relation
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (userExists) {
        dataToUpdate.User = {
          connect: { id: session.user.id },
        };
      } else {
        logger.debug(`Utilisateur avec ID ${session.user.id} n'existe pas dans la base de données`);
      }
    } catch (error) {
      logger.error("Erreur lors de la vérification de l'utilisateur:", error);
      // On continue sans établir la relation utilisateur
    }

    if (imageId !== undefined) {
      dataToUpdate.imageId = imageId;
    }

    // Mettre à jour les tickets si fournis
    if (tickets) {
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

    // Mettre à jour les paramètres de récurrence si fournis
    if (recurrence) {
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

    // Formater l'événement pour correspondre à ce qu'attend le client
    const formattedEvent: Record<string, unknown> = { ...updatedEvent };

    // Renommer les propriétés s'ils existent
    if ('TicketInfo' in updatedEvent) {
      formattedEvent.tickets = updatedEvent.TicketInfo;
      delete formattedEvent.TicketInfo;
    }

    if ('RecurrenceConfig' in updatedEvent) {
      formattedEvent.recurrenceConfig = updatedEvent.RecurrenceConfig;
      delete formattedEvent.RecurrenceConfig;
    }

    if ('User' in updatedEvent) {
      formattedEvent.user = updatedEvent.User;
      delete formattedEvent.User;
    }

    return createSuccessResponse(formattedEvent);
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
    const session = await auth();

    // Vérifier l'authentification et les autorisations
    if (!session?.user || session.user.role !== 'ADMIN') {
      return createForbiddenResponse('Non autorisé');
    }

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
