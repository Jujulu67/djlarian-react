import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// DELETE /api/users/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  // 1. Vérifier si l'utilisateur est admin
  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Non autorisé' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userIdToDelete = await params.id;

  // 2. Vérifier si l'admin essaie de se supprimer lui-même
  if (session.user.id === userIdToDelete) {
    return new NextResponse(
      JSON.stringify({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur' }),
      {
        status: 400, // Bad Request
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // 3. Supprimer l'utilisateur
    const deletedUser = await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    console.log(`Admin ${session.user.email} deleted user ${userIdToDelete}`);

    // 4. Renvoyer une réponse de succès
    return new NextResponse(null, { status: 204 }); // 204 No Content est approprié pour une suppression réussie
  } catch (error: any) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);

    // Gérer les erreurs spécifiques de Prisma (ex: utilisateur non trouvé)
    if (error.code === 'P2025') {
      // Record to delete does not exist.
      return new NextResponse(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Renvoyer une erreur générique
    return new NextResponse(JSON.stringify({ error: 'Erreur interne du serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
