# Choix Techniques - Larian

## Stack Technique Complète

### Frontend

| Technologie       | Version  | Usage                        | Justification                                       |
| ----------------- | -------- | ---------------------------- | --------------------------------------------------- |
| **Next.js**       | 16.0.5   | Framework React avec SSR/SSG | App Router moderne, Server Components, excellent DX |
| **React**         | latest   | Bibliothèque UI              | Standard de l'industrie, écosystème riche           |
| **TypeScript**    | 5.9.3    | Typage statique              | Type-safety end-to-end, meilleure DX                |
| **TailwindCSS**   | 3.3.0    | Framework CSS utility-first  | Développement rapide, cohérence visuelle            |
| **Framer Motion** | 12.23.24 | Animations                   | Animations fluides et performantes                  |
| **GSAP**          | 3.13.0   | Animations avancées          | Contrôle précis des animations complexes            |
| **Shadcn/UI**     | -        | Composants UI                | Composants accessibles basés sur Radix UI           |
| **Zustand**       | 4.5.7    | Gestion d'état globale       | API simple, moins de boilerplate que Redux          |

### Backend

| Technologie             | Version       | Usage                    | Justification                                      |
| ----------------------- | ------------- | ------------------------ | -------------------------------------------------- |
| **Next.js API Routes**  | 16.0.5        | API REST                 | Intégration native, pas de serveur séparé          |
| **Prisma ORM**          | 7.0.1         | ORM pour base de données | Type-safety, migrations automatiques, excellent DX |
| **NextAuth.js**         | 5.0.0-beta.30 | Authentification         | Support OAuth natif, sessions sécurisées           |
| **Zod**                 | 3.24.3        | Validation de schémas    | TypeScript-first, validation runtime               |
| **Vercel Blob Storage** | 0.25.1        | Stockage d'images        | Intégration native Vercel, CDN automatique         |

### Base de Données

| Technologie        | Version | Usage                | Justification                            |
| ------------------ | ------- | -------------------- | ---------------------------------------- |
| **PostgreSQL**     | 15+     | Production (Neon DB) | Base relationnelle robuste, support JSON |
| **SQLite**         | -       | Développement local  | Simple, pas de serveur requis            |
| **better-sqlite3** | 12.5.0  | Driver SQLite        | Performance native, synchrone            |

### Outils de Développement

| Technologie     | Version | Usage                | Justification                                  |
| --------------- | ------- | -------------------- | ---------------------------------------------- |
| **ESLint**      | 9.39.1  | Linting              | Qualité de code, détection d'erreurs           |
| **Prettier**    | 3.7.1   | Formatage            | Formatage automatique cohérent                 |
| **Jest**        | 29.7.0  | Tests unitaires      | Framework de test standard                     |
| **Cypress**     | -       | Tests E2E            | Tests d'intégration complets                   |
| **Husky**       | 9.0.11  | Git hooks            | Validation avant commit                        |
| **lint-staged** | 15.5.2  | Linting staged files | Performance, lint uniquement fichiers modifiés |

## Dépendances Majeures

### UI & Styling

```json
{
  "@radix-ui/react-*": "Composants UI accessibles",
  "tailwindcss": "Framework CSS utility-first",
  "tailwindcss-animate": "Animations Tailwind",
  "class-variance-authority": "Variants de composants",
  "clsx": "Utilitaires pour classes CSS",
  "tailwind-merge": "Merge intelligent de classes Tailwind"
}
```

### Animations

```json
{
  "framer-motion": "Animations React performantes",
  "gsap": "Animations avancées et contrôlées"
}
```

### Formulaires & Validation

```json
{
  "zod": "Validation TypeScript-first",
  "react-day-picker": "Sélecteur de dates",
  "react-dropzone": "Upload de fichiers",
  "react-image-crop": "Recadrage d'images"
}
```

### Base de Données

```json
{
  "@prisma/client": "Client Prisma type-safe",
  "prisma": "CLI Prisma (dev)",
  "@prisma/adapter-better-sqlite3": "Adaptateur SQLite",
  "@prisma/adapter-neon": "Adaptateur Neon",
  "@prisma/adapter-pg": "Adaptateur PostgreSQL",
  "@auth/prisma-adapter": "Adaptateur NextAuth pour Prisma"
}
```

### Authentification

```json
{
  "next-auth": "Framework d'authentification",
  "bcryptjs": "Hachage de mots de passe",
  "@types/bcryptjs": "Types TypeScript"
}
```

### Utilitaires

```json
{
  "date-fns": "Manipulation de dates",
  "lodash": "Utilitaires JavaScript",
  "uuid": "Génération d'UUID",
  "zod": "Validation de schémas"
}
```

### Analytics & Monitoring

```json
{
  "@vercel/analytics": "Analytics Vercel",
  "@vercel/speed-insights": "Speed Insights Vercel",
  "@sentry/nextjs": "Error tracking Sentry"
}
```

### APIs Externes

```json
{
  "cheerio": "Parsing HTML (SoundCloud)",
  "puppeteer": "Scraping web (SoundCloud)",
  "@sparticuz/chromium-min": "Chromium pour Vercel",
  "sharp": "Traitement d'images"
}
```

## Justifications des Choix

### 1. Next.js 16 App Router vs Pages Router

**Choix :** App Router (Next.js 16)

**Raisons :**

- ✅ **React Server Components** - Meilleure performance avec rendu serveur
- ✅ **Layouts partagés** - Plus faciles à gérer
- ✅ **Streaming SSR** - Chargement progressif
- ✅ **Meilleure intégration React 18** - Suspense, transitions
- ✅ **Route Handlers** - API routes plus simples
- ✅ **Support TypeScript natif** - Meilleure DX

**Alternatives considérées :**

- Pages Router : Plus mature mais moins performant
- Remix : Bon mais écosystème moins riche

### 2. Prisma ORM

**Choix :** Prisma 7

**Raisons :**

- ✅ **Type-safety end-to-end** - Types générés automatiquement
- ✅ **Migrations automatiques** - Gestion de schéma simplifiée
- ✅ **Support multi-DB** - PostgreSQL et SQLite
- ✅ **Excellent DX** - Prisma Studio, introspection
- ✅ **Performance** - Query builder optimisé
- ✅ **Prisma 7** - Architecture moderne avec adaptateurs

**Alternatives considérées :**

- TypeORM : Plus verbeux, moins de type-safety
- Drizzle : Plus léger mais moins de fonctionnalités
- Kysely : Bon mais moins de DX

### 3. NextAuth.js v5

**Choix :** NextAuth.js v5 (beta)

**Raisons :**

- ✅ **Support OAuth natif** - Google, Twitch, etc.
- ✅ **Sessions sécurisées** - Cookies HTTP-only
- ✅ **Protection CSRF** - Intégrée
- ✅ **Adaptateur Prisma** - Intégration native
- ✅ **TypeScript** - Types complets
- ✅ **v5** - Architecture moderne, meilleure performance

**Alternatives considérées :**

- Auth0 : Payant, overkill pour ce projet
- Clerk : Payant, fonctionnalités avancées non nécessaires
- Supabase Auth : Bon mais lock-in Supabase

### 4. Zustand vs Redux

**Choix :** Zustand

**Raisons :**

- ✅ **API plus simple** - Moins de boilerplate
- ✅ **Performance optimale** - Re-renders minimaux
- ✅ **TypeScript natif** - Types inférés
- ✅ **Bundle size** - Plus léger que Redux
- ✅ **Pas de Provider** - Utilisation directe

**Alternatives considérées :**

- Redux Toolkit : Plus de boilerplate, overkill
- Jotai : Bon mais moins mature
- Recoil : Complexe, overkill

### 5. Zod pour Validation

**Choix :** Zod

**Raisons :**

- ✅ **TypeScript-first** - Types générés automatiquement
- ✅ **Validation runtime** - Sécurité côté serveur
- ✅ **Schémas réutilisables** - DRY principle
- ✅ **Messages d'erreur** - Personnalisables
- ✅ **API simple** - Facile à utiliser

**Alternatives considérées :**

- Yup : Bon mais moins de support TypeScript
- Joi : Plus verbeux, moins de types
- class-validator : Nécessite des classes

### 6. Vercel Blob Storage

**Choix :** Vercel Blob

**Raisons :**

- ✅ **Intégration native** - Avec Vercel
- ✅ **CDN automatique** - Performance globale
- ✅ **Optimisation d'images** - Conversion WebP
- ✅ **Coût réduit** - Pour petits projets
- ✅ **API simple** - Facile à utiliser

**Alternatives considérées :**

- AWS S3 : Plus complexe, nécessite configuration
- Cloudflare R2 : Bon mais moins intégré
- Supabase Storage : Lock-in Supabase

### 7. TailwindCSS + Shadcn/UI

**Choix :** TailwindCSS + Shadcn/UI

**Raisons :**

- ✅ **Développement rapide** - Utility classes
- ✅ **Cohérence visuelle** - Design system
- ✅ **Accessibilité** - Composants Radix UI
- ✅ **Personnalisable** - Thème facilement modifiable
- ✅ **Bundle size** - Purge CSS automatique
- ✅ **Shadcn/UI** - Composants copiables, pas de dépendance

**Alternatives considérées :**

- Material-UI : Plus lourd, moins flexible
- Chakra UI : Bon mais moins de contrôle
- Styled Components : Runtime overhead

### 8. Prisma 7 avec Adaptateurs

**Choix :** Prisma 7 avec adaptateurs

**Raisons :**

- ✅ **Architecture moderne** - Séparation adaptateurs/clients
- ✅ **Performance** - Optimisations Rust
- ✅ **Multi-DB** - Support SQLite, PostgreSQL, Neon
- ✅ **Type-safety** - Types générés automatiquement
- ✅ **Migrations** - Gestion automatique

**Migration depuis Prisma 6 :**

- Utilisation de `tsx` pour charger les fichiers `.ts` de Prisma
- Configuration ESM requise
- Adaptateurs obligatoires pour chaque DB

## Configuration TypeScript

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Choix de configuration :**

- `target: ES2017` - Compatibilité Node.js 22
- `moduleResolution: bundler` - Optimisé pour Next.js
- `strict: true` - Type-safety maximale
- `paths` - Alias `@/` pour imports absolus

## Configuration Next.js

### `next.config.ts` - Points Clés

#### 1. Images

```typescript
images: {
  loader: 'custom',
  loaderFile: './imageLoader.ts',
  remotePatterns: [
    { hostname: '*.public.blob.vercel-storage.com' },
    { hostname: 'i.scdn.co' }, // Spotify
    { hostname: 'i.ytimg.com' }, // YouTube
  ],
  formats: ['image/avif', 'image/webp'],
}
```

**Justification :**

- Loader personnalisé pour Vercel Blob
- Formats modernes (AVIF, WebP) pour performance
- Remote patterns pour sécurité

#### 2. Prisma 7 Support

```typescript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals = [
      ...config.externals,
      {
        '@prisma/client': 'commonjs @prisma/client',
        '.prisma/client': 'commonjs .prisma/client',
      },
    ];
  }
  return config;
};
```

**Justification :**

- Prisma 7 génère des fichiers `.ts` qui doivent être chargés par `tsx`
- Externalisation pour éviter le bundling
- Compatibilité avec Turbopack

#### 3. Headers de Sécurité

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // ...
      ],
    },
  ];
}
```

**Justification :**

- Sécurité renforcée
- Protection contre XSS, clickjacking
- HSTS pour HTTPS forcé

#### 4. Sentry (Optionnel)

```typescript
const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
export default sentryEnabled ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
```

**Justification :**

- Error tracking optionnel
- Configuration conditionnelle
- Source maps pour debugging

## Scripts NPM Principaux

### Développement

```json
{
  "dev": "Script avec vérification SQLite + tsx",
  "dev:auto": "Auto-restart avec watch",
  "build": "Build avec vérification PostgreSQL + fix Prisma",
  "start": "Démarrage production avec tsx"
}
```

### Base de Données

```json
{
  "db:setup:local": "Configuration SQLite locale",
  "db:production": "Configuration PostgreSQL production",
  "db:studio": "Prisma Studio (GUI DB)",
  "db:migrate:production": "Migrations production"
}
```

### Qualité de Code

```json
{
  "lint": "ESLint (quiet mode)",
  "lint:fix": "ESLint avec auto-fix",
  "format": "Prettier",
  "type-check": "TypeScript sans émission"
}
```

### Tests

```json
{
  "test": "Jest",
  "test:watch": "Jest watch mode",
  "test:coverage": "Jest avec couverture",
  "test:ci": "Jest pour CI"
}
```

## Dépendances de Production vs Développement

### Production Only

- `@prisma/client` - Client Prisma
- `@auth/prisma-adapter` - Adaptateur NextAuth
- `next-auth` - Authentification
- `zod` - Validation
- `zustand` - État global

### Développement Only

- `prisma` - CLI Prisma
- `@types/*` - Types TypeScript
- `eslint` - Linting
- `prettier` - Formatage
- `jest` - Tests
- `@testing-library/*` - Tests React

## Versions Node.js

**Requis :** Node.js 22.x

**Justification :**

- Prisma 7 nécessite Node.js 20.19.0+
- Recommandé 22.x pour meilleures performances
- Support ESM natif
- Performance améliorée

## Gestion des Versions

### Stratégie

- **Dépendances majeures** : Version exacte ou `^` pour patches
- **Dépendances mineures** : `latest` pour React, `^` pour autres
- **Sécurité** : `npm audit` régulier
- **Mises à jour** : Testées en local avant merge

### Exemples

```json
{
  "react": "latest", // Mises à jour automatiques
  "next": "^16.0.5", // Patches automatiques
  "@prisma/client": "^7.0.1", // Patches automatiques
  "typescript": "^5.9.3" // Patches automatiques
}
```

## Performance et Optimisations

### Bundle Size

- **Code splitting** automatique (Next.js)
- **Tree shaking** pour dépendances inutilisées
- **Dynamic imports** pour composants lourds
- **Image optimization** avec next/image

### Runtime

- **Server Components** pour réduire JS client
- **Cache** avec invalidation intelligente
- **Agrégats SQL** au lieu de calculs mémoire
- **Debounce** pour réductions d'appels API

## Sécurité

### Dépendances Sécurisées

- **next-auth** - Authentification sécurisée
- **bcryptjs** - Hachage de mots de passe
- **zod** - Validation et sanitization
- **Headers HTTP** - Protection XSS, CSRF

### Audit de Sécurité

```bash
npm audit
npm audit fix
```

## Conclusion

Les choix techniques sont orientés vers :

1. **Performance** - Next.js 16, Server Components, cache
2. **Type-safety** - TypeScript, Prisma, Zod
3. **DX** - Outils modernes, hot reload, Prisma Studio
4. **Sécurité** - NextAuth, validation, headers
5. **Maintenabilité** - Architecture modulaire, tests, linting

Ces choix permettent un développement rapide tout en maintenant une base de code robuste et performante.
