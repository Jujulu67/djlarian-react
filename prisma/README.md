# Guide pour les futures migrations Prisma

## Structure actuelle

Le projet utilise Prisma avec une approche "baseline" où la structure de la base de données est capturée dans une migration initiale `0_init`. Cette approche est recommandée pour les projets existants.

## ⚠️ Important : Préserver les annotations Prisma

Si vous utilisez `prisma db pull` pour introspection, sachez que certaines annotations importantes peuvent être perdues, notamment :

- `@default(cuid())` sur les champs d'ID
- `@updatedAt` sur les champs de date de mise à jour
- Les relations et les noms de champ peuvent être modifiés

**Toujours vérifier le schéma** après une introspection et restaurer manuellement ces annotations si nécessaires.

## Avant de modifier le schéma

1. **Faire une sauvegarde** de la base de données avant toute migration :

```bash
pg_dump postgresql://user:password@localhost:5432/dj_larian > backup_$(date +%Y%m%d).sql
```

2. **Créer une branche** pour isoler les changements :

```bash
git checkout -b schema-changes
```

## Pour ajouter un nouveau champ ou table

1. Modifiez le fichier `schema.prisma` pour ajouter vos modifications.

2. Créez une migration Prisma :

```bash
npx prisma migrate dev --name descriptive_name_of_change
```

3. Vérifiez le fichier SQL généré dans `prisma/migrations/[timestamp]_descriptive_name_of_change/migration.sql`

4. Si tout semble correct, générez le client Prisma :

```bash
npx prisma generate
```

## Si vous rencontrez des problèmes

Si Prisma détecte un "drift" et veut réinitialiser la base de données :

1. **N'acceptez jamais de réinitialiser** ("Reset") une base de données de production.

2. Utilisez `--create-only` pour examiner le SQL avant de l'appliquer :

```bash
npx prisma migrate dev --name test_migration --create-only
```

3. Modifiez manuellement le fichier SQL généré pour effectuer uniquement les changements nécessaires.

4. Appliquez la migration modifiée :

```bash
npx prisma migrate dev --skip-generate
```

## En cas d'erreur grave

1. Restaurez la sauvegarde avec :

```bash
psql postgresql://user:password@localhost:5432/dj_larian < backup_file.sql
```

2. Si nécessaire, appliquez manuellement vos modifications avec des commandes SQL directes.

## Convention de Nommage des Relations (PascalCase)

**Important :** Pour éviter des erreurs d'exécution et des problèmes de linter, utilisez **toujours la casse PascalCase** pour les noms de relations lorsque vous utilisez `include`, `select` ou que vous manipulez des relations dans l'objet `data` des requêtes Prisma (`create`, `update`).

Par exemple, si votre schéma définit `model Track { ... TrackPlatform TrackPlatform[] ... }`, utilisez `TrackPlatform` dans votre code :

```typescript
// Correct (PascalCase)
await prisma.track.findMany({
  include: {
    TrackPlatform: true,
    GenresOnTracks: { include: { Genre: true } },
  },
});

// Incorrect (camelCase)
await prisma.track.findMany({
  include: {
    trackPlatform: true, // <- ERREUR
    genresOnTracks: { include: { genre: true } }, // <- ERREUR
  },
});
```

Cette convention s'applique également lors de l'accès aux données retournées par Prisma (`result.TrackPlatform`).

## Gestion des Erreurs de Linter (Faux Positifs)

Il est possible que TypeScript/ESLint signale des erreurs de type (faux positifs) lors de l'utilisation d'opérations Prisma comme `create` ou `upsert`, en particulier avec des créations imbriquées (`create: [...]`). Cela se produit souvent lorsque le linter s'attend à ce que vous fournissiez des champs qui sont en réalité auto-gérés par Prisma (par exemple, `@id @default(cuid())`, `@updatedAt`).

Dans ces cas, si vous êtes certain que la logique Prisma est correcte, vous pouvez ignorer ces erreurs spécifiques à l'aide de commentaires :

```typescript
// @ts-ignore - Le linter signale des champs manquants mais Prisma les gère
await prisma.genre.upsert({ ... });

// Ou avec une assertion de type (moins recommandé car masque plus de potentielles erreurs)
await prisma.track.create({
  data: {
    // ...
    TrackPlatform: {
      create: platformsData as any, // Assertion pour ignorer l'erreur de type
    }
  }
});
```

Soyez prudent lorsque vous ignorez des erreurs et assurez-vous que ce sont bien des faux positifs liés à l'inférence de type.
