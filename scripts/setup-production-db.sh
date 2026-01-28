#!/bin/bash

# Script pour revenir à PostgreSQL/Neon pour la production

set -e

echo "🔄 Configuration Base de Données Production (PostgreSQL/Neon)"
echo "=============================================================="
echo ""

# Vérifier si Prisma est installé
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "📦 Installation des dépendances..."
    pnpm install
fi

# Restaurer le schema PostgreSQL
if [ -f "prisma/schema.prisma.postgresql.backup" ]; then
    echo "📝 Restauration du schema PostgreSQL..."
    cp prisma/schema.prisma.postgresql.backup prisma/schema.prisma
    echo "✅ Schema PostgreSQL restauré"
else
    echo "📝 Modification du schema pour PostgreSQL..."
    # Modifier seulement la partie datasource
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
        sed -i '' 's|url      = env("DATABASE_URL")|url      = env("DATABASE_URL")|' prisma/schema.prisma
    else
        # Linux
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    fi
    echo "✅ Schema modifié pour PostgreSQL"
fi

# Restaurer les migrations PostgreSQL si elles existent
if [ -d "prisma/migrations.postgresql" ] && [ -d "prisma/migrations" ]; then
    # Vérifier si ce sont des migrations SQLite
    if grep -q "provider = \"sqlite\"" prisma/migrations/migration_lock.toml 2>/dev/null; then
        echo "💾 Sauvegarde des migrations SQLite..."
        mv prisma/migrations prisma/migrations.sqlite
        echo "✅ Migrations SQLite sauvegardées dans prisma/migrations.sqlite"
    fi
fi

if [ -d "prisma/migrations.postgresql" ]; then
    echo "📝 Restauration des migrations PostgreSQL..."
    if [ -d "prisma/migrations" ]; then
        rm -rf prisma/migrations
    fi
    mv prisma/migrations.postgresql prisma/migrations
    echo "✅ Migrations PostgreSQL restaurées"
fi

echo ""

# Mettre à jour .env.local
echo "📝 Configuration de DATABASE_URL dans .env.local..."

if [ -f ".env.local.backup" ]; then
    echo "💾 Restauration de l'ancienne DATABASE_URL depuis .env.local.backup..."
    OLD_DB_URL=$(grep "^DATABASE_URL=" .env.local.backup | tail -1 | sed 's/^#.*//')
    if [ ! -z "$OLD_DB_URL" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^DATABASE_URL=.*|$OLD_DB_URL|" .env.local
        else
            sed -i "s|^DATABASE_URL=.*|$OLD_DB_URL|" .env.local
        fi
        echo "✅ DATABASE_URL restaurée"
    else
        echo "⚠️  Aucune ancienne DATABASE_URL trouvée dans .env.local.backup"
        echo "   Veuillez mettre à jour manuellement DATABASE_URL dans .env.local"
    fi
else
    echo "⚠️  .env.local.backup introuvable"
    echo "   Veuillez mettre à jour manuellement DATABASE_URL dans .env.local"
    echo "   Format: DATABASE_URL=\"postgresql://user:password@host/database?sslmode=require\""
fi

echo ""
echo "🔧 Génération du client Prisma..."
pnpm prisma generate

echo ""
echo "✅ Configuration PostgreSQL/Neon terminée !"
echo ""
echo "📝 Vérifiez que DATABASE_URL dans .env.local pointe vers votre base Neon"
echo ""

