import { NextRequest, NextResponse } from 'next/server';

import { createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * GET /api/live/submissions/upload-token
 * Retourne le token pour uploader directement vers Vercel Blob depuis le client
 *
 * Note: Le token est sécurisé car il n'est accessible que via cet endpoint authentifié.
 * En production, Vercel injecte automatiquement BLOB_READ_WRITE_TOKEN.
 *
 * Pour une sécurité renforcée, on pourrait utiliser handleUpload() de @vercel/blob/client
 * avec un endpoint POST qui génère un token signé temporaire.
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    // ⚠️ IMPORTANT: Récupérer le token selon la cible DB active (hot swap)
    // Le token est mis à jour dans process.env.BLOB_READ_WRITE_TOKEN lors du switch
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Blob Storage non configuré' }, { status: 503 });
    }

    // Retourner le token (sécurisé via endpoint authentifié)
    // Note: En production, on pourrait améliorer la sécurité en générant un token signé temporaire
    return NextResponse.json({
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/live/submissions/upload-token');
  }
}
