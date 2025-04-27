import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma';
import { RecurrenceConfig } from '@/app/components/EventForm';
import { Prisma } from '@prisma/client';

// GET - Récupérer tous les événements avec filtres optionnels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';
    const isAuthenticated = !!session;

    // Filtres optionnels
    const titleFilter = searchParams.get('title');
    const startDateFilter = searchParams.get('startDate');
    const endDateFilter = searchParams.get('endDate');
    const categoryFilter = searchParams.get('category');
    const typeFilter = searchParams.get('type');
    const isPublishedParam = searchParams.get('isPublished');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Préparer la condition de filtrage
    const where: Prisma.EventWhereInput = {
      // Pour les non-admins, ne montrer que les événements publiés
      // Si un paramètre isPublished est fourni, l'utiliser à la place
      ...(isPublishedParam !== null
        ? { isPublished: isPublishedParam === 'true' }
        : isAdmin
          ? {}
          : { isPublished: true }),

      // Filtres
      ...(titleFilter
        ? {
            title: {
              contains: titleFilter,
              mode: 'insensitive',
            },
          }
        : {}),

      ...(startDateFilter
        ? {
            startDate: {
              gte: new Date(startDateFilter),
            },
          }
        : {}),

      ...(endDateFilter
        ? {
            endDate: {
              lte: new Date(endDateFilter),
            },
          }
        : {}),

      // Désactivation temporaire des filtres de catégorie et type
      // qui ne sont pas implémentés dans le modèle actuel
      /*
      ...(categoryFilter
        ? {
            category: categoryFilter as EventCategory,
          }
        : {}),

      ...(typeFilter
        ? {
            type: typeFilter as EventType,
          }
        : {}),
      */
    };

    // Récupérer les événements avec pagination
    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      skip,
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

    // LOGIQUE AUTO-PUBLICATION (copiée du GET unitaire)
    for (const event of events) {
      const eventAny = event as any;
      if (
        eventAny.publishAt &&
        !eventAny.isPublished &&
        new Date(eventAny.publishAt) <= new Date()
      ) {
        await prisma.event.update({
          where: { id: eventAny.id },
          data: { isPublished: true },
        });
        eventAny.isPublished = true;
      }
    }

    // LOGS DEBUG EVENTS
    console.log(`[API] GET /api/events - Nombre d'événements retournés : ${events.length}`);
    events.forEach((ev) => {
      console.log(`[API] Event: id=${ev.id}, imageId=${ev.imageId}, title=${ev.title}`);
    });

    // Compter le nombre total d'événements pour la pagination
    const total = await prisma.event.count({ where });

    // Formater les événements pour correspondre à ce qu'attend le client
    const formattedEvents = events.map((event) => {
      const formattedEvent = { ...event } as any;

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
      if ('Event' in event && event.Event !== null) {
        formattedEvent.master = event.Event;
        delete formattedEvent.Event;
      }

      return formattedEvent;
    });

    return NextResponse.json({
      events: formattedEvents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des événements',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Fonction pour générer des dates récurrentes
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

// POST - Créer un nouvel événement
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Vérifier l'authentification et les autorisations
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Log du body reçu pour debug
    console.log('[API EVENTS] Body reçu:', JSON.stringify(body, null, 2));

    // Valider les données
    if (!body.title || !body.location || !body.startDate) {
      return NextResponse.json(
        { error: 'Titre, lieu et date de début sont requis' },
        { status: 400 }
      );
    }

    // Afficher les informations de session pour debug
    console.log('Session user info:', JSON.stringify(session.user, null, 2));

    // Vérifier si l'utilisateur existe avant d'essayer d'établir la relation
    let userConnect = {};

    try {
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (userExists) {
        userConnect = {
          User: {
            connect: { id: session.user.id },
          },
        };
      } else {
        console.log(`Utilisateur avec ID ${session.user.id} n'existe pas dans la base de données`);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'utilisateur:", error);
      // On continue sans établir la relation utilisateur
    }

    // Préparer les données communes de l'événement
    const commonEventData: any = {
      title: body.title,
      description: body.description || '',
      location: body.location,
      address: body.address || '',
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      imageId: body.imageId || null,
      status: body.status || 'UPCOMING',
      isPublished: body.isPublished !== undefined ? body.isPublished : false,
      featured: body.featured !== undefined ? body.featured : false,
      ...userConnect, // Ajouter la relation utilisateur seulement si l'utilisateur existe
    };
    // Ajout de publishAt si présent
    if (body.publishAt) {
      commonEventData.publishAt = new Date(body.publishAt);
    }

    // Log du commonEventData juste avant création
    console.log(
      '[API EVENTS] commonEventData avant create:',
      JSON.stringify(commonEventData, null, 2)
    );

    // Ajouter tickets si présents
    if (body.tickets) {
      commonEventData.TicketInfo = {
        create: {
          price: body.tickets.price !== undefined ? Number(body.tickets.price) : 0,
          currency: body.tickets.currency || 'EUR',
          buyUrl: body.tickets.buyUrl || '',
          quantity: body.tickets.quantity !== undefined ? Number(body.tickets.quantity) : 0,
          availableFrom: body.tickets.availableFrom ? new Date(body.tickets.availableFrom) : null,
          availableTo: body.tickets.availableTo ? new Date(body.tickets.availableTo) : null,
        },
      };
    }

    // Vérifier si c'est un événement récurrent
    if (body.recurrence?.isRecurring) {
      try {
        console.log("Création d'un événement récurrent:", {
          title: body.title,
          startDate: body.startDate,
          recurrence: body.recurrence,
        });

        // Valider les données de récurrence
        if (!body.recurrence.frequency) {
          console.error('Fréquence de récurrence manquante');
          return NextResponse.json(
            { error: 'La fréquence de récurrence est requise' },
            { status: 400 }
          );
        }

        // Créer l'événement maître
        const masterEvent = await prisma.event.create({
          data: {
            ...commonEventData,
            isMasterEvent: true, // Marquer comme événement maître
            // Créer la configuration de récurrence
            RecurrenceConfig: {
              create: {
                frequency: body.recurrence.frequency,
                day: body.recurrence.day !== undefined ? Number(body.recurrence.day) : undefined,
                endDate: body.recurrence.endDate ? new Date(body.recurrence.endDate) : null,
                excludedDates: body.recurrence.excludedDates || Prisma.JsonNull,
              },
            },
          },
          include: {
            RecurrenceConfig: true,
          },
        });

        console.log('✅ Événement maître créé:', masterEvent.id);

        // Calculer virtuellement combien d'occurrences seraient générées
        const recurringDates = generateRecurringDates(
          new Date(body.startDate),
          body.recurrence,
          body.recurrence.excludedDates || []
        );

        console.log(
          `${recurringDates.length} dates seraient générées pour cet événement récurrent`
        );
        console.log("Les occurrences seront générées virtuellement lors de l'affichage");

        return NextResponse.json(
          {
            success: true,
            event: masterEvent,
            virtualOccurrencesCount: recurringDates.length,
          },
          { status: 201 }
        );
      } catch (recurrenceError) {
        console.error("Erreur lors de la création d'événement récurrent:", recurrenceError);
        return NextResponse.json(
          {
            error: "Erreur lors de la création d'événement récurrent",
            details:
              recurrenceError instanceof Error ? recurrenceError.message : String(recurrenceError),
          },
          { status: 500 }
        );
      }
    } else {
      // Événement non récurrent - créer un seul événement
      console.log("Création d'un événement simple (non récurrent)");
      const event = await prisma.event.create({
        data: commonEventData,
      });

      return NextResponse.json({ success: true, event }, { status: 201 });
    }
  } catch (error) {
    console.error("Erreur lors de la création de l'événement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}
