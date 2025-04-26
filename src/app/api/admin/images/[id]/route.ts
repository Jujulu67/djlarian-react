import { NextRequest, NextResponse } from 'next/server';

// Référence à la liste partagée avec le endpoint parent
import { removeImage } from '../../images/shared';

// DELETE /api/admin/images/[id] - Supprime une image par ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json({ error: "ID d'image manquant" }, { status: 400 });
    }

    const success = removeImage(id);

    if (!success) {
      return NextResponse.json({ error: 'Image non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Image supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
