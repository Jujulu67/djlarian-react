// Note: Pas de Edge Runtime car bcrypt nécessite Node.js
// TODO: Utiliser une alternative à bcrypt compatible Edge ou garder Node.js runtime
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User as PrismaUser } from '@prisma/client';

// Schéma Zod adapté
const updateUserSchema = z
  .object({
    email: z.string().email("Format d'email invalide.").optional(),
    name: z.string().nullable().optional(),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.').optional(),
    role: z.string().optional(),
    isVip: z.boolean().optional(),
  })
  .strict();

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = await params;
  console.log(`PUT /api/users/${resolvedParams.userId} - Requête reçue`);

  const userId = resolvedParams.userId;
  if (!userId) {
    console.error('PUT /api/users - userId manquant dans les params');
    return NextResponse.json({ error: 'ID utilisateur manquant.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
    console.log(`PUT /api/users/${userId} - Corps reçu:`, body);
  } catch (error) {
    console.error(`PUT /api/users/${userId} - Erreur parsing JSON:`, error);
    return NextResponse.json({ error: 'Requête invalide (JSON mal formé).' }, { status: 400 });
  }

  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    console.error(`PUT /api/users/${userId} - Erreur validation Zod:`, validation.error.flatten());
    return NextResponse.json(
      { error: 'Données invalides.', details: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  console.log(`PUT /api/users/${userId} - Validation réussie:`, validation.data);
  const { email, name, password, role, isVip } = validation.data;

  const dataToUpdate: Partial<PrismaUser> = {};
  if (email !== undefined) dataToUpdate.email = email;
  if (name !== undefined) dataToUpdate.name = name;
  if (role !== undefined) dataToUpdate.role = role;
  if (isVip !== undefined) (dataToUpdate as any).isVip = isVip;
  if (password) {
    try {
      // Assurez-vous que le champ dans Prisma s'appelle bien hashedPassword
      const hashedPassword = await bcrypt.hash(password, 10);
      dataToUpdate.hashedPassword = hashedPassword;
      console.log(`PUT /api/users/${userId} - Hashage du mot de passe effectué.`);
    } catch (hashError) {
      console.error(`PUT /api/users/${userId} - Erreur hashage mot de passe:`, hashError);
      return NextResponse.json(
        { error: 'Erreur interne lors de la préparation des données.' },
        { status: 500 }
      );
    }
  }

  if (Object.keys(dataToUpdate).length === 0) {
    console.log(`PUT /api/users/${userId} - Aucune donnée à mettre à jour fournie.`);
    return NextResponse.json({ error: 'Aucune donnée à mettre à jour fournie.' }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      console.error(`PUT /api/users/${userId} - Utilisateur non trouvé.`);
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 });
    }

    console.log(`PUT /api/users/${userId} - Mise à jour avec données:`, dataToUpdate);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    console.log(
      `PUT /api/users/${userId} - Mise à jour réussie (objet complet retourné):`,
      updatedUser
    );
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error(`PUT /api/users/${userId} - Erreur Prisma update:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé par un autre compte.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la mise à jour.' },
      { status: 500 }
    );
  }
}

// Remplacer l'appel à fallback par la vraie logique DELETE
export async function DELETE(
  request: Request, // request n'est pas utilisé mais requis par la signature
  { params }: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await params;
  const userId = resolvedParams.userId;
  console.log(`DELETE /api/users/${userId} - Requête reçue`);

  if (!userId) {
     console.error("DELETE /api/users - userId manquant dans les params");
    return NextResponse.json({ error: 'ID utilisateur manquant.' }, { status: 400 });
  }

  try {
    // Vérifier si l'utilisateur existe avant de tenter de le supprimer
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      console.warn(`DELETE /api/users/${userId} - Utilisateur non trouvé (déjà supprimé?).`);
      // Retourner 404 si l'utilisateur n'existe pas
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 });
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`DELETE /api/users/${userId} - Suppression réussie.`);
    // Retourner une réponse de succès sans contenu
    return new NextResponse(null, { status: 204 });

  } catch (error: any) {
    console.error(`DELETE /api/users/${userId} - Erreur Prisma delete:`, error);
    // Gérer les erreurs potentielles (ex: contraintes de clé étrangère si la suppression cascade n'est pas configurée)
    // Code P2014: Violation de contrainte (ex: relation requise existe toujours)
     if (error.code === 'P2014' || error.code === 'P2003') {
         return NextResponse.json({ error: 'Impossible de supprimer cet utilisateur car il est lié à d\'autres données (événements, pistes, etc.).' }, { status: 409 }); // Conflit
     }
     // Code P2025: Record to delete does not exist (déjà géré par findUnique avant)

    return NextResponse.json({ error: 'Erreur interne du serveur lors de la suppression.' }, { status: 500 });
  }
}

// Fonction helper pour gérer les autres méthodes
async function handleUnsupportedMethod(request: Request) {
  console.log(`Unsupported API Route ${request.method} ${request.url} - Méthode non autorisée`);
  if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PATCH') {
     return NextResponse.json(
       { error: `Méthode ${request.method} non autorisée.` },
       { status: 405 }
     );
  }
  return NextResponse.json({ error: `Requête non gérée.` }, { status: 400 });
}

// Les exports pour GET, POST, PATCH
export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) { return handleUnsupportedMethod(request); }
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) { return handleUnsupportedMethod(request); }
export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) { return handleUnsupportedMethod(request); }
