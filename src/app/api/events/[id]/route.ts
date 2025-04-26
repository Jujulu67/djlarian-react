import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
// Réimporter Prisma pour JsonNull
import { Prisma } from '@prisma/client';
import { RecurrenceConfig } from '@/app/components/EventForm';
// Ne pas importer Prisma pour l'instant, testons avec null standard
// import { Prisma } from '@prisma/client';

// Fonction pour générer des dates récurrentes (copiée de /api/events/route.ts)
function generateRecurringDates(
  startDate: Date,
  recurrence: RecurrenceConfig,
  excludedDates: string[] = []
): Date[] {
  const dates: Date[] = [];
  const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

  // Date de début
  let currentDate = new Date(startDate);

  // Limiter à un maximum de 52 occurrences (1 an) si pas de date de fin
  const maxOccurrences = 52;
  let occurrenceCount = 0;

  // Générer des dates en fonction de la fréquence
  while ((!endDate || currentDate <= endDate) && occurrenceCount < maxOccurrences) {
    // Vérifier si cette date n'est pas exclue
    const dateString = currentDate.toISOString().split('T')[0];
    if (!excludedDates.includes(dateString)) {
      dates.push(new Date(currentDate));
    }

    // Passer à la prochaine date selon la fréquence
    if (recurrence.frequency === 'weekly') {
      // Ajouter 7 jours pour la prochaine semaine
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (recurrence.frequency === 'monthly') {
      // Ajouter un mois
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    occurrenceCount++;
  }

  return dates;
}

// GET - Récupérer un événement spécifique par son ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    console.log(`Fetching event with ID: ${id}`);

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    // Récupérer la date virtuelle depuis le paramètre de requête au lieu de l'ID
    const searchParams = request.nextUrl.searchParams;
    const virtualStartDate = searchParams.get('date');

    if (virtualStartDate) {
      console.log(`Virtual date from query parameter: ${virtualStartDate}`);
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
      console.log(`Event not found with ID: ${id}`);
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    // Si l'événement n'est pas publié et que l'utilisateur n'est pas admin
    if (!event.isPublished && !isAdmin) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Publication automatique si la date est passée
    const eventAny = event as any;
    if (eventAny.publishAt && !eventAny.isPublished && new Date(eventAny.publishAt) <= new Date()) {
      // Mettre à jour en base
      await prisma.event.update({
        where: { id: eventAny.id },
        data: { isPublished: true },
      });
      // Recharger l'événement à jour
      eventAny.isPublished = true;
    }

    // Si c'est un événement virtuel avec une date valide, modifier les dates
    if (virtualStartDate) {
      try {
        console.log(
          `Creating virtual event based on master event ${id} with date ${virtualStartDate}`
        );

        // Calculer la durée entre la date de début et de fin de l'événement original
        let duration = 0;
        if (event.endDate) {
          duration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
          console.log(`Original event duration: ${duration}ms`);
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

        console.log(`Returning virtual event with date: ${virtualEvent.startDate}`);
        // Assurons-nous que la date virtuelle est bien appliquée
        console.log(
          `Date comparison - Original: ${event.startDate}, Virtual: ${virtualEvent.startDate}`
        );
        return NextResponse.json(virtualEvent);
      } catch (error) {
        console.error(`Error creating virtual event:`, error);
      }
    }

    console.log(`Returning regular event with date: ${event.startDate}`);

    // Formater l'événement pour correspondre à ce qu'attend le client
    const formattedEvent = { ...event } as any;

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

    return NextResponse.json(formattedEvent);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'événement:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de l'événement",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour un événement existant
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = await Promise.resolve(params.id);
  console.log(`--- PATCH /api/events/${id} ---`);

  try {
    // Vérifier d'abord si l'événement existe
    const eventExists = await prisma.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!eventExists) {
      console.error(`[API] Event with ID ${id} not found`);
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    console.log(`[API] Event with ID ${id} found, proceeding with update`);

    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Afficher les informations de session pour debug
    console.log('Session user info for update:', JSON.stringify(session.user, null, 2));

    const body = await request.json();
    console.log(`Request body for PATCH ${id}:`, body);

    const {
      title,
      description,
      location,
      address,
      startDate,
      endDate,
      imageUrl,
      status,
      isPublished,
      featured,
      tickets,
      recurrence,
      imageId,
      publishAt,
    } = body;

    const dataToUpdate: any = {};

    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (location !== undefined) dataToUpdate.location = location;
    if (address !== undefined) dataToUpdate.address = address;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    dataToUpdate.endDate = endDate ? new Date(endDate) : null;
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
        console.log(`Utilisateur avec ID ${session.user.id} n'existe pas dans la base de données`);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'utilisateur:", error);
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
              price: tickets.price !== undefined ? Number(tickets.price) : 0,
              currency: tickets.currency || 'EUR',
              buyUrl: tickets.buyUrl || '',
              quantity: tickets.quantity !== undefined ? Number(tickets.quantity) : 0,
              availableFrom: tickets.availableFrom ? new Date(tickets.availableFrom) : null,
              availableTo: tickets.availableTo ? new Date(tickets.availableTo) : null,
            },
          };
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour des tickets:', error);
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
        console.error('Erreur lors de la mise à jour de la récurrence:', error);
      }
    }

    console.log(
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

    console.log(`Event ${id} updated successfully.`);

    // Formater l'événement pour correspondre à ce qu'attend le client
    const formattedEvent = { ...updatedEvent } as any;

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

    return NextResponse.json(formattedEvent);
  } catch (error: any) {
    console.error(`--- ERROR in PATCH /api/events/${id} ---`);
    console.error('Error details:', error);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    console.error('Stack trace:', error.stack);

    // Renvoi d'une réponse d'erreur plus détaillée pour le débogage
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error during update.',
        details: error.message,
        code: error.code,
        meta: error.meta,
      },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification et les autorisations
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'événement existe
    const eventExists = await prisma.event.findUnique({
      where: { id },
    });

    if (!eventExists) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    // Supprimer l'événement et ses tickets associés (cascade)
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'événement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'événement" },
      { status: 500 }
    );
  }
}
