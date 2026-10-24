import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/api/requireAuth';
import { getAllImages } from './shared';

// GET /api/admin/images - Liste toutes les images
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  return NextResponse.json(getAllImages());
}
