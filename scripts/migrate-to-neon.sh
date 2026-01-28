#!/bin/bash

# Script pour migrer la base de données vers Neon
# Usage: ./scripts/migrate-to-neon.sh

set -e

echo "🗄️  Migration vers Neon"
echo "======================"
echo ""

# Vérifier que DATABASE_URL est définie
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL n'est pas définie"
    echo ""
    echo "Définissez-la avec:"
    echo "  export DATABASE_URL='postgresql://user:password@host/database?sslmode=require'"
    echo ""
    echo "Ou créez un fichier .env.local avec:"
    echo "  DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "✅ DATABASE_URL trouvée"
echo ""

# Vérifier que Prisma est installé
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "📦 Installation des dépendances..."
    pnpm install
fi

echo "📋 Étapes de migration:"
echo "1. Appliquer les migrations Prisma"
echo "2. Générer le client Prisma"
echo ""

# Appliquer les migrations
echo "🔄 Application des migrations..."
pnpm prisma migrate deploy

echo ""
echo "🔧 Génération du client Prisma..."
pnpm prisma generate

echo ""
echo "✅ Migration terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Vérifier dans Neon Dashboard que les tables sont créées"
echo "2. (Optionnel) Importer vos données depuis backup.sql"
echo "   - Aller dans Neon Dashboard → SQL Editor"
echo "   - Copier-coller le contenu de backup.sql"
echo "   - Exécuter"
echo ""

