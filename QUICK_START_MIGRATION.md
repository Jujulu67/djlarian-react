# ⚡ Quick Start - Migration SQLite → PostgreSQL

**Guide ultra-rapide pour démarrer la migration**

## 🎯 Objectif

Migrer la base locale SQLite vers PostgreSQL local sans perdre de données.

## ⚡ Commande Unique (Recommandé)

```bash
bash scripts/migrate-to-postgres-local.sh
```

Le script guide à travers toutes les étapes interactivement.

---

## 📋 Étapes Manuelles (Si Préféré)

### 1. ⚠️ ACTION MANUELLE: Corriger schema.prisma

**Ouvrir `prisma/schema.prisma`:**

- Ligne 8: `provider = "sqlite"` → `provider = "postgresql"`
- **Note:** En Prisma 7, `url` est géré par `prisma.config.ts` (pas dans schema.prisma)

**Vérifier:**

```bash
grep "provider = " prisma/schema.prisma
npx prisma validate
```

### 2. Démarrer PostgreSQL

```bash
docker compose up -d
docker compose ps  # Vérifier: Up (healthy)
```

### 3. Configurer .env.local

```bash
echo 'DATABASE_URL_LOCAL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"' >> .env.local
```

### 4. Appliquer Migrations

```bash
export DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
npx prisma migrate deploy
```

### 5. Migrer Données

```bash
# Dry-run
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs
```

### 6. Mettre à jour DATABASE_URL

```bash
sed -i '' 's|^DATABASE_URL=file:.*|DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"|' .env.local
```

### 7. Valider

```bash
npm run prisma:generate
npx prisma validate
npm run dev
```

---

## 📚 Documentation Complète

- **Résumé**: `RESUME_MIGRATION.md`
- **Commandes détaillées**: `MIGRATION_COMMANDES.md`
- **Guide complet**: `docs/MIGRATION_SQLITE_TO_POSTGRES.md`

---

## ✅ Checklist Rapide

- [ ] Schema.prisma corrigé (`provider = "postgresql"`, ligne `url` supprimée)
- [ ] PostgreSQL démarré (`docker compose up -d`)
- [ ] DATABASE_URL_LOCAL dans .env.local
- [ ] Migrations appliquées (`npx prisma migrate deploy`)
- [ ] Données migrées (`node scripts/migrate-sqlite-to-postgres.mjs`)
- [ ] DATABASE_URL mis à jour dans .env.local
- [ ] `npm run prisma:generate` exécuté
- [ ] `npm run dev` démarre sans erreurs

---

**C'est tout! 🚀**
