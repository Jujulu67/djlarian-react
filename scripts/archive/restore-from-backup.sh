#!/bin/bash

# Script pour restaurer les données depuis backup.sql vers SQLite
# Nécessite de convertir le dump PostgreSQL en SQLite

set -e

echo "🔄 Restauration depuis backup.sql"
echo "=================================="
echo ""

if [ ! -f "backup.sql" ]; then
    echo "❌ Erreur: backup.sql introuvable"
    exit 1
fi

echo "⚠️  ATTENTION: La conversion PostgreSQL → SQLite est complexe"
echo "   Certaines données peuvent ne pas être compatibles"
echo ""
read -p "Voulez-vous continuer ? (o/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
    echo "❌ Annulé"
    exit 0
fi

# Vérifier que la base SQLite existe
if [ ! -f "prisma/dev.db" ]; then
    echo "📦 Création de la base SQLite..."
    npm run db:setup:local
fi

echo "💡 Pour restaurer les données, vous pouvez :"
echo "   1. Utiliser Prisma Studio pour copier manuellement les données"
echo "   2. Ou utiliser un outil de conversion PostgreSQL → SQLite"
echo ""
echo "   Option recommandée :"
echo "   npx prisma studio"
echo "   (Ouvrir les deux bases et copier les données)"
echo ""

