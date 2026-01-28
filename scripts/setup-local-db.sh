#!/bin/bash

# Script pour configurer une base de données SQLite locale
# Préserve les données existantes si elles existent

set -e

echo "🗄️  Configuration Base de Données Locale (SQLite)"
echo "=================================================="
echo ""

DB_FILE="prisma/dev.db"
BACKUP_FILE="prisma/dev.db.backup"

# Vérifier si une base SQLite existe déjà
if [ -f "$DB_FILE" ]; then
    echo "⚠️  Une base de données SQLite existe déjà : $DB_FILE"
    echo ""
    read -p "Voulez-vous créer une sauvegarde avant de continuer ? (o/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        echo "📦 Création d'une sauvegarde..."
        cp "$DB_FILE" "$BACKUP_FILE"
        echo "✅ Sauvegarde créée : $BACKUP_FILE"
        echo ""
    fi
fi

# Vérifier si Prisma est installé
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "📦 Installation des dépendances..."
    pnpm install
fi

# Sauvegarder le schema actuel
echo "💾 Sauvegarde du schema actuel..."
cp prisma/schema.prisma prisma/schema.prisma.postgresql.backup
echo "✅ Schema PostgreSQL sauvegardé : prisma/schema.prisma.postgresql.backup"
echo ""

# Modifier le schema pour SQLite
echo "📝 Modification du schema pour SQLite..."
# Copier le schema actuel et modifier seulement le provider
cp prisma/schema.prisma.postgresql.backup prisma/schema.prisma
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
else
    # Linux
    sed -i 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
fi
echo "✅ Schema modifié pour SQLite"
echo ""

# Mettre à jour .env.local
echo "📝 Configuration de DATABASE_URL dans .env.local..."

if [ -f ".env.local" ]; then
    # Sauvegarder l'ancienne DATABASE_URL si elle existe
    if grep -q "^DATABASE_URL=" .env.local; then
        # Extraire l'ancienne valeur
        OLD_DB_URL=$(grep "^DATABASE_URL=" .env.local | head -1)
        echo "# Ancienne DATABASE_URL (PostgreSQL/Neon) - Sauvegardée le $(date)" >> .env.local.backup
        echo "$OLD_DB_URL" >> .env.local.backup
        echo "" >> .env.local.backup
        
        # Remplacer par SQLite
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"file:./prisma/dev.db\"|" .env.local
        else
            # Linux
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"file:./prisma/dev.db\"|" .env.local
        fi
        echo "✅ DATABASE_URL mise à jour dans .env.local"
    else
        # Ajouter DATABASE_URL
        echo "" >> .env.local
        echo "# Base de données locale (SQLite) pour le développement" >> .env.local
        echo "DATABASE_URL=\"file:./prisma/dev.db\"" >> .env.local
        echo "✅ DATABASE_URL ajoutée dans .env.local"
    fi
else
    # Créer .env.local
    echo "# Base de données locale (SQLite) pour le développement" > .env.local
    echo "DATABASE_URL=\"file:./prisma/dev.db\"" >> .env.local
    echo "✅ Fichier .env.local créé avec DATABASE_URL SQLite"
fi

echo ""

# Vérifier si la base existe déjà
if [ -f "$DB_FILE" ]; then
    echo "📊 Base de données existante détectée"
    echo "   Taille : $(du -h "$DB_FILE" | cut -f1)"
    echo ""
    read -p "Voulez-vous réinitialiser la base (perte des données) ou conserver les données existantes ? (r/C) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Rr]$ ]]; then
        echo "🗑️  Suppression de l'ancienne base..."
        rm "$DB_FILE"
        RESET_DB=true
    else
        echo "✅ Conservation des données existantes"
        RESET_DB=false
    fi
    echo ""
fi

# Gérer les migrations (sauvegarder les migrations PostgreSQL si elles existent)
if [ -d "prisma/migrations" ] && [ ! -d "prisma/migrations.postgresql" ]; then
    # Vérifier si ce sont des migrations PostgreSQL
    if grep -q "provider = \"postgresql\"" prisma/migrations/migration_lock.toml 2>/dev/null; then
        echo "💾 Sauvegarde des migrations PostgreSQL..."
        mv prisma/migrations prisma/migrations.postgresql
        echo "✅ Migrations PostgreSQL sauvegardées dans prisma/migrations.postgresql"
    fi
fi

# Créer un nouveau dossier migrations si nécessaire
if [ ! -d "prisma/migrations" ]; then
    mkdir -p prisma/migrations
fi

# Appliquer les migrations
if [ "$RESET_DB" = true ] || [ ! -f "$DB_FILE" ]; then
    echo "🔄 Application des migrations Prisma (nouvelle base)..."
    DATABASE_URL="file:./prisma/dev.db" pnpm prisma migrate dev --name init_sqlite || {
        echo "⚠️  Erreur lors de la migration. Tentative de réparation..."
        rm -f "$DB_FILE"
        DATABASE_URL="file:./prisma/dev.db" pnpm prisma migrate dev --name init_sqlite
    }
else
    echo "🔄 Vérification des migrations (base existante)..."
    DATABASE_URL="file:./prisma/dev.db" pnpm prisma migrate deploy || {
        echo "⚠️  Les migrations ne correspondent pas. Voulez-vous réinitialiser ?"
        echo "   Utilisez: pnpm run db:reset:local"
    }
fi

echo ""
echo "🔧 Génération du client Prisma..."
pnpm prisma generate

echo ""
echo "✅ Configuration SQLite terminée !"
echo ""
echo "📝 Fichiers créés/modifiés :"
echo "   - prisma/dev.db (base de données SQLite)"
echo "   - prisma/schema.prisma (modifié pour SQLite)"
echo "   - prisma/schema.prisma.postgresql.backup (sauvegarde du schema PostgreSQL)"
echo "   - .env.local (DATABASE_URL = file:./dev.db)"
echo ""
echo "🧪 Pour tester :"
echo "   pnpm prisma studio"
echo ""
echo "🔄 Pour revenir à PostgreSQL/Neon :"
echo "   pnpm run db:production"
echo ""

