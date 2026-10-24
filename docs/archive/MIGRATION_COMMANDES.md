# 🚀 Commandes de Migration SQLite → PostgreSQL Local

**Guide rapide avec commandes copiables**

## ⚡ Migration Automatique (Recommandé)

```bash
# Exécuter le script automatisé
bash scripts/migrate-to-postgres-local.sh
```

Le script guide à travers toutes les étapes et demande confirmation aux moments critiques.

---

## 📝 Migration Manuelle (Étape par Étape)

### Phase A - Audit (Déjà fait ✅)

```bash
# Vérifier l'état actuel
cat prisma/schema.prisma | sed -n '1,15p'
cat prisma/migrations/migration_lock.toml
pnpm prisma -v
node -v
echo $DATABASE_URL
sqlite3 prisma/dev.db ".tables"
```

**Output attendu:**

- `provider = "sqlite"` dans schema.prisma (⚠️ À CORRIGER)
- `provider = "postgresql"` dans migration_lock.toml ✅
- SQLite DB avec ~26 tables ✅

---

### Phase B - Docker PostgreSQL

```bash
# 1. Démarrer PostgreSQL
docker compose up -d

# 2. Vérifier que le conteneur tourne
docker compose ps

# Output attendu:
# NAME                    IMAGE               STATUS
# djlarian-postgres-local postgres:16-alpine  Up (healthy)

# 3. Vérifier les logs si problème
docker compose logs postgres

# 4. Ajouter DATABASE_URL_LOCAL dans .env.local
if ! grep -q "^DATABASE_URL_LOCAL" .env.local 2>/dev/null; then
  echo 'DATABASE_URL_LOCAL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"' >> .env.local
  echo "✅ DATABASE_URL_LOCAL ajouté"
fi

# 5. Tester la connexion
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" -c "\dt"
```

**Si psql n'est pas installé:**

```bash
# Tester avec Node.js
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable'});p.query('SELECT 1').then(()=>{console.log('✅ Connexion OK');p.end()}).catch(e=>{console.error('❌',e.message);p.end()})"
```

---

### Phase C - Corriger schema.prisma (MANUEL ⚠️)

**⚠️ ACTION MANUELLE REQUISE - Ne pas automatiser**

1. Ouvrir `prisma/schema.prisma`
2. Ligne 8, changer:
   ```prisma
   provider = "sqlite"  // ❌
   ```
   En:
   ```prisma
   provider = "postgresql"  // ✅
   ```
3. **Note:** En Prisma 7, `url` est géré par `prisma.config.ts` (pas dans schema.prisma)

**Vérification:**

```bash
# Vérifier que le provider est postgresql
grep "provider = " prisma/schema.prisma

# Devrait afficher: provider = "postgresql"

# Valider le schema
pnpm prisma validate
```

**Output attendu:**

```
The schema at prisma/schema.prisma is valid ✅
```

---

### Phase D - Appliquer Migrations sur PostgreSQL

```bash
# 1. Utiliser DATABASE_URL_LOCAL temporairement
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# 2. Appliquer les migrations
pnpm prisma migrate deploy

# Output attendu:
# Applying migration `20250424125117_init`
# Applying migration `20250426202133_add_publish_at_to_event`
# ...
# X migrations applied successfully.

# 3. Vérifier l'état
pnpm prisma migrate status

# Output attendu:
# Database schema is up to date!

# 4. Lister les tables créées
psql "$DATABASE_URL" -c "\dt" | head -30
```

---

### Phase E - Migration des Données SQLite → PostgreSQL

```bash
# 1. Backup SQLite (automatique dans le script)
# Le script crée: prisma/dev.db.backup.YYYY-MM-DDTHH-MM-SS

# 2. Dry-run (simulation - RECOMMANDÉ)
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Output attendu:
# 🚀 Migration SQLite -> PostgreSQL
# Mode: DRY-RUN (simulation)
# ...
# ✅ Migration terminée!

# 3. Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs

# Output attendu:
# 🚀 Migration SQLite -> PostgreSQL
# Mode: MIGRATION RÉELLE
# 📦 Backup créé: prisma/dev.db.backup.2025-12-14T14-30-00
# ...
# ✅ Migration terminée!

# 4. Vérifier les counts
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Project\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"AssistantConfirmation\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"

# Comparer avec SQLite
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM AssistantConfirmation;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"
```

**Les counts doivent correspondre entre SQLite et PostgreSQL.**

---

### Phase F - Mise à jour .env.local

```bash
# Changer DATABASE_URL pour pointer vers PostgreSQL local
# Option 1: Utiliser sed (macOS)
sed -i '' 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"|' .env.local

# Option 2: Utiliser sed (Linux)
sed -i 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"|' .env.local

# Option 3: Éditer manuellement .env.local
# Remplacer:
# DATABASE_URL=file:./prisma/dev.db
# Par:
# DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Vérifier
grep "^DATABASE_URL" .env.local
```

---

### Phase G - Validation Finale

```bash
# 1. Générer Prisma Client
pnpm run prisma:generate

# Output attendu:
# Prisma Client generated

# 2. Valider le schema
pnpm prisma validate

# Output attendu:
# The schema at prisma/schema.prisma is valid ✅

# 3. Démarrer l'app
pnpm run dev

# Vérifier dans les logs:
# ✅ Pas d'erreurs Prisma
# ✅ Connexion à PostgreSQL réussie

# 4. Lancer les tests
pnpm run test:assistant-router
pnpm run test:assistant-identity
pnpm run test:no-skips

# 5. Vérifier les données (optionnel)
pnpm run db:studio
# Ouvrir http://localhost:5555 et vérifier les tables
```

---

## 🔄 Commandes de Reset (si besoin)

### Reset PostgreSQL local (DESTRUCTIF - supprime toutes les données)

```bash
# 1. Arrêter et supprimer le volume Docker
docker compose down -v

# 2. Redémarrer PostgreSQL
docker compose up -d

# 3. Attendre que PostgreSQL soit prêt
sleep 5

# 4. Réappliquer les migrations
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"
pnpm prisma migrate deploy

# 5. Re-migrer les données depuis SQLite
node scripts/migrate-sqlite-to-postgres.mjs
```

### Restaurer SQLite depuis backup

```bash
# Lister les backups
ls -la prisma/dev.db.backup.*

# Restaurer un backup spécifique
cp prisma/dev.db.backup.YYYY-MM-DDTHH-MM-SS prisma/dev.db
```

---

## 🆘 Troubleshooting

### Erreur: "Cannot connect to Docker daemon"

```bash
# Démarrer Docker Desktop
open -a Docker  # macOS
# ou
systemctl start docker  # Linux

# Attendre que Docker soit prêt, puis:
docker compose up -d
```

### Erreur: "relation does not exist"

```bash
# Les migrations ne sont pas appliquées
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"
pnpm prisma migrate deploy
```

### Erreur: "P1012: url is no longer supported"

```bash
# Supprimer la ligne url = env("DATABASE_URL") de schema.prisma
# Prisma 7 utilise prisma.config.ts pour l'URL
```

### Erreur: "duplicate key value" lors de la migration

```bash
# La migration a déjà été partiellement exécutée
# Vérifier les données:
psql "$DATABASE_URL" -c "SELECT * FROM \"_prisma_migrations\";"

# Si nécessaire, nettoyer et recommencer:
# 1. Reset PostgreSQL (voir section Reset)
# 2. Réappliquer migrations
# 3. Re-migrer données
```

### Erreur: "connection refused" PostgreSQL

```bash
# Vérifier que PostgreSQL tourne
docker compose ps

# Si pas démarré:
docker compose up -d

# Vérifier les logs
docker compose logs postgres
```

---

## ✅ Checklist Finale

- [ ] Docker PostgreSQL démarré et healthy
- [ ] `schema.prisma` avec `provider = "postgresql"` (ligne 8)
- [ ] Ligne `url = env("DATABASE_URL")` supprimée de `schema.prisma`
- [ ] `DATABASE_URL_LOCAL` configuré dans `.env.local`
- [ ] Migrations appliquées sur PostgreSQL (`pnpm prisma migrate deploy`)
- [ ] Données SQLite migrées vers PostgreSQL
- [ ] Counts vérifiés (SQLite = PostgreSQL)
- [ ] `DATABASE_URL` dans `.env.local` pointe vers PostgreSQL local
- [ ] `pnpm run prisma:generate` exécuté
- [ ] `pnpm prisma validate` passe
- [ ] `pnpm run dev` démarre sans erreurs
- [ ] Tests passent
- [ ] Switch DB fonctionne et est sécurisé

---

## 📚 Documentation Complète

Pour plus de détails, voir: `docs/MIGRATION_SQLITE_TO_POSTGRES.md`
