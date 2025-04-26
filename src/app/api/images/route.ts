import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Fonction pour obtenir la liste des images du dossier uploads
async function getImagesFromUploads() {
  const uploadsDir = path.join(process.cwd(), 'public/uploads');

  try {
    // Vérifier si le dossier existe
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(uploadsDir);

    // Filtrer pour ne garder que les images
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = files.filter((file) =>
      imageExtensions.includes(path.extname(file).toLowerCase())
    );

    // Créer un objet pour chaque image avec des métadonnées
    return imageFiles.map((filename) => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);

      // Déterminer le type d'image basé sur le nom du fichier
      let type = 'Autre';
      if (filename.includes('cover')) type = 'Couverture';
      else if (filename.includes('event')) type = 'Événement';
      else if (filename.includes('staff')) type = 'Staff';

      return {
        id: filename,
        name: filename,
        path: `/uploads/${filename}`,
        type,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier uploads:', error);
    return [];
  }
}

// GET - Récupérer toutes les images
export async function GET() {
  try {
    const images = await getImagesFromUploads();
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
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Nom de fichier requis' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public/uploads', filename);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }

    // Supprimer le fichier
    fs.unlinkSync(filePath);

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
