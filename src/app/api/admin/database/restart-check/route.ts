import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

// Route pour vérifier si le serveur est prêt après redémarrage
export async function GET(req: NextRequest) {
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
    return NextResponse.json({ ready: false, error: 'Server not ready' }, { status: 503 });
  }
}
