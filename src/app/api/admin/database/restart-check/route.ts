import fs from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';
// Route pour vérifier si le serveur est prêt après redémarrage
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');

    // Vérifier si un redémarrage est requis
    let restartRequired = false;
    try {
      const markerContent = await fs.readFile(restartMarkerPath, 'utf-8');
      const marker = JSON.parse(markerContent);
      restartRequired = marker.requiresRestart === true;
    } catch {
      // Fichier n'existe pas, pas de redémarrage requis
    }

    return NextResponse.json({
      ready: true,
      timestamp: Date.now(),
      restartRequired,
    });
  } catch (error) {
    logger.warn('Server not ready', error);
    return NextResponse.json({ ready: false, error: 'Server not ready' }, { status: 503 });
  }
}
