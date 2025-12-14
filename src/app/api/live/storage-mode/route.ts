import { NextResponse } from 'next/server';

import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

/**
 * GET /api/live/storage-mode
 * Expose le mode de stockage actuel pour les uploads live (Blob vs local)
 * - true  => utilise Blob Storage (production / switch prod)
 * - false => utilise le dossier local public/uploads (développement/test)
 */
export async function GET() {
  const useBlobStorage = await shouldUseBlobStorage();

  return NextResponse.json(
    {
      useBlobStorage,
    },
    { status: 200 }
  );
}
