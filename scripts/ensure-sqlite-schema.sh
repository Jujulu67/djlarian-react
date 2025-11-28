#!/bin/bash

# Script pour s'assurer que schema.prisma utilise SQLite
# Utilisé en développement/test pour garantir que le schéma correspond au switch "off"
# Par défaut, quand le switch est off, on utilise SQLite

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
  # Lire le fichier de switch (format JSON)
  # Utiliser une méthode plus robuste pour lire le JSON
  if command -v jq > /dev/null 2>&1; then
    # Si jq est disponible, l'utiliser
    USE_PRODUCTION=$(jq -r '.useProduction // false' "$SWITCH_PATH" 2>/dev/null || echo "false")
  else
    # Sinon, utiliser grep (moins robuste mais fonctionne)
    if grep -q '"useProduction"[[:space:]]*:[[:space:]]*true' "$SWITCH_PATH"; then
      USE_PRODUCTION="true"
    else
      USE_PRODUCTION="false"
    fi
  fi
fi

# Si on est en production, ne pas modifier (utiliser ensure-postgresql-schema.sh)
if [ "$NODE_ENV" = "production" ]; then
  echo "ℹ️  Mode production détecté, ne pas modifier le schéma"
  exit 0
fi

# Variable pour savoir si le schéma a été modifié
SCHEMA_CHANGED=false

# Si le switch est off (useProduction: false), forcer SQLite
if [ "$USE_PRODUCTION" != "true" ]; then
  # Vérifier si le schema est en PostgreSQL
  if grep -q 'provider = "postgresql"' "$SCHEMA_PATH"; then
    echo "⚠️  Schema.prisma est en PostgreSQL, correction vers SQLite pour le développement..."
    
    # Remplacer PostgreSQL par SQLite
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA_PATH"
    else
      # Linux
      sed -i 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA_PATH"
    fi
    
    echo "✅ Schema.prisma corrigé vers SQLite"
    SCHEMA_CHANGED=true
  else
    echo "✅ Schema.prisma est déjà en SQLite"
  fi
else
  # Si le switch est on (useProduction: true), forcer PostgreSQL
  if grep -q 'provider = "sqlite"' "$SCHEMA_PATH"; then
    echo "⚠️  Schema.prisma est en SQLite, correction vers PostgreSQL (switch activé)..."
    
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
fi

# Mettre à jour DATABASE_URL dans .env.local si nécessaire
ENV_LOCAL_PATH=".env.local"
if [ "$USE_PRODUCTION" = "true" ]; then
  # Si le switch est activé (PostgreSQL), vérifier que DATABASE_URL_PRODUCTION est défini
  if [ -f "$ENV_LOCAL_PATH" ]; then
    # Vérifier si DATABASE_URL_PRODUCTION existe
    if ! grep -q '^DATABASE_URL_PRODUCTION=' "$ENV_LOCAL_PATH"; then
      echo "⚠️  ATTENTION: DATABASE_URL_PRODUCTION n'est pas défini dans .env.local"
      echo "   Le switch PostgreSQL est activé mais DATABASE_URL_PRODUCTION est manquant."
      echo "   Ajoutez DATABASE_URL_PRODUCTION dans .env.local pour utiliser PostgreSQL en local."
    else
      echo "✅ DATABASE_URL_PRODUCTION est défini dans .env.local"
    fi
    
    # Vérifier si DATABASE_URL pointe vers SQLite alors que le switch est activé
    if grep -q '^DATABASE_URL=.*file:' "$ENV_LOCAL_PATH"; then
      echo "ℹ️  DATABASE_URL pointe vers SQLite mais le switch PostgreSQL est activé."
      echo "   Le code utilisera automatiquement DATABASE_URL_PRODUCTION si disponible."
    fi
  else
    echo "⚠️  ATTENTION: .env.local n'existe pas et le switch PostgreSQL est activé"
    echo "   Créez .env.local avec DATABASE_URL_PRODUCTION pour utiliser PostgreSQL en local."
  fi
elif [ "$USE_PRODUCTION" != "true" ]; then
  # Vérifier si .env.local existe et si DATABASE_URL pointe vers PostgreSQL
  if [ -f "$ENV_LOCAL_PATH" ]; then
    if grep -q '^DATABASE_URL=.*postgresql' "$ENV_LOCAL_PATH"; then
      echo "⚠️  DATABASE_URL dans .env.local pointe vers PostgreSQL, correction vers SQLite..."
      
      # Sauvegarder l'ancienne valeur si elle n'est pas déjà sauvegardée
      if [ ! -f ".env.local.backup" ]; then
        grep '^DATABASE_URL=' "$ENV_LOCAL_PATH" >> .env.local.backup 2>/dev/null || true
      fi
      
      # Remplacer DATABASE_URL par SQLite
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|^DATABASE_URL=.*|DATABASE_URL="file:./prisma/dev.db"|' "$ENV_LOCAL_PATH"
      else
        # Linux
        sed -i 's|^DATABASE_URL=.*|DATABASE_URL="file:./prisma/dev.db"|' "$ENV_LOCAL_PATH"
      fi
      
      echo "✅ DATABASE_URL corrigée vers SQLite dans .env.local"
    elif ! grep -q '^DATABASE_URL=' "$ENV_LOCAL_PATH"; then
      # Ajouter DATABASE_URL si elle n'existe pas
      echo "" >> "$ENV_LOCAL_PATH"
      echo "# Base de données locale (SQLite) pour le développement" >> "$ENV_LOCAL_PATH"
      echo 'DATABASE_URL="file:./prisma/dev.db"' >> "$ENV_LOCAL_PATH"
      echo "✅ DATABASE_URL ajoutée dans .env.local"
    else
      echo "✅ DATABASE_URL est déjà correcte dans .env.local"
    fi
  else
    # Créer .env.local avec DATABASE_URL SQLite
    echo "# Base de données locale (SQLite) pour le développement" > "$ENV_LOCAL_PATH"
    echo 'DATABASE_URL="file:./prisma/dev.db"' >> "$ENV_LOCAL_PATH"
    echo "✅ Fichier .env.local créé avec DATABASE_URL SQLite"
  fi
fi

# Toujours régénérer le client Prisma pour s'assurer qu'il correspond au schéma actuel
# (même si le schéma n'a pas changé, le client peut avoir été généré avec un autre provider)
echo "🔄 Régénération du client Prisma pour s'assurer de la cohérence..."
# Supprimer l'ancien client pour forcer une régénération complète
rm -rf node_modules/.prisma 2>/dev/null || true
npx prisma generate > /dev/null 2>&1 || npx prisma generate
# Corriger les fichiers default.js et default.mjs pour Prisma 7
node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
echo "✅ Client Prisma régénéré"

# Nettoyer le cache Next.js pour forcer le rechargement du nouveau client
# (important quand on change de provider pour éviter les incohérences)
if [ "$SCHEMA_CHANGED" = true ]; then
  echo "🧹 Nettoyage du cache Next.js pour recharger le nouveau client Prisma..."
  rm -rf .next 2>/dev/null || true
  echo "✅ Cache Next.js nettoyé"
fi

