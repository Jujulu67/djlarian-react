# ✅ Correction du Problème de Switch DB

## 🐛 Problème Identifié

Si vous utilisez le switch DB en local pour passer en SQLite, le `schema.prisma` est modifié et peut être commité avec `provider = "sqlite"`. Quand vous push sur Vercel, le build va utiliser SQLite alors que la production nécessite PostgreSQL.

## ✅ Solutions Mises en Place

### 1. Script de Build Vercel (Protection Automatique)

**Fichier** : `scripts/ensure-postgresql-schema.sh`

Ce script s'exécute **automatiquement avant chaque build sur Vercel** et force PostgreSQL même si le schema dans Git est en SQLite.

**Modification** : Le script `build` dans `package.json` :

```json
"build": "bash scripts/ensure-postgresql-schema.sh && prisma generate && next build"
```

**Résultat** :

- ✅ Même si vous commitez avec SQLite, Vercel build avec PostgreSQL
- ✅ Protection automatique en production

### 2. Hook Pre-Commit (Protection Locale)

**Fichier** : `.husky/pre-commit`

Ce hook **empêche de commiter** si le `schema.prisma` est en SQLite.

**Résultat** :

- ✅ Vous ne pouvez pas commiter avec SQLite par accident
- ✅ Le hook vous guide pour corriger avant le commit

## 🎯 Workflow Recommandé

### En Local (Développement)

1. **Utiliser le switch DB** dans l'admin panel pour basculer vers SQLite
2. **Développer** avec SQLite local
3. **Avant de commit** :
   - Le hook pre-commit vous empêchera de commiter avec SQLite
   - Utilisez le switch DB pour revenir à PostgreSQL
   - Ou exécutez : `pnpm run db:production`
4. **Commit** avec PostgreSQL dans le schema

### En Production (Vercel)

- ✅ Le script `ensure-postgresql-schema.sh` force PostgreSQL automatiquement
- ✅ Même si le schema dans Git est SQLite, Vercel build avec PostgreSQL
- ✅ **Double protection** : Hook pre-commit + Script build

## 📝 Commandes Utiles

```bash
# Forcer PostgreSQL (pour commit)
pnpm run db:production

# Utiliser SQLite local (pour dev)
pnpm run db:local

# Vérifier le provider actuel
grep "provider" prisma/schema.prisma
```

## ✅ Résultat Final

- ✅ **Local** : Vous pouvez utiliser SQLite pour le dev
- ✅ **Git** : Le schema est toujours en PostgreSQL (grâce au hook)
- ✅ **Vercel** : Force PostgreSQL même si Git a SQLite (grâce au script)
- ✅ **Double protection** : Hook + Script = Sécurité maximale

## 🔍 Test

Pour tester que ça fonctionne :

1. **En local** : Changez le schema en SQLite
2. **Essayez de commit** : Le hook devrait bloquer
3. **Sur Vercel** : Même si vous forcez un commit avec SQLite, le build corrigera automatiquement
