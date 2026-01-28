# Tests E2E avec Playwright

Ce dossier contient les tests end-to-end (E2E) pour l'application, utilisant [Playwright](https://playwright.dev/).

## Installation

### 1. Installer Playwright et ses dépendances

```bash
pnpm install -D @playwright/test
pnpm playwright install
```

### 2. Installer les types TypeScript (si nécessaire)

Les types sont généralement inclus avec `@playwright/test`, mais si vous avez des erreurs de types :

```bash
pnpm install -D @types/node
```

## Configuration

Le fichier `playwright.config.ts` à la racine du projet configure Playwright pour :

- Utiliser `./e2e` comme répertoire de tests
- Démarrer automatiquement le serveur de développement (`pnpm run dev`) avant les tests
- Utiliser `http://localhost:3000` comme baseURL par défaut

## Exécution des tests

### Lancer tous les tests E2E

```bash
pnpm playwright test
```

### Lancer un test spécifique

```bash
pnpm playwright test e2e/auth.spec.ts
```

### Lancer les tests en mode UI (interactif)

```bash
pnpm playwright test --ui
```

### Lancer les tests en mode debug

```bash
pnpm playwright test --debug
```

### Lancer les tests sur un navigateur spécifique

```bash
pnpm playwright test --project=chromium
pnpm playwright test --project=firefox
pnpm playwright test --project=webkit
```

## Tests disponibles

### `auth.spec.ts` - Smoke Test d'authentification

Test E2E autonome pour le login qui :

1. **Setup (beforeAll)** : Crée un utilisateur de test dans la DB avec mot de passe hashé
2. **Tests** :
   - Teste la connexion avec des credentials valides
   - Teste le rejet d'un mot de passe invalide
   - Teste le rejet d'un email inexistant
3. **Teardown (afterAll)** : Supprime l'utilisateur de test pour laisser la base propre

**Caractéristiques :**

- ✅ Totalement autonome (pas besoin d'utilisateur manuel)
- ✅ Utilise Prisma pour créer/supprimer l'utilisateur
- ✅ Hash le mot de passe avec bcrypt (même méthode que l'app)
- ✅ Nettoie automatiquement après les tests

## Variables d'environnement

Le test utilise les variables d'environnement suivantes (via `.env.local`) :

- `DATABASE_URL` : URL de connexion à la base de données
- `NEXTAUTH_SECRET` ou `AUTH_SECRET` : Secret pour l'authentification

## Notes importantes

1. **Base de données** : Le test nécessite une base de données accessible (SQLite local ou PostgreSQL selon votre configuration)
   - **IMPORTANT** : Assurez-vous que le schéma de la base de données est à jour avant de lancer les tests :
     ```bash
     pnpm run db:setup:local  # Pour SQLite local
     # ou
     pnpm run db:setup:production  # Pour PostgreSQL
     ```
2. **Serveur de développement** : Playwright démarre automatiquement `pnpm run dev` avant les tests (ou réutilise un serveur existant)
3. **Isolation** : Chaque test crée un utilisateur unique avec un timestamp pour éviter les conflits
4. **Nettoyage** : Les utilisateurs de test sont automatiquement supprimés après les tests

## Dépannage

### Erreur : "Cannot find module '@/lib/bcrypt-edge'"

Assurez-vous que les alias TypeScript sont correctement configurés dans `tsconfig.json` et que le chemin de résolution fonctionne dans l'environnement de test.

### Erreur : "PrismaClient is not initialized"

Vérifiez que `DATABASE_URL` est correctement défini dans votre `.env.local`.

### Les tests échouent avec "Connection refused"

Assurez-vous que le serveur de développement peut démarrer correctement. Vous pouvez tester manuellement avec `pnpm run dev`.
