# Guide de Style - DJ Larian Website

## Principes Généraux

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

### 1. Organisation des Imports

```typescript
// 1. Imports React et Next.js
import { useState, useEffect } from 'react';
import Image from 'next/image';

// 2. Imports de bibliothèques externes
import clsx from 'clsx';

// 3. Imports de composants
import { Button } from '@/components/ui';

// 4. Imports d'utilitaires et types
import { formatDate } from '@/utils';
import type { User } from '@/types';
```

### 2. Types et Interfaces

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

### 3. Hooks et État

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

## Bonnes Pratiques

### 1. Performance

- Utiliser `useMemo` et `useCallback` pour les calculs coûteux
- Implémenter le code splitting avec `dynamic` de Next.js
- Optimiser les images avec `next/image`

### 2. État Global

- Utiliser Zustand pour la gestion d'état global
- Éviter le prop drilling
- Maintenir un état minimal

### 3. Tests

- Écrire des tests pour tous les composants
- Tester les cas d'erreur
- Vérifier l'accessibilité dans les tests

### 4. Documentation

- Documenter les props avec JSDoc
- Maintenir un changelog
- Documenter les décisions d'architecture

## Conventions de Nommage

### 1. Fichiers et Dossiers

- Components: PascalCase (Button.tsx)
- Hooks: camelCase (useAuth.ts)
- Utils: camelCase (formatDate.ts)
- Constants: SNAKE_CASE (API_ENDPOINTS.ts)

### 2. Variables et Fonctions

- Variables: camelCase
- Constantes: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- Event Handlers: handleEventName

## Thème et Design Tokens

### 1. Couleurs

```typescript
const colors = {
  primary: {
    900: '#...',
    800: '#...',
    // etc.
  },
  // autres couleurs
};
```

### 2. Espacement

- Utiliser les classes Tailwind pour l'espacement
- Maintenir une grille cohérente (4px, 8px, 16px, etc.)

### 3. Typographie

- Définir une échelle typographique claire
- Utiliser les classes Tailwind pour la typographie
