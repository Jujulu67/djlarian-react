import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Préparer la condition de filtrage
    const where: Prisma.EventWhereInput = {
      // Pour les non-admins, ne montrer que les événements publiés
      ...(isAdmin ? {} : { isPublished: true }),

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
        user: {
          select: {
            name: true,
          },
        },
        tickets: true,
        recurrenceConfig: true,
        master: {
          select: {
            id: true,
          },
        },
        occurrences: {
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

    // Compter le nombre total d'événements pour la pagination
    const total = await prisma.event.count({ where });

    return NextResponse.json({
      events,
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

    // Valider les données
    if (!body.title || !body.location || !body.startDate) {
      return NextResponse.json(
        { error: 'Titre, lieu et date de début sont requis' },
        { status: 400 }
      );
    }

    // Créer l'événement
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description || '',
        location: body.location,
        address: body.address,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        image: body.imageUrl || body.image,
        originalImageUrl: body.originalImageUrl,
        status: body.status || 'UPCOMING',
        isPublished: body.isPublished || false,
        featured: body.featured || false,
        userId: session.user.id,
        tickets: body.tickets
          ? {
              create: {
                price: body.tickets.price ? Number(body.tickets.price) : null,
                currency: body.tickets.currency || 'EUR',
                buyUrl: body.tickets.buyUrl,
                quantity: body.tickets.quantity ? Number(body.tickets.quantity) : null,
                availableFrom: body.tickets.availableFrom
                  ? new Date(body.tickets.availableFrom)
                  : null,
                availableTo: body.tickets.availableTo ? new Date(body.tickets.availableTo) : null,
              },
            }
          : undefined,
      },
      include: {
        tickets: true,
      },
    });

    // Vérifier si c'est un événement récurrent
    if (body.recurrence?.isRecurring) {
      // Événement récurrent - créer un événement maître et ses occurrences
      // Créer l'événement maître
      const masterEvent = await prisma.event.create({
        data: {
          title: body.title,
          description: body.description,
          location: body.location,
          address: body.address,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          status: body.status,
          isPublished: body.isPublished || false,
          featured: body.featured || false,
          image: body.imageUrl || body.image,
          originalImageUrl: body.originalImageUrl,
          userId: session.user.id,
          isMasterEvent: true, // Marquer comme événement maître
          recurrenceConfig: {
            create: {
              frequency: body.recurrence.frequency,
              day: body.recurrence.day,
              endDate: body.recurrence.endDate ? new Date(body.recurrence.endDate) : null,
            },
          },
          tickets: body.tickets
            ? {
                create: {
                  price: body.tickets.price,
                  currency: body.tickets.currency,
                  buyUrl: body.tickets.buyUrl,
                  quantity: body.tickets.quantity,
                },
              }
            : undefined,
        },
      });

      // Générer les dates récurrentes
      const recurringDates = generateRecurringDates(
        new Date(body.startDate),
        body.recurrence,
        body.recurrence.excludedDates || []
      );

      // Créer les occurrences d'événements
      const occurrencePromises = recurringDates.map((date, index) => {
        // Calculer la date de fin en fonction de la durée de l'événement maître
        let occurrenceEndDate = null;
        if (body.endDate) {
          const masterStartMs = new Date(body.startDate).getTime();
          const masterEndMs = new Date(body.endDate).getTime();
          const duration = masterEndMs - masterStartMs;

          occurrenceEndDate = new Date(date.getTime() + duration);
        }

        return prisma.event.create({
          data: {
            title: body.title,
            description: body.description,
            location: body.location,
            address: body.address,
            startDate: date,
            endDate: occurrenceEndDate,
            status: body.status,
            isPublished: body.isPublished || false,
            featured: body.featured || false,
            image: body.imageUrl || body.image,
            originalImageUrl: body.originalImageUrl,
            userId: session.user.id,
            masterId: masterEvent.id, // Référence à l'événement maître
            tickets: body.tickets
              ? {
                  create: {
                    price: body.tickets.price,
                    currency: body.tickets.currency,
                    buyUrl: body.tickets.buyUrl,
                    quantity: body.tickets.quantity,
                  },
                }
              : undefined,
          },
        });
      });

      // Attendre que toutes les occurrences soient créées
      await Promise.all(occurrencePromises);

      return NextResponse.json({ success: true, event: masterEvent }, { status: 201 });
    } else {
      // Événement non récurrent - créer un seul événement
      const event = await prisma.event.create({
        data: {
          title: body.title,
          description: body.description,
          location: body.location,
          address: body.address,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          status: body.status,
          isPublished: body.isPublished || false,
          featured: body.featured || false,
          image: body.imageUrl || body.image,
          originalImageUrl: body.originalImageUrl,
          userId: session.user.id,
          tickets: body.tickets
            ? {
                create: {
                  price: body.tickets.price,
                  currency: body.tickets.currency,
                  buyUrl: body.tickets.buyUrl,
                  quantity: body.tickets.quantity,
                },
              }
            : undefined,
        },
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
