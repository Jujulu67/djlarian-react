# Guide de Développement - Larian

## Prérequis

### Système

- **Node.js** : 22.x (requis)
  ```bash
  node --version  # Doit afficher v22.x.x
  ```
- **npm** : Inclus avec Node.js
  ```bash
  pnpm --version
  ```
- **Git** : Pour cloner et versionner
  ```bash
  git --version
  ```

### Optionnel

- **Prisma Studio** : GUI pour la base de données (inclus avec Prisma)
- **VS Code** : Éditeur recommandé avec extensions :
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense

## Installation

### 1. Cloner le Repository

```bash
git clone https://github.com/votre-username/larian-react.git
cd larian-react
```

### 2. Installer les Dépendances

```bash
pnpm install
```

**Note** : Le script `postinstall` s'exécute automatiquement et :

- Rebuild `better-sqlite3` pour votre plateforme
- Fix les types Prisma

### 3. Configuration Initiale

#### Créer `.env.local`

```bash
cp .env.example .env.local  # Si un .env.example existe
# Sinon, créer manuellement
```

#### Configurer les Variables Minimales

```env
# Base de données (SQLite pour dev)
DATABASE_URL="file:./prisma/dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="générer-avec-openssl-rand-base64-32"

# Environnement
NODE_ENV="development"
```

#### Générer NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copier le résultat dans `.env.local`.

### 4. Setup Base de Données

```bash
# Créer la base de données SQLite et appliquer les migrations
pnpm run db:setup:local
```

Cela :

- Crée `prisma/dev.db` (SQLite)
- Applique toutes les migrations
- Génère le client Prisma

### 5. Lancer le Serveur de Développement

```bash
pnpm run dev
```

Ouvrir http://localhost:3000 dans votre navigateur.

## Commandes de Développement

### Serveur de Développement

```bash
# Serveur standard
pnpm run dev

# Serveur avec auto-restart
pnpm run dev:auto
```

**Port** : 3000 (par défaut)

**Hot Reload** : Activé automatiquement

### Build de Production

```bash
# Build local
pnpm run build

# Démarrer le serveur de production
pnpm start
```

**Note** : Le build vérifie automatiquement :

- Configuration PostgreSQL (production)
- Types Prisma
- Erreurs TypeScript

### Linting et Formatage

```bash
# Linter (mode quiet)
pnpm run lint

# Linter avec auto-fix
pnpm run lint:fix

# Formatter (Prettier)
pnpm run format

# Vérification TypeScript
pnpm run type-check
```

### Tests

```bash
# Tous les tests
pnpm test

# Tests en mode watch
pnpm run test:watch

# Tests avec couverture
pnpm run test:coverage

# Tests pour CI
pnpm run test:ci
```

## Structure du Projet

Voir [01-ARCHITECTURE.md](01-ARCHITECTURE.md) pour la structure détaillée.

### Organisation des Fichiers

```
src/
├── app/              # Routes Next.js (App Router)
├── components/       # Composants React
├── hooks/           # Hooks personnalisés
├── lib/             # Utilitaires et services
├── types/           # Types TypeScript
└── providers/       # Providers React
```

### Conventions de Nommage

- **Composants** : PascalCase (`MusicCard.tsx`)
- **Hooks** : camelCase avec préfixe `use` (`useMusicPlayer.ts`)
- **Utilitaires** : camelCase (`formatDate.ts`)
- **Types** : PascalCase (`Track`, `Event`)
- **Constantes** : UPPER_SNAKE_CASE (`API_ENDPOINTS`)

## Conventions de Code

### 1. Early Returns

```typescript
// ✅ BON
const handleSubmit = (): void => {
  if (!isValid) return;
  if (!user) return;

  // logique principale
};

// ❌ MAUVAIS
const handleSubmit = (): void => {
  if (isValid && user) {
    // logique imbriquée
  }
};
```

### 2. Styling avec Tailwind

```tsx
// ✅ BON
<div className="flex items-center justify-between p-4 bg-primary-900">

// ❌ MAUVAIS
<div style={{ display: 'flex', alignItems: 'center' }}>
<div className="custom-class"> // Pas de CSS personnalisé
```

### 3. Conditions dans les Classes

```tsx
// ✅ BON
<button
  className={clsx(
    'base-button',
    isActive && 'bg-primary-500',
    isDisabled && 'opacity-50'
  )}
>

// ❌ MAUVAIS
<button className={`base-button ${isActive ? 'active' : ''}`}>
```

### 4. Nommage des Event Handlers

```typescript
// ✅ BON
const handleClick = (): void => {};
const handleKeyDown = (e: KeyboardEvent): void => {};

// ❌ MAUVAIS
const click = (): void => {};
const onKeyDown = (e: KeyboardEvent): void => {};
```

### 5. Accessibilité

```tsx
// ✅ BON
<button
  aria-label="Fermer le menu"
  onClick={handleClick}
  onKeyDown={handleKeyDown}
  tabIndex={0}
>

// ❌ MAUVAIS
<div onClick={handleClick}>
```

### 6. Définition des Composants

```typescript
// ✅ BON
const Component = (): JSX.Element => {
  return <div>Contenu</div>;
};

// ❌ MAUVAIS
function Component() {
  return <div>Contenu</div>;
}
```

## Structure des Composants

### Organisation des Imports

```typescript
// 1. Imports React et Next.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

// 2. Imports de bibliothèques externes
import clsx from 'clsx';
import { z } from 'zod';

// 3. Imports de composants
import { Button } from '@/components/ui';

// 4. Imports d'utilitaires et types
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
```

### Types et Interfaces

```typescript
interface Props {
  user: User;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

const Component = ({ user, onSubmit, isLoading = false }: Props): JSX.Element => {
  // ...
};
```

### Hooks et État

```typescript
const Component = (): JSX.Element => {
  // 1. États
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // 2. Queries et Mutations
  const { data, isLoading } = useQuery(['key'], fetchData);

  // 3. Effets
  useEffect(() => {
    // effet
  }, []);

  // 4. Handlers
  const handleClick = (): void => {
    setIsOpen(true);
  };

  // 5. Render
  return (
    // JSX
  );
};
```

## Workflow Git

### Branches

- **`main`** : Branche de production (stable)
- **`develop`** : Branche de développement (optionnel)
- **`feature/*`** : Nouvelles fonctionnalités
- **`fix/*`** : Corrections de bugs
- **`refactor/*`** : Refactorings

### Commits

Format recommandé :

```
type(scope): description

[corps optionnel]

[footer optionnel]
```

**Types** :

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage (pas de changement de code)
- `refactor` : Refactoring
- `test` : Tests
- `chore` : Tâches de maintenance

**Exemples** :

```
feat(projects): ajout du système de drag-and-drop
fix(auth): correction de la redirection après login
docs(readme): mise à jour de la documentation
```

### Pull Requests

1. **Créer une branche** depuis `main`
2. **Développer** la fonctionnalité
3. **Tester** localement
4. **Linter** : `pnpm run lint:fix`
5. **Tests** : `pnpm test`
6. **Créer une PR** avec description claire
7. **Attendre la review** avant merge

## Débogage

### Prisma Studio

Interface graphique pour la base de données :

```bash
pnpm run db:studio
```

Ouvre http://localhost:5555

**Utile pour** :

- Vérifier les données
- Tester les requêtes
- Déboguer les relations

### Logs

Le projet utilise un logger centralisé (`lib/logger.ts`) :

```typescript
import { logger } from '@/lib/logger';

logger.debug('Message de debug');
logger.info("Message d'information");
logger.warn('Avertissement');
logger.error('Erreur', error);
```

**Niveaux** :

- `debug` : Détails de développement
- `info` : Informations générales
- `warn` : Avertissements
- `error` : Erreurs

### Console du Navigateur

Pour déboguer côté client :

```typescript
// Utiliser console.log avec préfixe
console.log('[Component] State:', state);

// Utiliser les DevTools React
// Installer l'extension React DevTools
```

### Erreurs TypeScript

```bash
# Vérifier les erreurs TypeScript
pnpm run type-check

# Voir les erreurs en temps réel dans VS Code
# Installer l'extension TypeScript
```

### Erreurs de Build

```bash
# Build avec logs détaillés
pnpm run build

# Vérifier les erreurs dans la console
# Vérifier les logs Vercel (si déployé)
```

## Tests

### Structure des Tests

```
src/
├── app/
│   └── api/
│       └── __tests__/      # Tests API routes
├── components/
│   └── ui/
│       └── __tests__/      # Tests composants
└── hooks/
    └── __tests__/          # Tests hooks
```

### Écrire un Test

```typescript
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Tests API Routes

```typescript
import { GET } from '@/app/api/projects/route';
import { NextRequest } from 'next/server';

describe('GET /api/projects', () => {
  it('should return projects', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });
});
```

### Tests E2E (Cypress)

```typescript
// cypress/e2e/accessibility.cy.ts
describe('Accessibility', () => {
  it('should be accessible', () => {
    cy.visit('/');
    cy.injectAxe();
    cy.checkA11y();
  });
});
```

## Bonnes Pratiques

### Performance

- ✅ Utiliser `useMemo` et `useCallback` pour calculs coûteux
- ✅ Implémenter le code splitting avec `dynamic` de Next.js
- ✅ Optimiser les images avec `next/image`
- ✅ Utiliser Server Components quand possible
- ✅ Éviter les re-renders inutiles

### État Global

- ✅ Utiliser Zustand pour état global minimal
- ✅ Éviter le prop drilling
- ✅ Maintenir un état minimal
- ✅ Utiliser Context API pour thème/auth

### Sécurité

- ✅ Valider toutes les entrées avec Zod
- ✅ Sanitizer les inputs
- ✅ Utiliser des requêtes préparées (Prisma)
- ✅ Vérifier les permissions dans API routes
- ✅ Ne jamais exposer de secrets dans le code

### Accessibilité

- ✅ Attributs ARIA appropriés
- ✅ Navigation au clavier
- ✅ Focus visible
- ✅ Alt text descriptifs
- ✅ Contraste des couleurs

### Tests

- ✅ Écrire des tests pour composants critiques
- ✅ Tester les cas d'erreur
- ✅ Vérifier l'accessibilité dans les tests
- ✅ Maintenir la couverture de code

## Scripts Utilitaires

### Base de Données

```bash
# Setup local
pnpm run db:setup:local

# Reset (supprime et recrée)
pnpm run db:reset:local

# Studio (GUI)
pnpm run db:studio

# Import backup
pnpm run db:import:backup

# Diagnostic
pnpm run db:diagnose
```

### Vérification

```bash
# Vérifier les variables d'environnement
pnpm run check-env

# Vérifier le build
pnpm run build

# Vérifier les types
pnpm run type-check
```

### Génération

```bash
# Générer vidéo waveform
pnpm run generate:waveform-video
```

## Problèmes Courants

### Erreur "Cannot find module"

**Cause** : Dépendances non installées ou Node modules corrompus

**Solution** :

```bash
rm -rf node_modules package-lock.json
pnpm install
```

### Erreur Prisma

**Cause** : Client Prisma non généré ou migrations non appliquées

**Solution** :

```bash
pnpm prisma generate
pnpm run db:setup:local
```

### Erreur TypeScript

**Cause** : Types manquants ou configuration incorrecte

**Solution** :

```bash
pnpm run type-check
# Vérifier tsconfig.json
# Vérifier les imports
```

### Erreur de Build

**Cause** : Erreurs TypeScript, dépendances manquantes, ou configuration

**Solution** :

```bash
pnpm run lint:fix
pnpm run type-check
pnpm run build
# Vérifier les logs d'erreur
```

### Port 3000 déjà utilisé

**Cause** : Un autre processus utilise le port 3000

**Solution** :

```bash
# Trouver le processus
lsof -i :3000
# Tuer le processus
kill -9 <PID>
# Ou utiliser un autre port
PORT=3001 pnpm run dev
```

## Ressources

- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation React](https://react.dev)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation TypeScript](https://www.typescriptlang.org/docs)
- [Documentation TailwindCSS](https://tailwindcss.com/docs)
- [Architecture du Projet](01-ARCHITECTURE.md)
- [Choix Techniques](02-CHOIX-TECHNIQUES.md)
- [Infrastructure et Déploiement](03-INFRA-DEPLOIEMENT.md)
