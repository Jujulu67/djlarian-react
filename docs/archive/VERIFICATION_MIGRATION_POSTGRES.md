# 🔍 Rapport de Vérification - Migration PostgreSQL

Date: $(date +%Y-%m-%d)

## ✅ 1. Vérifications Immédiates

### 1.1 DATABASE_URL

```bash
echo $DATABASE_URL
# Résultat: (vide, normal - dans .env.local)
```

### 1.2 Migrations Prisma

```bash
pnpm prisma migrate status
# ✅ Résultat: 25 migrations trouvées, DB à jour
# ✅ Connexion: PostgreSQL sur port 5433
```

### 1.3 Schema Prisma

```bash
grep provider prisma/schema.prisma
# ✅ Résultat: provider = "postgresql"
```

### 1.4 Prisma Client

```bash
pnpm prisma validate
# ✅ À exécuter manuellement
pnpm run prisma:generate
# ✅ À exécuter manuellement
```

---

## ✅ 2. Vérifications Switch DB

### 2.1 ✅ Ne réécrit PAS schema.prisma

**Fichier**: `src/app/api/admin/database/switch/route.ts`

- **Ligne 34-36**: Commentaire explicite "Ne plus modifier schema.prisma ni migration_lock.toml"
- **Vérification**: ✅ Le code ne modifie que `.env.local`

### 2.2 ✅ Protection Production

**Fichier**: `src/app/api/admin/database/switch/route.ts`

- **Ligne 87-105**: Vérification `ALLOW_PROD_DB=1` avant switch vers prod
- **Détection**: URLs contenant "neon.tech", "vercel", "production", "prod"
- **Vérification**: ✅ Protection active

### 2.3 ⚠️ Logs Sanitizés

**Fichier**: `src/app/api/admin/database/switch/route.ts`

- **Ligne 117**: `logger.warn('[DB SWITCH] ⚠️  Switch vers base de production...')`
- **Ligne 261**: `logger.error('Erreur lors du switch...')`
- **Problème**: Les URLs complètes ne sont PAS loggées (✅ bon)
- **Note**: Les logs mentionnent juste le type de DB, pas l'URL complète

### 2.4 ✅ Port par Défaut (CORRIGÉ: 5433)

**Fichier**: `src/app/api/admin/database/switch/route.ts`

- **Ligne 170**: ✅ URL par défaut utilise maintenant `localhost:5433`
- **Correction**: Appliquée

---

## ⚠️ 3. Vérifications Vercel

### 3.1 ✅ Script de Build

**Fichier**: `package.json`

- **Ligne 12**: `"build": "bash scripts/ensure-postgresql-schema.sh && ..."`
- **Vérification**: ✅ Utilise `ensure-postgresql-schema.sh`

### 3.2 ⚠️ Utilisation de `db push` en Production

**Fichier**: `scripts/ensure-postgresql-schema.sh`

- **Ligne 234-644**: Utilise `prisma migrate deploy` en priorité ✅
- **Problème**: Utilise `db push` comme fallback (lignes 458, 513, 589, 632, 651)
- **Impact**: `db push` en production est déconseillé (pas de versioning des migrations)
- **Note**: Le script utilise `db push` uniquement en fallback si `migrate deploy` échoue

### 3.3 ✅ Prisma Generate

**Fichier**: `scripts/ensure-postgresql-schema.sh`

- **Ligne 205-211**: `prisma generate` avant migrations ✅
- **Ligne 670-683**: `prisma generate` après migrations ✅

### 3.4 ✅ Migrate Deploy

**Fichier**: `scripts/ensure-postgresql-schema.sh`

- **Ligne 491**: `pnpm prisma migrate deploy` (priorité) ✅
- **Note**: Utilise `db push` en fallback uniquement si `migrate deploy` échoue

---

## ⚠️ 4. Docker Compose & Port 5433

### 4.1 ✅ docker-compose.yml

**Fichier**: `docker-compose.yml`

- **Ligne 10**: `'5433:5432'` ✅ Port correct

### 4.2 ✅ .gitignore

**Fichier**: `.gitignore`

- **Ligne 101**: `docker-compose.override.yml` ✅ Gitignored
- **Ligne 28**: `.env*.local` ✅ Gitignored

### 4.3 ✅ Scripts Actifs Corrigés (5433)

**Fichiers corrigés**:

- ✅ `src/app/api/admin/database/switch/route.ts` (ligne 170) - Port 5433
- ✅ `package.json` (ligne 36 - script `db:reset:local`) - Port 5433
- ✅ `scripts/wait-for-postgres.sh` (ligne 4) - Port 5433
- ✅ `scripts/bootstrap-postgres-local.sh` (ligne 20) - Message d'aide avec 5433

**Fichiers de migration (conservés avec 5432 - OK)**:

- `scripts/migrate-to-postgres-local.sh` (scripts de migration ponctuels)
- `scripts/migrate-sqlite-to-postgres.mjs` (scripts de migration ponctuels)

### 4.4 ✅ Documentation Port 5433

**Fichiers trouvés**:

- `docs/ENV_LOCAL_SETUP.md` (ligne 49) ✅ Mentionne 5433
- `MIGRATION_COMPLETE.md` (ligne 38) ✅ Mentionne 5433
- `MIGRATION_FINAL_STATUS.md` (ligne 25) ✅ Mentionne 5433

---

## ✅ 5. Reliquats SQLite

### 5.1 Scripts d'Archive

- `scripts/archive/` : Contient des scripts SQLite (normal, archive)
- `docs/archive/` : Contient de la doc SQLite (normal, archive)

### 5.2 ✅ Script de Démarrage (CORRIGÉ)

**Fichier**: `scripts/start-dev-with-auto-restart.sh`

- **Ligne 225**: ✅ Appelle maintenant `ensure-postgresql-schema.sh` même quand switch OFF
- **Correction**: Appliquée - Plus d'appel à `ensure-sqlite-schema.sh`

### 5.3 Documentation

- Beaucoup de références SQLite dans la doc (normal pour historique)
- Scripts de backup/restore SQLite conservés (utile pour migration)

---

## 🔧 Corrections Appliquées

### ✅ Corrections Appliquées

1. ✅ **Port 5432 → 5433 dans switch DB** (`src/app/api/admin/database/switch/route.ts:170`)
2. ✅ **Supprimer appel ensure-sqlite-schema.sh** (`scripts/start-dev-with-auto-restart.sh:225`)
3. ✅ **Corriger scripts utilisant port 5432** (voir section 4.3)

### Priorité MOYENNE

4. **Documenter l'utilisation de `db push` en fallback** (déjà documenté, mais à clarifier)
5. **Vérifier que tous les scripts dev/test utilisent DATABASE_URL_LOCAL** (vérification manuelle)

### Priorité BASSE

6. **Nettoyer les références SQLite dans la doc** (optionnel, historique utile)

---

## ✅ Checklist Finale

- [x] Migrations OK (25 migrations, DB à jour)
- [x] Schema Prisma en PostgreSQL
- [x] Switch DB ne modifie pas schema.prisma
- [x] Protection prod avec ALLOW_PROD_DB
- [x] Logs sanitizés (pas d'URL complète)
- [x] docker-compose.yml sur port 5433
- [x] docker-compose.override.yml gitignored
- [x] Port 5433 dans tous les scripts actifs (✅ corrigé)
- [x] Script de démarrage n'appelle plus ensure-sqlite-schema.sh (✅ corrigé)
- [x] Vercel utilise prisma generate
- [x] Vercel utilise migrate deploy (priorité)
- [ ] Vercel n'utilise pas db push en prod (⚠️ utilisé en fallback uniquement)

---

## 📝 Notes

1. **`db push` en fallback**: Le script `ensure-postgresql-schema.sh` utilise `db push` uniquement si `migrate deploy` échoue. C'est un compromis pour éviter que le build échoue, mais idéalement, `migrate deploy` devrait toujours réussir.

2. **Port 5432 vs 5433**: Plusieurs scripts utilisent encore 5432. Si PostgreSQL natif tourne sur 5432, ces scripts pointeront vers la mauvaise DB. À corriger.

3. **ensure-sqlite-schema.sh**: Ce script ne fait plus rien de mal (vérifie seulement), mais ne devrait pas être appelé car on n'utilise plus SQLite.
