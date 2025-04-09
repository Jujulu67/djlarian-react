import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - Récupérer tous les événements (avec filtres optionnels)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublished = searchParams.get('isPublished');
    const status = searchParams.get('status');

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN';

    // Construire la requête en fonction des paramètres
    const whereClause: any = {};

    // Si l'utilisateur n'est pas administrateur, montrer uniquement les événements publiés
    if (!isAdmin) {
      whereClause.isPublished = true;
    } else if (isPublished !== null) {
      // Si un admin spécifie le filtre de publication
      whereClause.isPublished = isPublished === 'true';
    }

    // Ajouter le filtre de statut si spécifié
    if (status) {
      whereClause.status = status;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: {
        startDate: 'asc',
      },
      include: {
        creator: {
          select: {
            name: true,
          },
        },
        tickets: true,
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des événements',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
        createdBy: session.user.id,
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

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de l'événement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}
