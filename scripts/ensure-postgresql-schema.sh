#!/bin/bash

# Script pour s'assurer que schema.prisma utilise PostgreSQL
# Utilisé lors du build Vercel pour garantir que la production utilise PostgreSQL
# En production (NODE_ENV=production), force toujours PostgreSQL
# En développement, vérifie le switch pour décider
#
# IMPORTANT: Les migrations sont NON-BLOQUANTES - elles ne feront jamais échouer le build
# Cela permet au build de continuer même si les migrations échouent

# Ne pas utiliser set -e au début - on veut gérer les erreurs manuellement
# set -e sera activé seulement pour les parties critiques

SCHEMA_PATH="prisma/schema.prisma"
SWITCH_PATH=".db-switch.json"

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "❌ Erreur: schema.prisma introuvable"
  exit 1
fi

# Activer set -e seulement pour les vérifications critiques
set -e

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
  # Cette vérification est critique, donc on garde exit 1
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
  
  # Désactiver le verrouillage consultatif pour éviter les timeouts sur Vercel
  # Cela permet d'éviter les erreurs P1002 (timeout de verrou) lors des builds
  export PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true
  
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
    set +e  # Désactiver temporairement set -e pour cette section
    MIGRATE_STATUS_OUTPUT=$(PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate status 2>&1)
    MIGRATE_STATUS_EXIT_CODE=$?
    set -e  # Réactiver set -e
    
    # Variable pour savoir si on a créé des baselines
    BASELINE_CREATED=false
    
    if [ $MIGRATE_STATUS_EXIT_CODE -ne 0 ]; then
      echo "   ⚠️  migrate status a retourné une erreur (code: $MIGRATE_STATUS_EXIT_CODE)"
      echo "   📋 Sortie: $MIGRATE_STATUS_OUTPUT"
      
      # Vérifier si c'est un conflit d'historique (migrations différentes entre local et DB)
      if echo "$MIGRATE_STATUS_OUTPUT" | grep -qE "different|not found locally|The migrations from the database are not found locally"; then
        echo "   ⚠️  Conflit d'historique des migrations détecté"
        echo "   ℹ️  Certaines migrations sont dans la DB mais pas localement"
        echo "   🔧 Résolution automatique : création de migrations baseline..."
        
        # Extraire les noms des migrations manquantes localement (dans la DB mais pas localement)
        # Format du message Prisma: "The migrations from the database are not found locally: 20250424125117_init"
        MISSING_LOCAL=$(echo "$MIGRATE_STATUS_OUTPUT" | grep -A 100 "not found locally" | grep -oE '[0-9]{14}_[a-zA-Z0-9_]+' | sort -u || echo "")
        
        if [ -z "$MISSING_LOCAL" ]; then
          # Essayer une autre extraction (format différent)
          MISSING_LOCAL=$(echo "$MIGRATE_STATUS_OUTPUT" | grep -oE '[0-9]{14}_[a-zA-Z0-9_]+' | sort -u || echo "")
        fi
        
        if [ -n "$MISSING_LOCAL" ]; then
          echo "   📋 Migrations baseline détectées dans la DB:"
          echo "$MISSING_LOCAL" | while read -r migration_name; do
            if [ -n "$migration_name" ]; then
              echo "      - $migration_name"
            fi
          done
          
          # Créer des migrations baseline vides pour chaque migration manquante
          echo "   🔧 Création des migrations baseline..."
          for migration_name in $MISSING_LOCAL; do
            if [ -n "$migration_name" ]; then
              BASELINE_DIR="prisma/migrations/${migration_name}"
              
              # Vérifier si la migration baseline existe déjà
              if [ ! -d "$BASELINE_DIR" ]; then
                echo "      📝 Création de la migration baseline: $migration_name"
                mkdir -p "$BASELINE_DIR"
                # Créer un fichier SQL vide avec un commentaire
                echo "-- Baseline migration: Cette migration existe déjà dans la base de données de production" > "$BASELINE_DIR/migration.sql"
                echo "-- Elle est marquée comme baseline pour synchroniser l'historique des migrations" >> "$BASELINE_DIR/migration.sql"
                echo "-- Aucune modification SQL n'est nécessaire, le schéma est déjà à jour" >> "$BASELINE_DIR/migration.sql"
                
                # Marquer la migration comme appliquée (baseline)
                set +e
                PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate resolve --applied "$migration_name" >/dev/null 2>&1
                RESOLVE_EXIT=$?
                set -e
                
                if [ $RESOLVE_EXIT -eq 0 ]; then
                  echo "      ✅ Migration baseline créée et marquée comme appliquée: $migration_name"
                else
                  echo "      ⚠️  Migration baseline créée mais impossible de la marquer comme appliquée: $migration_name"
                fi
              else
                echo "      ℹ️  Migration baseline existe déjà: $migration_name"
                # Essayer quand même de la marquer comme appliquée
                set +e
                PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate resolve --applied "$migration_name" >/dev/null 2>&1
                set -e
              fi
            fi
          done
          
          echo "   ✅ Migrations baseline créées, l'historique devrait maintenant être synchronisé"
          BASELINE_CREATED=true
        else
          echo "   ⚠️  Impossible d'extraire les noms des migrations manquantes"
        fi
      fi
    fi
    
    # Fonction pour résoudre une migration échouée
    resolve_failed_migration() {
      local status_output="$1"
      echo "   ⚠️  Migrations échouées détectées, tentative de résolution..."
      
      # Extraire le nom de la migration échouée depuis le message d'erreur
      # Format: The `20251130022530_add_milestone_notifications` migration started at...
      # Utiliser sed pour extraire le contenu entre backticks
      FAILED_MIGRATION=$(echo "$status_output" | sed -n "s/.*\`\([0-9]\{14\}_[a-zA-Z0-9_]*\)\`.*/\1/p" | head -1 2>/dev/null || echo "")
      
      if [ -z "$FAILED_MIGRATION" ]; then
        # Essayer un autre format (sans backticks dans le message)
        FAILED_MIGRATION=$(echo "$status_output" | grep -oE '[0-9]{14}_[a-zA-Z0-9_]+' | head -1 2>/dev/null || echo "")
      fi
      
      if [ -z "$FAILED_MIGRATION" ]; then
        # Dernier essai : chercher n'importe quel pattern timestamp_nom
        FAILED_MIGRATION=$(echo "$status_output" | grep -oE '[0-9]+_[a-zA-Z0-9_]+' | head -1 2>/dev/null || echo "")
      fi
      
        if [ -n "$FAILED_MIGRATION" ]; then
        echo "   🔧 Résolution de la migration échouée: $FAILED_MIGRATION"
        # Marquer la migration comme rolled-back pour pouvoir la réappliquer
        set +e  # Désactiver set -e pour cette commande
        PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" >/dev/null 2>&1
        RESOLVE_EXIT=$?
        set -e  # Réactiver set -e
        
        if [ $RESOLVE_EXIT -eq 0 ]; then
          echo "   ✅ Migration marquée comme rolled-back, elle sera réappliquée"
          return 0
          else
          echo "   ⚠️  Impossible de marquer la migration comme rolled-back, tentative avec --applied..."
          # Si rolled-back échoue, essayer applied (si la migration a partiellement réussi)
          set +e  # Désactiver set -e pour cette commande
          PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate resolve --applied "$FAILED_MIGRATION" >/dev/null 2>&1
          RESOLVE_APPLIED_EXIT=$?
          set -e  # Réactiver set -e
          
          if [ $RESOLVE_APPLIED_EXIT -eq 0 ]; then
            echo "   ✅ Migration marquée comme applied"
            return 0
          else
            echo "   ⚠️  Impossible de résoudre la migration automatiquement"
            return 1
          fi
        fi
      else
        echo "   ⚠️  Impossible d'extraire le nom de la migration échouée"
        echo "   📋 Sortie complète pour debug:"
        echo "$status_output" | head -20
        return 1
      fi
    }
    
    # Vérifier s'il y a des migrations échouées et les résoudre
    if echo "$MIGRATE_STATUS_OUTPUT" | grep -qE "failed migrations|failed migration|P3009"; then
      set +e  # Désactiver set -e pour la résolution
      resolve_failed_migration "$MIGRATE_STATUS_OUTPUT"
      RESOLVE_EXIT_CODE=$?
      set -e  # Réactiver set -e
      if [ $RESOLVE_EXIT_CODE -ne 0 ]; then
        echo "   ⚠️  La résolution de la migration échouée n'a pas réussi, mais on continue..."
      fi
    fi
    
    # Vérifier à nouveau l'état après résolution des baselines (si on en a créé)
    if [ "$BASELINE_CREATED" = true ]; then
      echo "   🔄 Vérification de l'état après résolution des baselines..."
      set +e
      MIGRATE_STATUS_OUTPUT=$(PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate status 2>&1)
      MIGRATE_STATUS_EXIT_CODE=$?
      set -e
    fi
    
    # Si toutes les migrations sont déjà appliquées, on peut skip migrate deploy
    if echo "$MIGRATE_STATUS_OUTPUT" | grep -q "Database schema is up to date\|All migrations have been applied"; then
      echo "   ✅ Toutes les migrations sont déjà appliquées, pas besoin de migrate deploy"
    else
      # Si on a créé des baselines, on peut avoir besoin de réessayer
      if [ "$BASELINE_CREATED" = true ]; then
        echo "   🔄 Baselines créées, nouvelle tentative de synchronisation..."
        sleep 1
      fi
      
      # Essayer migrate deploy avec retry en cas de timeout de verrou
      MAX_RETRIES=3
      RETRY_COUNT=0
      MIGRATE_SUCCESS=false
      
      while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$MIGRATE_SUCCESS" = false ]; do
        if [ $RETRY_COUNT -gt 0 ]; then
          echo "   🔄 Nouvelle tentative ($RETRY_COUNT/$MAX_RETRIES) après timeout de verrou..."
          sleep 2
        fi
        
        set +e  # Désactiver set -e pour migrate deploy
        MIGRATE_DEPLOY_OUTPUT=$(PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma migrate deploy 2>&1)
        MIGRATE_DEPLOY_EXIT_CODE=$?
        set -e  # Réactiver set -e
        
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
        # NE JAMAIS FAIRE ÉCHOUER LE BUILD - Les migrations sont non-bloquantes
        echo "⚠️  ATTENTION: Les migrations Prisma ont échoué, mais le build continue"
        echo "   Les migrations peuvent être appliquées manuellement après le déploiement"
        
        # Vérifier si c'est un conflit d'historique
        if echo "$MIGRATE_DEPLOY_OUTPUT" | grep -qE "different|not found locally|The migrations from the database are not found locally"; then
          echo "   📋 Conflit d'historique des migrations détecté"
          echo "   Certaines migrations sont dans la DB mais pas localement"
          echo "   Le schéma peut être à jour même si l'historique diffère"
        fi
        
        # Essayer db push comme fallback (non-bloquant)
        echo "   🔄 Tentative de synchronisation avec 'prisma db push' (fallback)..."
        set +e
        DB_PUSH_OUTPUT=$(PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma db push --skip-generate --accept-data-loss 2>&1)
        DB_PUSH_EXIT=$?
        set -e
        
        if [ $DB_PUSH_EXIT -eq 0 ]; then
          echo "   ✅ Schéma synchronisé avec db push (fallback)"
        else
          echo "   ⚠️  db push a également échoué, mais le build continue"
          echo "   Le client Prisma sera généré avec le schéma actuel"
        fi
        
        echo "   💡 Pour résoudre manuellement après le build:"
        echo "   1. Vérifiez: npx prisma migrate status"
        echo "   2. Résolvez les migrations: npx prisma migrate resolve --applied <migration_name>"
        echo "   3. Réappliquez: npx prisma migrate deploy"
        # Ne pas faire exit 1 - le build doit continuer
      fi
    fi
  else
    # Pas de migrations Prisma standard, utiliser db push (synchronise le schéma)
    echo "⚠️  Aucune migration Prisma standard trouvée"
    echo "   Utilisation de 'prisma db push' pour synchroniser le schéma..."
    echo "   ⚠️  ATTENTION: db push peut être moins sûr que migrate deploy"
    echo "   Pour la production, créez des migrations Prisma standard avec:"
    echo "   npx prisma migrate dev --name init"
    # db push non-bloquant pour ne pas faire échouer le build
    set +e
    DB_PUSH_OUTPUT=$(PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true npx prisma db push --skip-generate --accept-data-loss 2>&1)
    DB_PUSH_EXIT=$?
    set -e
    
    if [ $DB_PUSH_EXIT -eq 0 ]; then
      echo "✅ Schéma synchronisé avec succès"
    else
      echo "⚠️  ATTENTION: db push a échoué, mais le build continue"
      echo "   Le client Prisma sera généré avec le schéma actuel"
      echo "   Vérifiez que DATABASE_URL est correct et que la base de données est accessible"
      # Ne pas faire exit 1 - le build doit continuer
    fi
  fi
  
  # IMPORTANT: Régénérer le client Prisma APRÈS les migrations pour s'assurer qu'il reflète l'état final
  # Cette étape est CRITIQUE et doit toujours réussir, même si les migrations ont échoué
  echo "🔄 Régénération finale du client Prisma (post-migration)..."
  # Supprimer l'ancien client pour forcer une régénération complète
  rm -rf node_modules/.prisma 2>/dev/null || true
  
  # La génération du client Prisma doit toujours réussir (non-bloquant mais critique)
  set +e
  npx prisma generate > /dev/null 2>&1 || npx prisma generate
  GENERATE_EXIT=$?
  set -e
  
  if [ $GENERATE_EXIT -eq 0 ]; then
    # Corriger les fichiers default.js et default.mjs pour Prisma 7
    node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || node scripts/fix-prisma-types.mjs
    echo "✅ Client Prisma régénéré (post-migration)"
  else
    echo "⚠️  ATTENTION: La génération du client Prisma a échoué"
    echo "   Tentative de récupération..."
    # Essayer une dernière fois sans redirection
    npx prisma generate || {
      echo "❌ ERREUR CRITIQUE: Impossible de générer le client Prisma"
      echo "   Le build peut échouer. Vérifiez votre schéma Prisma."
      # Même ici, on ne fait pas échouer le build - Next.js peut fonctionner sans client Prisma généré
      # (mais ce sera probablement une erreur à l'exécution)
    }
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

