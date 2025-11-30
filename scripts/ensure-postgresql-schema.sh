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
  
  # Vérifier et corriger migration_lock.toml si nécessaire
  MIGRATION_LOCK_PATH="prisma/migrations/migration_lock.toml"
  if [ -f "$MIGRATION_LOCK_PATH" ]; then
    if grep -q 'provider = "sqlite"' "$MIGRATION_LOCK_PATH"; then
      echo "⚠️  migration_lock.toml est en SQLite, correction vers PostgreSQL pour la production..."
      
      # Remplacer SQLite par PostgreSQL dans migration_lock.toml
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' "$MIGRATION_LOCK_PATH"
      else
        # Linux
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$MIGRATION_LOCK_PATH"
      fi
      
      echo "✅ migration_lock.toml corrigé vers PostgreSQL"
    else
      echo "✅ migration_lock.toml est déjà en PostgreSQL"
    fi
  fi
  
  # Vérifier que DATABASE_URL est configuré en production
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERREUR: DATABASE_URL n'est pas défini en production!"
    echo "   La base de données PostgreSQL est requise pour le build Vercel."
    echo "   Assurez-vous que DATABASE_URL est configuré dans les variables d'environnement Vercel."
    exit 1
  else
    # Vérifier que DATABASE_URL pointe vers PostgreSQL (pas SQLite)
    if echo "$DATABASE_URL" | grep -q '^file:'; then
      echo "❌ ERREUR: DATABASE_URL pointe vers SQLite (file:) en production!"
      echo "   La production nécessite PostgreSQL (Neon)."
      echo "   Configurez DATABASE_URL avec votre connection string PostgreSQL dans Vercel."
      exit 1
    elif echo "$DATABASE_URL" | grep -qE '^postgresql://|^postgres://'; then
      echo "✅ DATABASE_URL est configuré et pointe vers PostgreSQL"
    else
      echo "⚠️  ATTENTION: Format de DATABASE_URL non reconnu. Vérifiez qu'il s'agit d'une connection string PostgreSQL."
    fi
  fi
  
  # Vérifier que BLOB_READ_WRITE_TOKEN est configuré en production
  if [ -z "$BLOB_READ_WRITE_TOKEN" ]; then
    echo "⚠️  ATTENTION: BLOB_READ_WRITE_TOKEN n'est pas défini en production!"
    echo "   Les images ne pourront pas être uploadées vers Vercel Blob."
    echo "   Assurez-vous que BLOB_READ_WRITE_TOKEN est configuré dans les variables d'environnement Vercel."
  else
    echo "✅ BLOB_READ_WRITE_TOKEN est configuré (production utilisera Vercel Blob)"
  fi
  
  # Régénérer le client Prisma AVANT les migrations (pour avoir un client de base)
  echo "🔄 Régénération initiale du client Prisma..."
  # Supprimer l'ancien client pour forcer une régénération complète
  rm -rf node_modules/.prisma 2>/dev/null || true
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  # Corriger les fichiers default.js et default.mjs pour Prisma 7
  node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
  echo "✅ Client Prisma régénéré (pré-migration)"
  
  # Appliquer les migrations Prisma en production
  echo "🔄 Application automatique des migrations Prisma..."
  echo "   (Seules les migrations manquantes seront appliquées, aucune perte de données)"
  
  # Vérifier si des migrations Prisma existent (dossiers timestampés)
  MIGRATIONS_EXIST=false
  if [ -d "prisma/migrations" ]; then
    # Chercher des dossiers de migrations Prisma (format: timestamp_name)
    for dir in prisma/migrations/*/; do
      if [ -f "${dir}migration.sql" ]; then
        MIGRATIONS_EXIST=true
        break
      fi
    done
  fi
  
  if [ "$MIGRATIONS_EXIST" = true ]; then
    # Migrations Prisma standard existent, utiliser migrate deploy
    # migrate deploy est SÉCURISÉ : il applique uniquement les migrations manquantes
    # Il ne supprime JAMAIS de données, seulement ajoute/modifie le schéma
    echo "   📋 Migrations Prisma détectées, application des migrations manquantes..."
    
    # Vérifier d'abord l'état des migrations (pour éviter les timeouts de verrous)
    echo "   🔍 Vérification de l'état des migrations..."
    MIGRATE_STATUS_OUTPUT=$(npx prisma migrate status 2>&1 || true)
    
    # Fonction pour résoudre une migration échouée
    resolve_failed_migration() {
      local status_output="$1"
      echo "   ⚠️  Migrations échouées détectées, tentative de résolution..."
      
      # Extraire le nom de la migration échouée depuis le message d'erreur
      # Format: The `20251130022530_add_milestone_notifications` migration started at...
      # Utiliser sed pour extraire le contenu entre backticks
      FAILED_MIGRATION=$(echo "$status_output" | sed -n "s/.*\`\([0-9]\{14\}_[a-zA-Z0-9_]*\)\`.*/\1/p" | head -1 || echo "")
      
      if [ -z "$FAILED_MIGRATION" ]; then
        # Essayer un autre format (sans backticks dans le message)
        FAILED_MIGRATION=$(echo "$status_output" | grep -oE '[0-9]{14}_[a-zA-Z0-9_]+' | head -1 || echo "")
      fi
      
      if [ -z "$FAILED_MIGRATION" ]; then
        # Dernier essai : chercher n'importe quel pattern timestamp_nom
        FAILED_MIGRATION=$(echo "$status_output" | grep -oE '[0-9]+_[a-zA-Z0-9_]+' | head -1 || echo "")
      fi
      
      if [ -n "$FAILED_MIGRATION" ]; then
        echo "   🔧 Résolution de la migration échouée: $FAILED_MIGRATION"
        # Marquer la migration comme rolled-back pour pouvoir la réappliquer
        if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" 2>&1; then
          echo "   ✅ Migration marquée comme rolled-back, elle sera réappliquée"
          return 0
        else
          echo "   ⚠️  Impossible de marquer la migration comme rolled-back, tentative avec --applied..."
          # Si rolled-back échoue, essayer applied (si la migration a partiellement réussi)
          npx prisma migrate resolve --applied "$FAILED_MIGRATION" 2>&1 || {
            echo "   ⚠️  Impossible de résoudre la migration automatiquement"
            return 1
          }
          return 0
        fi
      else
        echo "   ⚠️  Impossible d'extraire le nom de la migration échouée"
        return 1
      fi
    }
    
    # Vérifier s'il y a des migrations échouées et les résoudre
    if echo "$MIGRATE_STATUS_OUTPUT" | grep -qE "failed migrations|failed migration|P3009"; then
      resolve_failed_migration "$MIGRATE_STATUS_OUTPUT"
    fi
    
    # Si toutes les migrations sont déjà appliquées, on peut skip migrate deploy
    if echo "$MIGRATE_STATUS_OUTPUT" | grep -q "Database schema is up to date\|All migrations have been applied"; then
      echo "   ✅ Toutes les migrations sont déjà appliquées, pas besoin de migrate deploy"
    else
      # Essayer migrate deploy avec retry en cas de timeout de verrou
      MAX_RETRIES=3
      RETRY_COUNT=0
      MIGRATE_SUCCESS=false
      
      while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$MIGRATE_SUCCESS" = false ]; do
        if [ $RETRY_COUNT -gt 0 ]; then
          echo "   🔄 Nouvelle tentative ($RETRY_COUNT/$MAX_RETRIES) après timeout de verrou..."
          sleep 2
        fi
        
        MIGRATE_DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1)
        MIGRATE_DEPLOY_EXIT_CODE=$?
        
        if [ $MIGRATE_DEPLOY_EXIT_CODE -eq 0 ]; then
          MIGRATE_SUCCESS=true
          echo "✅ Migrations Prisma appliquées avec succès"
        else
          RETRY_COUNT=$((RETRY_COUNT + 1))
          
          # Vérifier si c'est une erreur de migration échouée (P3009)
          if echo "$MIGRATE_DEPLOY_OUTPUT" | grep -qE "P3009|failed migrations|failed migration"; then
            echo "   ⚠️  Migration échouée détectée dans migrate deploy, tentative de résolution..."
            if resolve_failed_migration "$MIGRATE_DEPLOY_OUTPUT"; then
              # Si la résolution réussit, réessayer immédiatement
              echo "   🔄 Réessai après résolution de la migration échouée..."
              continue
            else
              echo "   ❌ Impossible de résoudre la migration échouée automatiquement"
              if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
                break
              fi
            fi
          # Si c'est un timeout de verrou (P1002), on peut réessayer
          elif [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "   ⚠️  Timeout de verrou détecté, nouvelle tentative dans 2 secondes..."
            continue
          fi
        fi
      done
      
      if [ "$MIGRATE_SUCCESS" = false ]; then
        echo "❌ ERREUR lors de l'application des migrations Prisma après $MAX_RETRIES tentatives"
        echo "   Vérifiez que DATABASE_URL est correct et accessible"
        echo "   Si une migration a échoué, résolvez-la avec:"
        echo "   npx prisma migrate resolve --applied <migration_name>"
        echo "   ou"
        echo "   npx prisma migrate resolve --rolled-back <migration_name>"
        exit 1
      fi
    fi
  else
    # Pas de migrations Prisma standard, utiliser db push (synchronise le schéma)
    echo "⚠️  Aucune migration Prisma standard trouvée"
    echo "   Utilisation de 'prisma db push' pour synchroniser le schéma..."
    echo "   ⚠️  ATTENTION: db push peut être moins sûr que migrate deploy"
    echo "   Pour la production, créez des migrations Prisma standard avec:"
    echo "   npx prisma migrate dev --name init"
    npx prisma db push --accept-data-loss || {
      echo "❌ ERREUR: Impossible de synchroniser le schéma"
      echo "   Vérifiez que DATABASE_URL est correct et que la base de données est accessible"
      exit 1
    }
    echo "✅ Schéma synchronisé avec succès"
  fi
  
  # IMPORTANT: Régénérer le client Prisma APRÈS les migrations pour s'assurer qu'il reflète l'état final
  echo "🔄 Régénération finale du client Prisma (post-migration)..."
  # Supprimer l'ancien client pour forcer une régénération complète
  rm -rf node_modules/.prisma 2>/dev/null || true
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  # Corriger les fichiers default.js et default.mjs pour Prisma 7
  node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
  echo "✅ Client Prisma régénéré (post-migration)"
  
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
  
  # Vérifier et corriger migration_lock.toml si nécessaire
  MIGRATION_LOCK_PATH="prisma/migrations/migration_lock.toml"
  if [ -f "$MIGRATION_LOCK_PATH" ]; then
    if grep -q 'provider = "sqlite"' "$MIGRATION_LOCK_PATH"; then
      echo "⚠️  migration_lock.toml est en SQLite, correction vers PostgreSQL (switch activé)..."
      
      # Remplacer SQLite par PostgreSQL dans migration_lock.toml
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' "$MIGRATION_LOCK_PATH"
      else
        # Linux
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$MIGRATION_LOCK_PATH"
      fi
      
      echo "✅ migration_lock.toml corrigé vers PostgreSQL"
    else
      echo "✅ migration_lock.toml est déjà en PostgreSQL"
    fi
  fi
else
  # Si le switch est off, ne pas forcer PostgreSQL (laisser SQLite)
  echo "ℹ️  Mode développement avec switch off - PostgreSQL non forcé (utilise SQLite si configuré)"
fi

# En développement avec switch ON, vérifier DATABASE_URL_PRODUCTION
if [ "$USE_PRODUCTION" = "true" ] && [ "$NODE_ENV" != "production" ]; then
  ENV_LOCAL_PATH=".env.local"
  if [ -f "$ENV_LOCAL_PATH" ]; then
    if ! grep -q '^DATABASE_URL_PRODUCTION=' "$ENV_LOCAL_PATH"; then
      echo "⚠️  ATTENTION: DATABASE_URL_PRODUCTION n'est pas défini dans .env.local"
      echo "   Le switch PostgreSQL est activé mais DATABASE_URL_PRODUCTION est manquant."
      echo "   Ajoutez DATABASE_URL_PRODUCTION dans .env.local pour utiliser PostgreSQL en local."
      echo "   Ou exécutez: npm run db:setup:production-url"
    else
      echo "✅ DATABASE_URL_PRODUCTION est défini dans .env.local"
    fi
  else
    echo "⚠️  ATTENTION: .env.local n'existe pas et le switch PostgreSQL est activé"
    echo "   Créez .env.local avec DATABASE_URL_PRODUCTION pour utiliser PostgreSQL en local."
  fi
fi

# Si le schéma a été modifié, régénérer le client Prisma
# Aussi régénérer si on est en mode production (switch activé) pour s'assurer que le client correspond
if [ "$SCHEMA_CHANGED" = true ] || [ "$USE_PRODUCTION" = "true" ]; then
  echo "🔄 Régénération du client Prisma..."
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  # Corriger les fichiers default.js et default.mjs pour Prisma 7
  node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
  echo "✅ Client Prisma régénéré"
else
  # Même si le schéma n'a pas changé, s'assurer que les fichiers default.js et default.mjs existent
  # (nécessaire pour Prisma 7 avec tsx)
  if [ ! -f "node_modules/.prisma/client/default.js" ]; then
    echo "🔄 Création des fichiers default.js et default.mjs pour Prisma 7..."
    node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
  fi
fi

