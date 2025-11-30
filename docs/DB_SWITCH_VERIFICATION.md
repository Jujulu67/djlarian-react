# ✅ Vérification du Switch de Base de Données

## 🎯 Objectif

S'assurer que le switch de DB depuis la config admin met à jour automatiquement tous les fichiers nécessaires pour que tout fonctionne correctement.

## ✅ Corrections Apportées

### 1. Switch de DB (`/api/admin/database/switch`)

**Avant** : Ne mettait à jour que `schema.prisma` et `.env.local`

**Maintenant** : Met à jour également `migration_lock.toml` pour correspondre au provider

```typescript
// Mise à jour de migration_lock.toml ajoutée
const migrationLockPath = path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml');
if (useProduction) {
  lockContent = lockContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
} else {
  lockContent = lockContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
}
```

### 2. Script `ensure-sqlite-schema.sh`

**Avant** : Ne mettait à jour que `schema.prisma`

**Maintenant** : Met à jour également `migration_lock.toml` selon le switch

- Si switch OFF (SQLite) : Met `migration_lock.toml` en `sqlite`
- Si switch ON (PostgreSQL) : Met `migration_lock.toml` en `postgresql`

### 3. Script `ensure-postgresql-schema.sh`

**Déjà correct** : Met à jour `migration_lock.toml` en `postgresql` en production

## 📋 Fichiers Mis à Jour par le Switch

Quand vous activez/désactivez le switch depuis `/admin/configuration` :

1. ✅ **`schema.prisma`** : Provider changé (`sqlite` ↔ `postgresql`)
2. ✅ **`migration_lock.toml`** : Provider changé (`sqlite` ↔ `postgresql`)
3. ✅ **`.env.local`** : `DATABASE_URL` mis à jour
4. ✅ **`.db-switch.json`** : État du switch sauvegardé

## 🔄 Flux Complet

### Activation du Switch PostgreSQL

1. Utilisateur active le switch dans `/admin/configuration`
2. API `/api/admin/database/switch` :
   - Met à jour `schema.prisma` → `postgresql`
   - Met à jour `migration_lock.toml` → `postgresql`
   - Met à jour `.env.local` → `DATABASE_URL_PRODUCTION`
   - Sauvegarde l'état dans `.db-switch.json`
3. Serveur redémarre automatiquement
4. `ensure-sqlite-schema.sh` (si exécuté) vérifie et corrige si nécessaire

### Désactivation du Switch (SQLite)

1. Utilisateur désactive le switch dans `/admin/configuration`
2. API `/api/admin/database/switch` :
   - Met à jour `schema.prisma` → `sqlite`
   - Met à jour `migration_lock.toml` → `sqlite`
   - Met à jour `.env.local` → `file:./prisma/dev.db`
   - Sauvegarde l'état dans `.db-switch.json`
3. Serveur redémarre automatiquement
4. `ensure-sqlite-schema.sh` (si exécuté) vérifie et corrige si nécessaire

## 🛡️ Scripts de Vérification

### `ensure-sqlite-schema.sh`

- ✅ Vérifie le switch dans `.db-switch.json`
- ✅ Met à jour `schema.prisma` selon le switch
- ✅ Met à jour `migration_lock.toml` selon le switch
- ✅ Met à jour `.env.local` si nécessaire
- ✅ Régénère le client Prisma
- ✅ Nettoie le cache Next.js si le schéma a changé

### `ensure-postgresql-schema.sh`

- ✅ Force PostgreSQL en production (`NODE_ENV=production`)
- ✅ Met à jour `schema.prisma` vers PostgreSQL
- ✅ Met à jour `migration_lock.toml` vers PostgreSQL
- ✅ Vérifie `DATABASE_URL` et `BLOB_READ_WRITE_TOKEN`
- ✅ Applique les migrations Prisma
- ✅ Régénère le client Prisma

## ✅ Vérifications Effectuées

1. ✅ **Switch de DB** : Met à jour `migration_lock.toml` automatiquement
2. ✅ **ensure-sqlite-schema.sh** : Met à jour `migration_lock.toml` selon le switch
3. ✅ **ensure-postgresql-schema.sh** : Met à jour `migration_lock.toml` en production
4. ✅ **Syntaxe des scripts** : Tous les scripts sont valides

## 🎯 Résultat

✅ **Le switch de DB met à jour automatiquement tous les fichiers nécessaires**
✅ **Les scripts de prod et test sont cohérents**
✅ **Aucune action manuelle requise**

---

**Date de vérification** : $(date)
**Fichiers modifiés** :

- `src/app/api/admin/database/switch/route.ts`
- `scripts/ensure-sqlite-schema.sh`
