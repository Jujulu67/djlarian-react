# ✅ Corrections Appliquées - Migration SQLite → PostgreSQL

## 🔧 Corrections Immédiates

### 1. ✅ schema.prisma Corrigé

**Avant:**

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**Après:**

```prisma
datasource db {
  provider = "postgresql"
  // Note: url est géré par prisma.config.ts (Prisma 7)
}
```

**Validation:** ✅ `pnpm prisma validate` passe

**Note:** En Prisma 7, `url` n'est plus dans `schema.prisma` mais dans `prisma.config.ts` (déjà configuré).

---

### 2. ✅ Script migrate-to-postgres-local.sh Amélioré

**Améliorations:**

- ✅ **Fail fast** si `schema.prisma` est encore en SQLite (exit 1 immédiat)
- ✅ **Check "table exists"** avant migration (avertit si base contient déjà des tables)
- ✅ **Vérification migrate status** avant et après application des migrations
- ✅ Meilleure gestion des erreurs

---

### 3. ✅ pnpm run db:reset:local Ajouté

**Commande:**

```bash
pnpm run db:reset:local
```

**Action:**

- Supprime le volume Docker PostgreSQL (wipe complet)
- Redémarre PostgreSQL
- Réapplique les migrations

**Usage:** Pour repartir propre quand nécessaire.

---

### 4. ✅ .gitignore Mis à Jour

**Ajouté:**

- `prisma/dev.db.backup.*` (backups avec timestamp)
- `dumps/` et `backups/` (dossiers de backups)
- `*.db.backup*` et `*.sqlite.backup*` (patterns génériques)
- `docker-compose.override.yml` (configs personnelles)

**Note:** `docker-compose.yml` est **commité** (standard dev doit être dans le repo).

---

## 📋 Prochaines Étapes

### 1. Démarrer PostgreSQL

```bash
docker compose up -d
docker compose ps  # Vérifier: Up (healthy)
```

### 2. Configurer .env.local

```bash
# Ajouter/modifier DATABASE_URL
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"
```

### 3. Appliquer Migrations

```bash
pnpm run prisma:generate
pnpm prisma validate
pnpm prisma migrate deploy
pnpm prisma migrate status
```

### 4. Migrer Données

```bash
# Dry-run d'abord
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Migration réelle
bash scripts/migrate-to-postgres-local.sh
```

### 5. Validation

```bash
pnpm run dev
pnpm run test:assistant-router
pnpm run test:assistant-identity
pnpm run test:no-skips
```

---

## ✅ Checklist

- [x] schema.prisma corrigé (`provider = "postgresql"`, pas de `url`)
- [x] Script migrate-to-postgres-local.sh amélioré (fail fast, checks)
- [x] pnpm run db:reset:local ajouté
- [x] .gitignore mis à jour (backups, docker-compose.override.yml)
- [x] Documentation mise à jour (garder url → url dans prisma.config.ts)
- [ ] PostgreSQL démarré
- [ ] .env.local configuré
- [ ] Migrations appliquées
- [ ] Données migrées
- [ ] Tests passent

---

## 🎯 Résultat

**Schema valide:** ✅ `pnpm prisma validate` passe

**Prêt pour migration:** Tous les scripts et configurations sont en place.

**Prochaine action:** Exécuter `bash scripts/migrate-to-postgres-local.sh`
