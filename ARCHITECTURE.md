# Architecture du Projet - DJ Larian Website

## Vue d'ensemble

Application Next.js 14 avec App Router, TypeScript, Prisma ORM, et authentification NextAuth.js.

## Stack Technique

### Frontend

- **Next.js 14** (App Router) - Framework React avec SSR/SSG
- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **TailwindCSS** - Framework CSS utility-first
- **Framer Motion** - Animations
- **Shadcn/UI** - Composants UI basés sur Radix UI
- **Zustand** - Gestion d'état globale (si nécessaire)

### Backend

- **Next.js API Routes** - API REST
- **Prisma ORM** - ORM pour PostgreSQL/SQLite
- **NextAuth.js** - Authentification
- **Zod** - Validation de schémas
- **Vercel Blob Storage** - Stockage d'images

### Base de données

- **PostgreSQL** (production)
- **SQLite** (développement)

## Structure du Projet

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── (routes)/          # Routes groupées
│   │   ├── (home)/        # Page d'accueil
│   │   ├── admin/         # Pages admin
│   │   ├── events/        # Pages événements
│   │   └── music/         # Pages musique
│   ├── api/               # API Routes
│   │   ├── music/         # Endpoints musique
│   │   ├── events/        # Endpoints événements
│   │   └── admin/         # Endpoints admin
│   └── components/        # Composants spécifiques aux routes
├── components/            # Composants réutilisables
│   ├── ui/               # Composants UI de base
│   ├── layout/            # Composants de layout
│   ├── sections/         # Sections de page
│   └── admin/            # Composants admin
├── hooks/                # Hooks personnalisés
│   ├── game/             # Hooks pour le jeu
│   └── ...               # Autres hooks
├── lib/                  # Utilitaires et configurations
│   ├── api/              # Services API
│   ├── utils/            # Fonctions utilitaires
│   └── ...               # Autres libs
└── types/                # Types TypeScript
```

## Patterns Architecturaux

### 1. Composants Modulaires

Les composants volumineux sont décomposés en :

- **Hooks personnalisés** : Logique métier extraite
- **Composants enfants** : UI décomposée
- **Types partagés** : Types dans `types.ts`

**Exemple** : `MusicCard.tsx` (235 lignes) utilise :

- `useYouTubePlayer`, `useSoundCloudPlayer`, `useAudioVisualizer` (hooks)
- `MusicCardImage`, `MusicCardControls`, `MusicCardPlatforms` (composants)

### 2. Custom Hooks

Encapsulation de la logique réutilisable :

```typescript
// Exemple: useYouTubePlayer
export const useYouTubePlayer = ({
  track,
  isActive,
  isPlaying,
  onPlay,
}: UseYouTubePlayerProps): UseYouTubePlayerReturn => {
  // Logique de gestion du player YouTube
  return { youtubeVideoId, currentTime, ... };
};
```

**Hooks principaux** :

- `useGameManager` - Gestion du jeu audio
- `useTracks` - Gestion des pistes musicales
- `useEventTickets` - Gestion des tickets d'événements
- `useImageUpload` - Upload d'images

### 3. Validation avec Zod

Toutes les API routes utilisent Zod pour la validation :

```typescript
const trackCreateSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  // ...
});

export async function POST(request: Request) {
  const body = await request.json();
  const validatedData = trackCreateSchema.parse(body);
  // ...
}
```

### 4. Gestion d'Erreurs Centralisée

- `errorHandler.ts` : Gestion uniforme des erreurs API
- `responseHelpers.ts` : Helpers pour réponses standardisées
- `ErrorBoundary` : Gestion des erreurs React

### 5. Optimisations de Performance

#### Mémorisation

- `useMemo` pour calculs coûteux
- `useCallback` pour fonctions stables
- `arrayHelpers.ts` avec `isNotEmpty()` pour optimiser les vérifications

#### Images

- `next/image` pour optimisation automatique
- `priority` pour images above-the-fold
- Alt descriptifs pour accessibilité

### 6. Accessibilité

- Attributs ARIA (`aria-label`, `aria-labelledby`)
- Navigation au clavier (`tabIndex`, `onKeyDown`)
- Focus visible (`focus:ring-2`)
- Alt text descriptifs pour images

## Décisions Techniques

### 1. App Router vs Pages Router

**Choix** : App Router (Next.js 14)

**Raisons** :

- Meilleure performance avec React Server Components
- Layouts partagés plus faciles
- Streaming SSR
- Meilleure intégration avec React 18

### 2. Prisma ORM

**Choix** : Prisma

**Raisons** :

- Type-safety end-to-end
- Migrations automatiques
- Support PostgreSQL et SQLite
- Excellent DX

### 3. Zustand vs Redux

**Choix** : Zustand (si nécessaire)

**Raisons** :

- API plus simple
- Moins de boilerplate
- Performance optimale
- TypeScript natif

### 4. Zod pour Validation

**Choix** : Zod

**Raisons** :

- TypeScript-first
- Validation runtime
- Schémas réutilisables
- Messages d'erreur personnalisables

### 5. Vercel Blob Storage

**Choix** : Vercel Blob

**Raisons** :

- Intégration native avec Vercel
- CDN automatique
- Optimisation d'images
- Coût réduit pour petits projets

## Conventions de Code

### Nommage

- **Composants** : PascalCase (`MusicCard.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useTracks.ts`)
- **Utilitaires** : camelCase (`arrayHelpers.ts`)
- **Types** : PascalCase (`Track`, `Event`)

### Structure des Fichiers

- Un composant par fichier
- Types dans `types.ts` ou interfaces inline
- Hooks dans `hooks/` ou `hooks/[feature]/`
- Utilitaires dans `lib/utils/`

### Imports

```typescript
// 1. React et Next.js
import { useState } from 'react';
import Image from 'next/image';

// 2. Bibliothèques externes
import { z } from 'zod';

// 3. Composants
import { Button } from '@/components/ui';

// 4. Utilitaires et types
import { formatDate } from '@/lib/utils';
import type { Track } from '@/types';
```

## Gestion d'État

### État Local

- `useState` pour état composant
- `useReducer` pour état complexe

### État Global

- Zustand (si nécessaire)
- Context API pour thème/auth

### État Serveur

- React Server Components
- Server Actions (Next.js 14)

## Sécurité

### Authentification

- NextAuth.js avec providers multiples
- Sessions sécurisées
- CSRF protection

### Validation

- Zod pour validation côté serveur
- Sanitization des inputs
- Rate limiting (si nécessaire)

### Autorisation

- Rôles utilisateurs (admin, user)
- Middleware pour routes protégées
- Vérification dans API routes

## Performance

### Optimisations

- Code splitting automatique
- Lazy loading des composants
- Image optimization (next/image)
- Mémorisation des calculs coûteux

### Monitoring

- Logger centralisé (`lib/logger.ts`)
- Error tracking (à implémenter)
- Analytics (Umami)

## Tests

### Structure

- Tests unitaires : `__tests__/`
- Tests E2E : `cypress/e2e/`
- Tests composants : Vitest/Jest

### Couverture

- Hooks personnalisés
- Utilitaires
- API routes
- Composants critiques

## Déploiement

### Plateforme

- **Vercel** (recommandé)
- Support natif Next.js
- Edge Functions
- CDN global

### Variables d'Environnement

- `.env.local` (développement)
- `.env.production` (production)
- Vercel Environment Variables

### Base de Données

- PostgreSQL (production)
- SQLite (développement local)
- Migration automatique avec Prisma

## Évolutions Futures

### Améliorations Prévues

1. **Tests** : Augmenter la couverture
2. **Performance** : Optimiser les requêtes DB
3. **Accessibilité** : Audit complet WCAG
4. **Documentation** : JSDoc complet
5. **Monitoring** : Error tracking (Sentry)

### Patterns à Adopter

- Server Actions pour mutations
- Streaming SSR pour meilleure UX
- Edge Functions pour logique légère
- Incremental Static Regeneration (ISR)

## Références

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
