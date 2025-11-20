#!/bin/bash

# Script pour s'assurer que schema.prisma utilise PostgreSQL
# Utilisé lors du build Vercel pour garantir que la production utilise PostgreSQL
# En production (NODE_ENV=production), force toujours PostgreSQL
# En développement, vérifie le switch pour décider

set -e

SCHEMA_PATH="prisma/schema.prisma"
SWITCH_PATH=".db-switch.json"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "❌ Erreur: schema.prisma introuvable"
  exit 1
fi

# Variable pour savoir si le schéma a été modifié
SCHEMA_CHANGED=false

# Si on est en production, forcer PostgreSQL
if [ "$NODE_ENV" = "production" ]; then
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
    SCHEMA_CHANGED=true
  else
    echo "✅ Schema.prisma est déjà en PostgreSQL"
  fi
  
  # Si le schéma a été modifié, régénérer le client Prisma
  if [ "$SCHEMA_CHANGED" = true ]; then
    echo "🔄 Régénération du client Prisma..."
    npx prisma generate > /dev/null 2>&1 || npx prisma generate
    echo "✅ Client Prisma régénéré"
  fi
  
  exit 0
fi

# En développement, vérifier le switch
USE_PRODUCTION=false
if [ -f "$SWITCH_PATH" ]; then
  if command -v jq > /dev/null 2>&1; then
    USE_PRODUCTION=$(jq -r '.useProduction // false' "$SWITCH_PATH" 2>/dev/null || echo "false")
  else
    if grep -q '"useProduction"[[:space:]]*:[[:space:]]*true' "$SWITCH_PATH"; then
      USE_PRODUCTION="true"
    fi
  fi
fi

# Si le switch est on (useProduction: true), forcer PostgreSQL
if [ "$USE_PRODUCTION" = "true" ]; then
  if grep -q 'provider = "sqlite"' "$SCHEMA_PATH"; then
    echo "⚠️  Schema.prisma est en SQLite, correction vers PostgreSQL (switch activé)..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_PATH"
    else
      sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_PATH"
    fi
    
    echo "✅ Schema.prisma corrigé vers PostgreSQL"
    SCHEMA_CHANGED=true
  else
    echo "✅ Schema.prisma est déjà en PostgreSQL"
  fi
else
  # Si le switch est off, ne pas forcer PostgreSQL (laisser SQLite)
  echo "ℹ️  Mode développement avec switch off - PostgreSQL non forcé (utilise SQLite si configuré)"
fi

# Si le schéma a été modifié, régénérer le client Prisma
if [ "$SCHEMA_CHANGED" = true ]; then
  echo "🔄 Régénération du client Prisma..."
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  echo "✅ Client Prisma régénéré"
fi

