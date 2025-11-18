export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getAllImages } from './shared';

// GET /api/admin/images - Liste toutes les images
export async function GET() {
  return NextResponse.json(getAllImages());
}
