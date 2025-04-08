import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Vérifier l'authentification et les autorisations
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
    }

    // Vérifier la taille du fichier (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Créer un nom de fichier unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.name.split('.').pop();
    const filename = `event-${uniqueSuffix}.${extension}`;

    // Sauvegarder le fichier
    const publicPath = join(process.cwd(), 'public', 'uploads');
    const filePath = join(publicPath, filename);

    await writeFile(filePath, buffer);

    // Retourner l'URL de l'image
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du fichier' },
      { status: 500 }
    );
  }
}
