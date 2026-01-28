#!/bin/bash

# Script pour vérifier la configuration SQLite (DEPRECATED - Ne modifie plus schema.prisma)
# ⚠️  IMPORTANT: Ce script ne modifie plus schema.prisma ni migration_lock.toml
# PostgreSQL est maintenant la source de vérité unique
# Ce script est conservé pour compatibilité mais ne fait que des vérifications

set -e

SCHEMA_PATH="prisma/schema.prisma"
SWITCH_PATH=".db-switch.json"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "❌ Erreur: schema.prisma introuvable"
  exit 1
fi

# Vérifier le fichier de switch
USE_PRODUCTION=false
if [ -f "$SWITCH_PATH" ]; then
  if command -v jq > /dev/null 2>&1; then
    USE_PRODUCTION=$(jq -r '.useProduction // false' "$SWITCH_PATH" 2>/dev/null || echo "false")
  else
    if grep -q '"useProduction"[[:space:]]*:[[:space:]]*true' "$SWITCH_PATH"; then
      USE_PRODUCTION="true"
    else
      USE_PRODUCTION="false"
    fi
  fi
fi

# Si on est en production, ne rien faire
if [ "$NODE_ENV" = "production" ]; then
  echo "ℹ️  Mode production détecté, skip (utilise ensure-postgresql-schema.sh)"
  exit 0
fi

# ⚠️  IMPORTANT: Ne plus modifier schema.prisma
# PostgreSQL est la source de vérité unique
# Vérifier seulement que le schéma est en PostgreSQL
if grep -q 'provider = "sqlite"' "$SCHEMA_PATH"; then
  echo "⚠️  ATTENTION: schema.prisma est en SQLite"
  echo "   PostgreSQL est maintenant la source de vérité unique"
  echo "   Modifiez manuellement schema.prisma pour utiliser PostgreSQL"
  echo "   Ou utilisez: pnpm run prisma:fix:schema"
  exit 1
fi

echo "✅ Schema.prisma est en PostgreSQL (source de vérité)"

# Vérifier migration_lock.toml (ne plus modifier)
MIGRATION_LOCK_PATH="prisma/migrations/migration_lock.toml"
if [ -f "$MIGRATION_LOCK_PATH" ]; then
  if grep -q 'provider = "sqlite"' "$MIGRATION_LOCK_PATH"; then
    echo "⚠️  ATTENTION: migration_lock.toml est en SQLite"
    echo "   Modifiez manuellement migration_lock.toml pour utiliser PostgreSQL"
    echo "   Ou utilisez: pnpm run prisma:fix:migration-lock"
    exit 1
  fi
  echo "✅ migration_lock.toml est en PostgreSQL"
fi

# Vérifier DATABASE_URL pour SQLite (si switch off)
if [ "$USE_PRODUCTION" != "true" ]; then
  ENV_LOCAL_PATH=".env.local"
  if [ -f "$ENV_LOCAL_PATH" ]; then
    if grep -q '^DATABASE_URL=.*file:' "$ENV_LOCAL_PATH"; then
      echo "ℹ️  DATABASE_URL pointe vers SQLite (normal pour tests)"
      echo "   ⚠️  Pour le développement, utilisez PostgreSQL avec DATABASE_URL_PRODUCTION"
    fi
  fi
fi

# Toujours régénérer le client Prisma pour s'assurer qu'il correspond au schéma
echo "🔄 Régénération du client Prisma..."
rm -rf node_modules/.prisma 2>/dev/null || true
pnpm prisma generate > /dev/null 2>&1 || pnpm prisma generate
node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
echo "✅ Client Prisma régénéré"
