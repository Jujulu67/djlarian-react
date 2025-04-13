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
