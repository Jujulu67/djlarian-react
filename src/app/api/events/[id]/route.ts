import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
// Réimporter Prisma pour JsonNull
import { Prisma } from '@prisma/client';
// Ne pas importer Prisma pour l'instant, testons avec null standard
// import { Prisma } from '@prisma/client';

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
        creator: {
          select: {
            name: true,
          },
        },
        tickets: true,
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
      { error: "Erreur lors de la récupération de l'événement" },
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

    console.log(
      `Attempting prisma.event.update for ${id} with data:`,
      JSON.stringify(dataToUpdate, null, 2)
    );

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: dataToUpdate,
      include: {
        tickets: true,
        creator: { select: { name: true } },
      },
    });

    console.log(`Event ${id} updated successfully.`);
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
