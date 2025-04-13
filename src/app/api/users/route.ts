import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// POST /api/users
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // 1. Vérifier si l'utilisateur est admin
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { email, name, password, role } = body;

    // 2. Valider les données reçues (simple validation)
    if (!email || !password || !role) {
      return new NextResponse(
        JSON.stringify({ error: 'Données manquantes (email, password, role)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (role !== 'ADMIN' && role !== 'USER') {
      return new NextResponse(
        JSON.stringify({ error: 'Rôle invalide. Doit être ADMIN ou USER.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse(JSON.stringify({ error: 'Cet email est déjà utilisé' }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10); // 10 est le nombre de tours de salage

    // 5. Créer l'utilisateur en base de données
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null, // Utiliser null si name n'est pas fourni
        hashedPassword,
        role,
        emailVerified: new Date(), // Considérer l'email comme vérifié si créé par admin
      },
      select: {
        // Sélectionner les champs à renvoyer (sans le mot de passe hashé)
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    console.log(`Admin ${session.user.email} created user ${newUser.email}`);

    // 6. Renvoyer l'utilisateur créé
    return new NextResponse(JSON.stringify(newUser), {
      status: 201, // Created
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return new NextResponse(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
