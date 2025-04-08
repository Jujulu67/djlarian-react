import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - Récupérer un événement spécifique par son ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = (await params).id;
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
  try {
    const id = (await params).id;
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification et les autorisations
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();

    // Vérifier si l'événement existe
    const eventExists = await prisma.event.findUnique({
      where: { id },
    });

    if (!eventExists) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    // Mettre à jour l'événement
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        location: body.location,
        address: body.address,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
        image: body.image,
        status: body.status,
        isPublished: body.isPublished,
        featured: body.featured,
        tickets: body.tickets
          ? {
              upsert: {
                create: {
                  price: body.tickets.price,
                  currency: body.tickets.currency || 'EUR',
                  buyUrl: body.tickets.buyUrl,
                  availableFrom: body.tickets.availableFrom
                    ? new Date(body.tickets.availableFrom)
                    : null,
                  availableTo: body.tickets.availableTo ? new Date(body.tickets.availableTo) : null,
                  quantity: body.tickets.quantity,
                },
                update: {
                  price: body.tickets.price,
                  currency: body.tickets.currency || 'EUR',
                  buyUrl: body.tickets.buyUrl,
                  availableFrom: body.tickets.availableFrom
                    ? new Date(body.tickets.availableFrom)
                    : null,
                  availableTo: body.tickets.availableTo ? new Date(body.tickets.availableTo) : null,
                  quantity: body.tickets.quantity,
                },
              },
            }
          : undefined,
      },
      include: {
        tickets: true,
        creator: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'événement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'événement" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = (await params).id;
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
