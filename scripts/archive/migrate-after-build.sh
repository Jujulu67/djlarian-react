#!/bin/bash
# Script temporaire pour exécuter les migrations après le build
# À retirer après la première migration réussie
# 
# NOTE: Ce script ne fait PAS échouer le build en cas d'erreur
# Les migrations sont non-bloquantes pour ne pas casser le déploiement

# Ne pas utiliser set -e pour ne pas faire échouer le build

echo "🔄 Exécution des migrations après le build..."

# Vérifier qu'on est en production
if [ "$NODE_ENV" != "production" ]; then
  echo "⚠️  NODE_ENV n'est pas 'production', skip des migrations"
  exit 0
fi

# Vérifier que DATABASE_URL est défini et pointe vers PostgreSQL
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL n'est pas défini, skip des migrations"
  exit 0
fi

# Vérifier que c'est PostgreSQL
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "⚠️  DATABASE_URL ne pointe pas vers PostgreSQL, skip des migrations"
  exit 0
fi

# Exécuter les migrations (non-bloquant pour le build)
echo "📋 Migration de la base de données..."
if pnpm run db:migrate:production 2>&1; then
  echo "✅ Migration DB réussie"
else
  echo "⚠️  Erreur lors de la migration DB (non-bloquant pour le build)"
  echo "   Vous pouvez réexécuter manuellement: pnpm run db:migrate:production"
fi

echo ""
echo "📸 Migration des images blob..."
if pnpm run db:migrate:blob-images 2>&1; then
  echo "✅ Migration images blob réussie"
else
  echo "⚠️  Erreur lors de la migration images blob (non-bloquant pour le build)"
  echo "   Vous pouvez réexécuter manuellement: pnpm run db:migrate:blob-images"
fi

echo ""
echo "✅ Processus de migration terminé (même en cas d'erreur, le build continue)"

