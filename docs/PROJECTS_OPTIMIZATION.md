# Optimisations des Endpoints Projets

## Vue d'ensemble

Les endpoints `/api/projects` ont été optimisés pour réduire les requêtes à la base de données, améliorer les performances et réduire les coûts sur le plan gratuit Neon DB.

## Optimisations implémentées

### 1. Cache avec invalidation automatique

**Endpoints concernés :**

- `/api/projects` (GET) - Cache de 60 secondes
- `/api/projects/counts` - Cache de 5 minutes
- `/api/projects/statistics` - Cache de 60 secondes

**Fonctionnement :**

- Utilisation de `unstable_cache` de Next.js avec tags
- Invalidation automatique lors des mutations (POST, PATCH, DELETE, batch, reorder, purge)
- Cache par utilisateur (clé incluant userId)

**Bénéfices :**

- Réduction drastique des requêtes DB pour les lectures répétées
- Amélioration des temps de réponse
- Réduction des coûts sur plan gratuit

### 2. Agrégats SQL au lieu de calculs en mémoire

**Avant :**

```typescript
// Charger TOUS les projets puis filtrer en mémoire
const projects = await prisma.project.findMany({ where: { userId } });
const count = projects.filter((p) => p.status === 'TERMINE').length;
```

**Après :**

```typescript
// Utiliser des agrégats SQL
const count = await prisma.project.count({ where: { userId, status: 'TERMINE' } });
const statusCounts = await prisma.project.groupBy({
  by: ['status'],
  where: { userId },
  _count: { status: true },
});
```

**Bénéfices :**

- Pas besoin de charger tous les projets en mémoire
- Calculs effectués directement en SQL (plus rapide)
- Réduction de la bande passante et de la mémoire

### 3. Endpoint `/api/projects/counts` dédié

**Nouvel endpoint :** `/api/projects/counts`

**Usage :**

```typescript
GET /api/projects/counts
// Retourne uniquement les totaux sans charger les projets
{
  total: 10,
  statusBreakdown: {
    TERMINE: 3,
    EN_COURS: 5,
    ANNULE: 2,
    // ...
  }
}
```

**Bénéfices :**

- Requête très légère (seulement COUNT et GROUP BY)
- Cache plus long (5 minutes)
- Parfait pour les badges et statistiques

### 4. Debounce côté client

**Implémentation :**

- Debounce de 300ms sur `fetchProjects()` dans `ProjectsClient` et `AdminProjectsClient`
- Évite les appels multiples lors des changements rapides de filtres

**Bénéfices :**

- Réduction des appels API inutiles
- Meilleure expérience utilisateur

### 5. Évitement du double fetch SSR + client

**Implémentation :**

- Vérification des `initialProjects` avant de faire un appel API
- Utilisation des données SSR si elles correspondent aux filtres

**Bénéfices :**

- Évite un appel API inutile au chargement initial
- Temps de chargement plus rapide

### 6. Pagination optionnelle

**Support API :**

```typescript
GET /api/projects?limit=50&offset=0
GET /api/projects?limit=50&offset=50&includeUser=false
```

**Paramètres :**

- `limit` : Nombre de projets à retourner
- `offset` : Nombre de projets à sauter
- `includeUser` : Inclure les données User (défaut: true)

**Note :** La pagination n'est pas activée côté client par défaut, mais l'infrastructure est en place.

## Endpoints disponibles

### GET `/api/projects`

Liste les projets de l'utilisateur (ou tous pour admin).

**Query params :**

- `status` : Filtrer par statut
- `userId` : Pour admin - filtrer par utilisateur
- `all` : Pour admin - voir tous les projets
- `limit` : Pagination - nombre de résultats
- `offset` : Pagination - offset
- `includeUser` : Inclure les données User (défaut: true)

**Cache :** 60 secondes

### GET `/api/projects/counts`

Récupère uniquement les comptes/totaux (léger).

**Query params :**

- `userId` : Pour admin - filtrer par utilisateur
- `all` : Pour admin - voir tous les projets

**Cache :** 5 minutes

### GET `/api/projects/statistics`

Récupère les statistiques détaillées des projets.

**Cache :** 60 secondes

**Optimisations :**

- Utilise des agrégats SQL pour les totaux
- Charge uniquement les champs nécessaires pour les projets terminés
- Charge uniquement les champs streams pour les projets avec streams

### GET `/api/projects/[id]`

Récupère un projet spécifique.

### PATCH `/api/projects/[id]`

Met à jour un projet. Invalide automatiquement le cache.

### DELETE `/api/projects/[id]`

Supprime un projet. Invalide automatiquement le cache.

### POST `/api/projects/batch`

Crée plusieurs projets en batch. Invalide automatiquement le cache.

**Limite :** Maximum 100 projets par batch

### PATCH `/api/projects/reorder`

Met à jour l'ordre de plusieurs projets. Invalide automatiquement le cache.

### DELETE `/api/projects/purge`

Supprime tous les projets de l'utilisateur. Invalide automatiquement le cache.

## Invalidation du cache

Le cache est automatiquement invalidé lors de :

- Création d'un projet (POST `/api/projects`)
- Mise à jour d'un projet (PATCH `/api/projects/[id]`)
- Suppression d'un projet (DELETE `/api/projects/[id]`)
- Import batch (POST `/api/projects/batch`)
- Réordonnancement (PATCH `/api/projects/reorder`)
- Purge (DELETE `/api/projects/purge`)

**Tags utilisés :**

- `projects-{userId}` : Pour les listes de projets
- `projects-counts-{userId}` : Pour les comptes
- `projects-statistics-{userId}` : Pour les statistiques

## Impact sur les performances

### Avant les optimisations

- Chaque changement de filtre = 1 requête DB
- Chaque calcul de stats = charger tous les projets
- Pas de cache = requêtes répétées identiques
- Calculs en mémoire = lenteur avec beaucoup de projets

### Après les optimisations

- Requêtes DB seulement si cache expiré (60s) ou après mutation
- Agrégats SQL = calculs rapides même avec beaucoup de projets
- Cache = réduction drastique des requêtes DB
- Debounce = moins d'appels API inutiles

## Tests

Des tests unitaires complets ont été créés pour :

- Tous les endpoints API (`/api/projects/**`)
- Les composants clients (`ProjectsClient`, `AdminProjectsClient`)

**Exécuter les tests :**

```bash
npm test
npm run test:coverage
```

## Recommandations

1. **Pour le plan gratuit Neon :** Les optimisations sont parfaites pour rester dans les limites
2. **Si beaucoup de projets :** Activer la pagination côté client si nécessaire
3. **Monitoring :** Surveiller les métriques de cache hit rate
4. **Ajustement du cache :** Augmenter le TTL si besoin (actuellement 60s pour listes, 5min pour counts)

## Maintenance

- Les tests doivent être mis à jour si de nouveaux endpoints sont ajoutés
- Le cache doit être invalidé pour tout nouveau endpoint de mutation
- Surveiller les performances avec beaucoup d'utilisateurs simultanés
