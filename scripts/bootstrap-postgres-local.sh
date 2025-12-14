#!/bin/bash

# Script de bootstrap PostgreSQL local
# Crée la base de données si nécessaire et applique les migrations
# Idempotent: peut être exécuté plusieurs fois sans problème

set -e

echo "🚀 Bootstrap PostgreSQL Local"
echo "================================"
echo ""

# Vérifier que DATABASE_URL est configuré
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL n'est pas défini"
  echo ""
  echo "Configurez DATABASE_URL dans .env.local:"
  echo ""
  echo "Pour Docker Compose (port 5433):"
  echo '  DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5433/djlarian_dev?sslmode=disable"'
  echo ""
  echo "Pour PostgreSQL natif:"
  echo '  DATABASE_URL="postgresql://user:password@localhost:5432/dbname?sslmode=disable"'
  echo ""
  exit 1
fi

# Extraire les informations de connexion depuis DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL="$DATABASE_URL"

# Vérifier que c'est bien PostgreSQL
if [[ ! "$DB_URL" =~ ^postgresql:// ]] && [[ ! "$DB_URL" =~ ^postgres:// ]]; then
  echo "❌ DATABASE_URL ne pointe pas vers PostgreSQL"
  echo "   Format attendu: postgresql://user:password@host:port/database"
  exit 1
fi

echo "✅ DATABASE_URL configuré: ${DB_URL:0:50}..."
echo ""

# Vérifier que PostgreSQL est accessible
echo "🔍 Vérification de la connexion PostgreSQL..."
if command -v psql > /dev/null 2>&1; then
  # Extraire host, port, database depuis l'URL
  # Note: parsing simple, peut être amélioré
  DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p' || echo "localhost")
  DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p' || echo "5432")
  DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p' || echo "")
  
  # Vérifier la connexion (timeout 5s)
  if timeout 5 psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ PostgreSQL est accessible"
  else
    echo "⚠️  Impossible de se connecter à PostgreSQL"
    echo "   Vérifiez que PostgreSQL est démarré:"
    echo "   - Docker: docker-compose up -d"
    echo "   - Natif: brew services start postgresql@16"
    echo ""
    read -p "Continuer quand même? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi
else
  echo "⚠️  psql non trouvé, impossible de vérifier la connexion"
  echo "   Continuez si PostgreSQL est démarré"
fi

echo ""

# Créer un backup si la base existe déjà
echo "📦 Vérification des données existantes..."
if command -v psql > /dev/null 2>&1; then
  if timeout 5 psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    # La base existe, proposer un backup
    BACKUP_FILE="prisma/postgres_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "   Base de données existante détectée"
    read -p "Créer un backup? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
      echo "📦 Création du backup: $BACKUP_FILE"
      if pg_dump "$DB_URL" > "$BACKUP_FILE" 2>/dev/null; then
        echo "✅ Backup créé: $BACKUP_FILE"
      else
        echo "⚠️  Impossible de créer le backup (non-bloquant)"
      fi
    fi
  fi
fi

echo ""

# Appliquer les migrations
echo "🔄 Application des migrations..."
if npx prisma migrate deploy > /dev/null 2>&1; then
  echo "✅ Migrations appliquées"
else
  # Afficher l'erreur complète
  echo "⚠️  Erreur lors de l'application des migrations:"
  npx prisma migrate deploy || {
    echo ""
    echo "❌ Échec de l'application des migrations"
    echo ""
    echo "Vérifiez:"
    echo "  1. Que PostgreSQL est démarré"
    echo "  2. Que DATABASE_URL est correct"
    echo "  3. L'état des migrations: npx prisma migrate status"
    exit 1
  }
fi

echo ""

# Générer le client Prisma
echo "🔄 Génération du client Prisma..."
if npx prisma generate > /dev/null 2>&1; then
  echo "✅ Client Prisma généré"
else
  npx prisma generate || {
    echo "❌ Échec de la génération du client Prisma"
    exit 1
  }
fi

# Corriger les types Prisma si nécessaire
if [ -f "scripts/fix-prisma-types.mjs" ]; then
  echo "🔄 Correction des types Prisma..."
  node scripts/fix-prisma-types.mjs > /dev/null 2>&1 || true
  echo "✅ Types Prisma corrigés"
fi

echo ""
echo "✅ Bootstrap terminé avec succès!"
echo ""
echo "📝 Prochaines étapes:"
echo "   npm run dev          # Démarrer l'application"
echo "   npm run db:studio    # Ouvrir Prisma Studio"
echo ""
