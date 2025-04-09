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
    const id = params.id;
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    // Récupérer l'événement avec ses tickets associés
    const event = await prisma.event.findUnique({
      where: { id },
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

    // Si l'événement n'existe pas
    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    // Si l'événement n'est pas publié et que l'utilisateur n'est pas admin
    if (!event.isPublished && !isAdmin) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    return NextResponse.json(event);
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
  const id = params.id;
  console.log(`--- PATCH /api/events/${id} ---`);
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

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
      originalImageUrl,
      status,
      isPublished,
      featured,
      tickets,
      recurrence,
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

    if (imageUrl !== undefined) {
      dataToUpdate.image = imageUrl;
    }
    if (originalImageUrl !== undefined) {
      dataToUpdate.originalImageUrl = originalImageUrl;
    }

    // La gestion des tickets
    if (tickets === null || tickets === undefined) {
      // Au lieu de déconnecter les tickets, nous les laissons inchangés
      // car la relation est requise, nous ne pouvons pas simplement les déconnecter
      console.log(`Event ${id} tickets not modified (keeping existing tickets)`);
    } else if (typeof tickets === 'object' && tickets !== null) {
      console.log(`Event ${id} tickets provided, attempting upsert.`);
      dataToUpdate.tickets = {
        upsert: {
          create: {
            price: tickets.price ?? 0,
            currency: tickets.currency || 'EUR',
            buyUrl: tickets.buyUrl || '', // Assure une valeur par défaut
            quantity: tickets.quantity ?? 0,
          },
          update: {
            price: tickets.price ?? 0,
            currency: tickets.currency || 'EUR',
            buyUrl: tickets.buyUrl || '', // Assure une valeur par défaut
            quantity: tickets.quantity ?? 0,
          },
        },
      };
    }

    // Vérifier si l'événement est un maître ou une occurrence
    const eventInfo = await prisma.event.findUnique({
      where: { id },
      select: {
        masterId: true,
        startDate: true,
        endDate: true,
        recurrenceConfig: true,
      },
    });

    let createdOccurrences = [];

    // Gestion de la récurrence
    if (recurrence !== undefined) {
      if (eventInfo?.masterId) {
        console.log(`Event ${id} is an occurrence, cannot update recurrence configuration.`);
      } else {
        console.log(`Event ${id} recurrence config provided:`, recurrence);

        // Récupérer la configuration de récurrence actuelle
        const currentRecurrenceConfig = eventInfo?.recurrenceConfig;
        const wasRecurring = !!currentRecurrenceConfig;
        const becomesRecurring = recurrence && recurrence.isRecurring;

        if (becomesRecurring) {
          // Ajouter ou mettre à jour la configuration de récurrence
          dataToUpdate.recurrenceConfig = {
            upsert: {
              create: {
                frequency: recurrence.frequency,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                excludedDates: recurrence.excludedDates || [],
              },
              update: {
                frequency: recurrence.frequency,
                endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
                excludedDates: recurrence.excludedDates || [],
              },
            },
          };

          // Si l'événement n'était pas récurrent avant mais le devient maintenant,
          // ou si la configuration de récurrence a changé,
          // nous devons générer les occurrences
          if (
            !wasRecurring ||
            currentRecurrenceConfig?.frequency !== recurrence.frequency ||
            currentRecurrenceConfig?.endDate?.toString() !== recurrence.endDate
          ) {
            // Supprimer les occurrences existantes si nécessaire
            if (wasRecurring) {
              await prisma.event.deleteMany({
                where: {
                  masterId: id,
                },
              });
              console.log(`Deleted existing occurrences for master event ${id}`);
            }

            // Marquer l'événement comme maître
            dataToUpdate.isMasterEvent = true;

            // Générer les dates récurrentes
            const recurringDates = generateRecurringDates(
              eventInfo?.startDate || new Date(), // Fallback si eventInfo est null
              recurrence,
              recurrence.excludedDates || []
            );

            console.log(`Generated ${recurringDates.length} recurring dates for event ${id}`);

            // Créer les occurrences d'événements
            const occurrencePromises = recurringDates.map((date) => {
              // Calculer la date de fin en fonction de la durée de l'événement maître
              let occurrenceEndDate = null;
              if (eventInfo?.endDate) {
                const masterStartMs = eventInfo.startDate.getTime();
                const masterEndMs = eventInfo.endDate.getTime();
                const duration = masterEndMs - masterStartMs;
                occurrenceEndDate = new Date(date.getTime() + duration);
              }

              return prisma.event.create({
                data: {
                  title: title || undefined,
                  description: description || undefined,
                  location: location || undefined,
                  address: address || undefined,
                  startDate: date,
                  endDate: occurrenceEndDate,
                  status: status || undefined,
                  isPublished: isPublished !== undefined ? isPublished : undefined,
                  featured: featured !== undefined ? featured : undefined,
                  image: imageUrl || undefined,
                  originalImageUrl: originalImageUrl || undefined,
                  userId: session.user.id,
                  masterId: id, // Référence à l'événement maître
                  tickets: tickets
                    ? {
                        create: {
                          price: tickets.price ?? 0,
                          currency: tickets.currency || 'EUR',
                          buyUrl: tickets.buyUrl || '',
                          quantity: tickets.quantity ?? 0,
                        },
                      }
                    : undefined,
                },
              });
            });

            // Attendre que toutes les occurrences soient créées
            createdOccurrences = await Promise.all(occurrencePromises);
            console.log(`Created ${createdOccurrences.length} occurrences for event ${id}`);
          }
        } else {
          // Si isRecurring est false, on supprime la configuration de récurrence
          dataToUpdate.recurrenceConfig = {
            delete: true,
          };

          // Si l'événement était récurrent mais ne l'est plus, supprimer les occurrences
          if (wasRecurring) {
            await prisma.event.deleteMany({
              where: {
                masterId: id,
              },
            });
            dataToUpdate.isMasterEvent = false;
            console.log(`Deleted occurrences for event ${id} as it's no longer recurring`);
          }
        }
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
        user: { select: { name: true } },
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

    console.log(`Event ${id} updated successfully.`);

    // Ajout des informations sur les occurrences créées si nécessaire
    if (createdOccurrences.length > 0) {
      console.log(`${createdOccurrences.length} occurrences were created for this event.`);
    }

    return NextResponse.json(updatedEvent);
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
