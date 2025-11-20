#!/bin/bash

# Script pour s'assurer que schema.prisma utilise PostgreSQL
# Utilisé lors du build Vercel pour garantir que la production utilise PostgreSQL

set -e

SCHEMA_PATH="prisma/schema.prisma"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "❌ Erreur: schema.prisma introuvable"
  exit 1
fi

# Vérifier si le schema est en SQLite
if grep -q 'provider = "sqlite"' "$SCHEMA_PATH"; then
  echo "⚠️  Schema.prisma est en SQLite, correction vers PostgreSQL pour la production..."
  
  # Remplacer SQLite par PostgreSQL
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_PATH"
  else
    # Linux
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_PATH"
  fi
  
  echo "✅ Schema.prisma corrigé vers PostgreSQL"
else
  echo "✅ Schema.prisma est déjà en PostgreSQL"
fi

