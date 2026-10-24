# 📋 Résumé Final - Migration SQLite → PostgreSQL Local

## ✅ État Actuel

### Audit Complété

- ✅ **Schema.prisma**: `provider = "sqlite"` (⚠️ À corriger manuellement en `postgresql`)
- ✅ **Migration_lock.toml**: `provider = "postgresql"` (correct)
- ✅ **SQLite DB**: Existe avec 26 tables et données
- ✅ **Prisma**: Version 7.1.0
- ✅ **Node**: v22.12.0
- ✅ **DATABASE_URL**: Pointe vers SQLite (`file:./prisma/dev.db`)

### Fichiers Créés

- ✅ `scripts/migrate-sqlite-to-postgres.mjs` - Script de migration des données
- ✅ `scripts/migrate-to-postgres-local.sh` - Script automatisé complet
- ✅ `docs/MIGRATION_SQLITE_TO_POSTGRES.md` - Documentation détaillée
- ✅ `MIGRATION_COMMANDES.md` - Guide avec commandes copiables

### Sécurité Switch DB

- ✅ Protection prod avec `ALLOW_PROD_DB`
- ✅ Détection URLs prod (neon.tech, vercel, production, prod)
- ✅ Logs sanitizés (pas de credentials)
- ✅ Ne modifie pas `schema.prisma` ni `migration_lock.toml`

### Scripts Vercel/CI

- ✅ Build script utilise `ensure-postgresql-schema.sh`
- ✅ `ensure-postgresql-schema.sh` fait `prisma migrate deploy` (pas `db push` en prod)
- ✅ Scripts de migration idempotents et non-bloquants

---

## 🚀 Migration Rapide (Recommandé)

### Option 1: Script Automatisé

```bash
# Exécuter le script complet (guide interactif)
bash scripts/migrate-to-postgres-local.sh
```

### Option 2: Commandes Manuelles

Voir `MIGRATION_COMMANDES.md` pour toutes les commandes détaillées.

---

## 📝 Actions Requises (Ordre d'Exécution)

### 1. ⚠️ ACTION MANUELLE: Corriger schema.prisma

**Ouvrir `prisma/schema.prisma` et:**

- Ligne 8: Changer `provider = "sqlite"` → `provider = "postgresql"`
- **Note:** En Prisma 7, `url` est géré par `prisma.config.ts` (pas dans schema.prisma)

**Vérification:**

```bash
grep "provider = " prisma/schema.prisma
# Devrait afficher: provider = "postgresql"

pnpm prisma validate
# Devrait afficher: The schema at prisma/schema.prisma is valid ✅
```

### 2. Démarrer PostgreSQL Local

```bash
docker compose up -d
docker compose ps
# Vérifier: STATUS = Up (healthy)
```

### 3. Configurer .env.local

```bash
# Ajouter DATABASE_URL_LOCAL si n'existe pas
if ! grep -q "^DATABASE_URL_LOCAL" .env.local 2>/dev/null; then
  echo 'DATABASE_URL_LOCAL="postgresql://djlarian:<DEV_DB_PASSWORD>@localhost:5432/djlarian_dev?sslmode=disable"' >> .env.local
fi
```

### 4. Appliquer Migrations sur PostgreSQL

```bash
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@localhost:5432/djlarian_dev?sslmode=disable"
pnpm prisma migrate deploy
pnpm prisma migrate status
# Devrait afficher: Database schema is up to date!
```

### 5. Migrer les Données SQLite → PostgreSQL

```bash
# Dry-run d'abord (recommandé)
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs

# Vérifier les counts
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Project\";"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"
# Les counts doivent correspondre
```

### 6. Mettre à jour DATABASE_URL

```bash
# Remplacer dans .env.local
sed -i '' 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@localhost:5432/djlarian_dev?sslmode=disable"|' .env.local

# Vérifier
grep "^DATABASE_URL" .env.local
```

### 7. Validation Finale

```bash
# Générer Prisma Client
pnpm run prisma:generate

# Valider schema
pnpm prisma validate

# Démarrer l'app
pnpm run dev

# Tests
pnpm run test:assistant-router
pnpm run test:assistant-identity
pnpm run test:no-skips
```

---

## ✅ Checklist Complète

- [ ] **1. Schema.prisma corrigé manuellement**
  - [ ] `provider = "postgresql"` (ligne 8)
  - [ ] `pnpm prisma validate` passe (url géré par prisma.config.ts)

- [ ] **2. PostgreSQL Local opérationnel**
  - [ ] Docker Compose démarré (`docker compose up -d`)
  - [ ] Conteneur healthy (`docker compose ps`)
  - [ ] Connexion testée (`psql` ou Node.js)

- [ ] **3. Configuration .env.local**
  - [ ] `DATABASE_URL_LOCAL` configuré
  - [ ] `DATABASE_URL` mis à jour vers PostgreSQL local

- [ ] **4. Migrations appliquées**
  - [ ] `pnpm prisma migrate deploy` exécuté
  - [ ] `pnpm prisma migrate status` = "up to date"
  - [ ] Tables créées dans PostgreSQL

- [ ] **5. Données migrées**
  - [ ] Backup SQLite créé
  - [ ] Dry-run exécuté sans erreurs
  - [ ] Migration réelle exécutée
  - [ ] Counts vérifiés (SQLite = PostgreSQL)

- [ ] **6. Validation**
  - [ ] `pnpm run prisma:generate` exécuté
  - [ ] `pnpm prisma validate` passe
  - [ ] `pnpm run dev` démarre sans erreurs
  - [ ] Tests passent
  - [ ] Données accessibles dans l'app

---

## 🔄 Commandes de Reset (si besoin)

### Reset PostgreSQL Local (DESTRUCTIF)

```bash
# Supprimer le volume Docker (supprime toutes les données)
docker compose down -v

# Redémarrer
docker compose up -d

# Réappliquer migrations
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@localhost:5432/djlarian_dev?sslmode=disable"
pnpm prisma migrate deploy

# Re-migrer données
node scripts/migrate-sqlite-to-postgres.mjs
```

### Restaurer SQLite depuis Backup

```bash
# Lister backups
ls -la prisma/dev.db.backup.*

# Restaurer
cp prisma/dev.db.backup.YYYY-MM-DDTHH-MM-SS prisma/dev.db
```

---

## 🆘 Troubleshooting Rapide

| Erreur                            | Solution                                                  |
| --------------------------------- | --------------------------------------------------------- |
| `Cannot connect to Docker daemon` | `open -a Docker` (macOS) ou démarrer Docker Desktop       |
| `relation does not exist`         | `pnpm prisma migrate deploy`                              |
| `duplicate key value`             | Reset PostgreSQL et re-migrer (`pnpm run db:reset:local`) |
| `connection refused`              | `docker compose up -d` et vérifier logs                   |

---

## 📚 Documentation

- **Guide complet**: `docs/MIGRATION_SQLITE_TO_POSTGRES.md`
- **Commandes copiables**: `MIGRATION_COMMANDES.md`
- **Script automatisé**: `scripts/migrate-to-postgres-local.sh`
- **Script migration données**: `scripts/migrate-sqlite-to-postgres.mjs`

---

## 🎯 Résultat Final Attendu

Après migration complète:

1. ✅ **PostgreSQL local opérationnel** via Docker Compose
2. ✅ **Données SQLite migrées** vers PostgreSQL local (sans perte)
3. ✅ **.env.local configuré** proprement (DATABASE_URL_LOCAL + DATABASE_URL)
4. ✅ **Schema.prisma** avec `provider = "postgresql"` (sans `url`)
5. ✅ **Migrations appliquées** sur PostgreSQL
6. ✅ **Switch DB sécurisé** (protection prod, pas de modification schema)
7. ✅ **Scripts Vercel/CI cohérents** (migrate deploy, pas db push)
8. ✅ **App démarre** sans erreurs Prisma
9. ✅ **Tests passent** (assistant-router, assistant-identity, no-skips)
10. ✅ **Erreur P2021 impossible** (schema aligné, migrations appliquées)

---

## 🔐 Sécurité

- ✅ Switch DB ne modifie jamais `schema.prisma` ni `migration_lock.toml`
- ✅ Protection prod avec `ALLOW_PROD_DB` (bloque URLs prod par défaut)
- ✅ Détection automatique URLs prod (neon.tech, vercel, production, prod)
- ✅ Logs sanitizés (pas de credentials dans les logs)
- ✅ Scripts Vercel utilisent `migrate deploy` (pas `db push` en prod)

---

**Migration prête à être exécutée! 🚀**
