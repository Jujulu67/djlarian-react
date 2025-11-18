import { NextRequest, NextResponse } from 'next/server';
import { listR2Files, deleteFromR2, isR2Configured } from '@/lib/r2';


// GET - Récupérer toutes les images
export async function GET() {
  try {
    // Utiliser R2 uniquement (Edge Runtime ne supporte pas fs)
    if (!isR2Configured) {
      console.warn('R2 not configured, returning empty images list');
      return NextResponse.json({ images: [] }, { status: 200 });
    }

    const images = await listR2Files();
    return NextResponse.json({ images }, { status: 200 });
  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des images' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une image spécifique
export async function DELETE(request: NextRequest) {
  try {
    if (!isR2Configured) {
      return NextResponse.json(
        { error: 'R2 not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier requis' }, { status: 400 });
    }

    // Supprimer le fichier de R2
    await deleteFromR2(filename);

    return NextResponse.json(
      { success: true, message: 'Image supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'image" },
      { status: 500 }
    );
  }
}
