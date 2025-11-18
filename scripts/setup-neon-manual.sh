#!/bin/bash

# Script pour configurer Neon manuellement avec la connection string
# Usage: ./scripts/setup-neon-manual.sh "postgresql://..."

set -e

if [ -z "$1" ]; then
    echo "❌ Erreur: Connection string manquante"
    echo ""
    echo "Usage: ./scripts/setup-neon-manual.sh \"postgresql://user:password@host/database?sslmode=require\""
    echo ""
    exit 1
fi

DATABASE_URL="$1"

echo "🗄️  Configuration Neon"
echo "======================"
echo ""

# Vérifier que Prisma est installé
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Créer ou mettre à jour .env.local
echo "📝 Configuration de DATABASE_URL..."

# Vérifier si .env.local existe
if [ -f ".env.local" ]; then
    # Mettre à jour DATABASE_URL si elle existe
    if grep -q "^DATABASE_URL=" .env.local; then
        # Remplacer la ligne existante
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local
        else
            # Linux
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local
        fi
        echo "✅ DATABASE_URL mise à jour dans .env.local"
    else
        # Ajouter DATABASE_URL
        echo "DATABASE_URL=\"$DATABASE_URL\"" >> .env.local
        echo "✅ DATABASE_URL ajoutée dans .env.local"
    fi
else
    # Créer .env.local
    echo "DATABASE_URL=\"$DATABASE_URL\"" > .env.local
    echo "✅ Fichier .env.local créé avec DATABASE_URL"
fi

echo ""
echo "🔄 Application des migrations Prisma..."
npx prisma migrate deploy

echo ""
echo "🔧 Génération du client Prisma..."
npx prisma generate

echo ""
echo "✅ Configuration Neon terminée !"
echo ""
echo "📝 Vérification:"
echo "   DATABASE_URL configurée dans .env.local"
echo "   Migrations appliquées"
echo "   Client Prisma généré"
echo ""

