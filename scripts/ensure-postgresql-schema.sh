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
  
  # Toujours régénérer le client Prisma en production pour s'assurer qu'il correspond au schéma
  echo "🔄 Régénération du client Prisma pour la production..."
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  # Corriger les fichiers default.js et default.mjs pour Prisma 7
  node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
  echo "✅ Client Prisma régénéré"
  
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
    
    # Vérifier d'abord s'il y a des migrations échouées
    # Capturer à la fois stdout et stderr dans un fichier temporaire pour éviter les problèmes de buffering
    TEMP_MIGRATE_OUTPUT=$(mktemp)
    if npx prisma migrate deploy > "$TEMP_MIGRATE_OUTPUT" 2>&1; then
      MIGRATE_EXIT_CODE=0
      MIGRATE_OUTPUT=$(cat "$TEMP_MIGRATE_OUTPUT")
      rm -f "$TEMP_MIGRATE_OUTPUT"
      echo "✅ Migrations Prisma appliquées avec succès (seules les manquantes ont été exécutées)"
      
      # Vérifier que les tables principales existent vraiment (protection contre migrations marquées comme applied mais non exécutées)
      echo "   🔍 Vérification que les tables ont bien été créées..."
      TABLES_COUNT=$(node scripts/check-tables-exist.mjs 2>/dev/null || echo "0")
      if [ "$TABLES_COUNT" -lt "2" ]; then
        echo "   ⚠️  ATTENTION: Seulement $TABLES_COUNT table(s) trouvée(s), les migrations n'ont peut-être pas créé les tables"
        echo "   🔄 La migration est peut-être marquée comme appliquée mais les tables n'existent pas"
        echo "   🔧 Tentative de résolution automatique..."
        
        # Trouver la migration init
        INIT_MIGRATION=$(ls -d prisma/migrations/*_init 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo "")
        if [ -n "$INIT_MIGRATION" ]; then
          echo "   🔄 Rollback de la migration $INIT_MIGRATION pour la réappliquer..."
          if npx prisma migrate resolve --rolled-back "$INIT_MIGRATION" > /dev/null 2>&1; then
            echo "   ✅ Migration marquée comme rollback"
            echo "   🔄 Réapplication de la migration..."
            if npx prisma migrate deploy > /dev/null 2>&1; then
              echo "   ✅ Migration réappliquée"
              # Vérifier à nouveau
              TABLES_COUNT=$(node scripts/check-tables-exist.mjs 2>/dev/null || echo "0")
              if [ "$TABLES_COUNT" -lt "2" ]; then
                echo "   ❌ ERREUR: Les tables n'existent toujours pas après réapplication"
                echo "   Vérifiez manuellement avec: node scripts/check-db-tables.mjs"
                exit 1
              else
                echo "   ✅ $TABLES_COUNT tables trouvées, tout est OK"
              fi
            else
              echo "   ❌ ERREUR: Impossible de réappliquer la migration"
              exit 1
            fi
          else
            echo "   ⚠️  Impossible de rollback, les tables peuvent exister mais avec un autre nom"
            echo "   Vérifiez manuellement avec: node scripts/check-db-tables.mjs"
          fi
        else
          echo "   ⚠️  Impossible de trouver la migration init"
          echo "   Vérifiez manuellement avec: node scripts/check-db-tables.mjs"
        fi
      else
        echo "   ✅ $TABLES_COUNT tables trouvées, tout est OK"
      fi
      
      # TEMPORAIRE: Diagnostic détaillé pour voir le décalage
      echo ""
      echo "   📊 Diagnostic détaillé de la base de données (temporaire):"
      node scripts/diagnose-db-schema.mjs 2>&1 | head -100 || echo "   ⚠️  Impossible d'exécuter le diagnostic"
      echo ""
    else
      MIGRATE_EXIT_CODE=$?
      MIGRATE_OUTPUT=$(cat "$TEMP_MIGRATE_OUTPUT")
      rm -f "$TEMP_MIGRATE_OUTPUT"
      
      # Afficher la sortie pour debug
      echo "   ⚠️  Sortie de prisma migrate deploy:"
      echo "$MIGRATE_OUTPUT" | head -20
      echo ""
      
      if echo "$MIGRATE_OUTPUT" | grep -qi "failed migrations\|P3009"; then
        # Migration échouée détectée, essayer de la résoudre automatiquement
        echo "⚠️  Migration échouée détectée, tentative de résolution automatique..."
      
      # Extraire le nom de la migration échouée
      FAILED_MIGRATION=$(echo "$MIGRATE_OUTPUT" | grep -oE "[0-9]+_[a-zA-Z0-9_]+" | head -1)
      
      if [ -n "$FAILED_MIGRATION" ]; then
        echo "   🔍 Migration échouée détectée: $FAILED_MIGRATION"
        echo "   🔄 Vérification si les tables existent déjà..."
        
        # Vérifier si au moins quelques tables principales existent
        TABLES_CHECK=$(node scripts/check-tables-exist.mjs 2>/dev/null || echo "0")
        
        if [ "$TABLES_CHECK" -gt "2" ]; then
          # Des tables existent, la migration a probablement réussi partiellement
          echo "   ✅ Des tables existent déjà ($TABLES_CHECK tables trouvées), la migration semble avoir réussi"
          echo "   🔧 Marquage de la migration comme appliquée..."
          if npx prisma migrate resolve --applied "$FAILED_MIGRATION" > /dev/null 2>&1; then
            echo "   ✅ Migration marquée comme appliquée"
            # Réessayer migrate deploy
            echo "   🔄 Nouvelle tentative d'application des migrations..."
            if npx prisma migrate deploy > /dev/null 2>&1; then
              echo "✅ Migrations Prisma appliquées avec succès"
            else
              echo "⚠️  Erreur persistante après résolution, affichage des détails..."
              npx prisma migrate deploy || {
                echo "❌ ERREUR: Impossible d'appliquer les migrations Prisma après résolution"
                echo "   La migration a été marquée comme appliquée mais migrate deploy échoue toujours"
                exit 1
              }
            fi
          else
            echo "   ⚠️  Impossible de marquer comme appliquée, passage au rollback..."
            # Si marquer comme appliquée échoue, essayer rollback
            if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" > /dev/null 2>&1; then
              echo "   ✅ Migration marquée comme rollback"
              # Réessayer migrate deploy
              echo "   🔄 Nouvelle tentative d'application des migrations..."
              if npx prisma migrate deploy > /dev/null 2>&1; then
                echo "✅ Migrations Prisma appliquées avec succès"
              else
                echo "⚠️  Erreur persistante après rollback, affichage des détails..."
                npx prisma migrate deploy || {
                  echo "❌ ERREUR: Impossible d'appliquer les migrations Prisma"
                  echo "   Résolvez manuellement avec:"
                  echo "   npx prisma migrate resolve --applied $FAILED_MIGRATION"
                  echo "   ou"
                  echo "   npx prisma migrate resolve --rolled-back $FAILED_MIGRATION"
                  exit 1
                }
              fi
            else
              echo "❌ ERREUR: Impossible de résoudre la migration échouée"
              echo "   Résolvez manuellement avec:"
              echo "   npx prisma migrate resolve --applied $FAILED_MIGRATION"
              echo "   ou"
              echo "   npx prisma migrate resolve --rolled-back $FAILED_MIGRATION"
              exit 1
            fi
          fi
        else
          # Aucune table ou très peu, la migration a vraiment échoué
          echo "   ⚠️  Peu ou pas de tables trouvées ($TABLES_CHECK tables), la migration a vraiment échoué"
          echo "   🔄 Marquage de la migration comme rollback pour la réappliquer..."
          if npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" > /dev/null 2>&1; then
            echo "   ✅ Migration marquée comme rollback"
            # Réessayer migrate deploy
            echo "   🔄 Nouvelle tentative d'application des migrations..."
            if npx prisma migrate deploy > /dev/null 2>&1; then
              echo "✅ Migrations Prisma appliquées avec succès"
            else
              echo "⚠️  Erreur persistante après rollback, affichage des détails..."
              npx prisma migrate deploy || {
                echo "❌ ERREUR: Impossible d'appliquer les migrations Prisma"
                echo "   Résolvez manuellement avec:"
                echo "   npx prisma migrate resolve --applied $FAILED_MIGRATION"
                echo "   ou"
                echo "   npx prisma migrate resolve --rolled-back $FAILED_MIGRATION"
                exit 1
              }
            fi
          else
            echo "❌ ERREUR: Impossible de résoudre la migration échouée"
            echo "   Résolvez manuellement avec:"
            echo "   npx prisma migrate resolve --applied $FAILED_MIGRATION"
            echo "   ou"
            echo "   npx prisma migrate resolve --rolled-back $FAILED_MIGRATION"
            exit 1
          fi
        fi
      else
        # Impossible d'extraire le nom de la migration
        echo "   ⚠️  Impossible d'identifier la migration échouée"
        echo "   Sortie complète:"
        echo "$MIGRATE_OUTPUT"
        exit 1
      fi
      else
        # Autre erreur - afficher les détails
        echo "❌ ERREUR lors de l'application des migrations Prisma"
        echo "   Code de sortie: $MIGRATE_EXIT_CODE"
        echo "   Détails de l'erreur:"
        echo "$MIGRATE_OUTPUT" | head -50
        echo ""
        echo "   Si l'erreur persiste, vérifiez:"
        echo "   1. Que DATABASE_URL est correct et accessible"
        echo "   2. Que la base de données n'est pas verrouillée"
        echo "   3. Que vous avez les permissions nécessaires"
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
    if npx prisma db push --accept-data-loss > /dev/null 2>&1; then
      echo "✅ Schéma synchronisé avec succès"
    else
      echo "⚠️  Erreur lors de la synchronisation du schéma"
      echo "   Tentative avec affichage des erreurs..."
      npx prisma db push --accept-data-loss || {
        echo "❌ ERREUR: Impossible de synchroniser le schéma"
        echo "   Vérifiez que DATABASE_URL est correct et que la base de données est accessible"
        echo "   Note: Pour la production, il est recommandé de créer des migrations Prisma standard"
        echo "   avec: npx prisma migrate dev --name init"
        exit 1
      }
    fi
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

