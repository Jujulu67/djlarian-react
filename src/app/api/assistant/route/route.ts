/**
 * API Route pour le routeur de commandes projets
 *
 * Cette route utilise le routeur central qui traite les commandes côté client
 * avec les projets en mémoire (0 DB pour listing/filtrage/tri)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { routeProjectCommand } from '@/lib/assistant/router/router';
import type { RouterContext, RouterOptions } from '@/lib/assistant/router/types';
import type { Project } from '@/components/projects/types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { userMessage, projects, conversationHistory, lastFilters } = body;

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json({ error: 'userMessage est requis' }, { status: 400 });
    }

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json({ error: 'projects est requis (array)' }, { status: 400 });
    }

    // Extraire les collabs et styles disponibles depuis les projets
    const availableCollabs = [...new Set(projects.filter((p) => p.collab).map((p) => p.collab!))];
    const availableStyles = [...new Set(projects.filter((p) => p.style).map((p) => p.style!))];

    const context: RouterContext = {
      projects: projects as Project[],
      availableCollabs,
      availableStyles,
      projectCount: projects.length,
    };

    const options: RouterOptions = {
      context,
      conversationHistory,
      lastFilters,
    };

    // Router la commande
    const result = await routeProjectCommand(userMessage, options);

    // Retourner le résultat
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API Route Router] Erreur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
