#!/bin/bash

# Script pour créer des migrations Prisma standard pour PostgreSQL
# Ce script crée une migration baseline qui capture l'état actuel du schéma

set -e

echo "🔄 Création des migrations Prisma pour PostgreSQL..."
echo ""

# Vérifier que le schéma est en PostgreSQL
if grep -q 'provider = "sqlite"' prisma/schema.prisma; then
    echo "⚠️  Le schéma est en SQLite, passage à PostgreSQL..."
    
    # Sauvegarder le schéma actuel
    if [ ! -f "prisma/schema.prisma.postgresql.backup" ]; then
        cp prisma/schema.prisma prisma/schema.prisma.postgresql.backup
    fi
    
    # Modifier le schéma pour PostgreSQL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    else
        sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    fi
    echo "✅ Schéma modifié pour PostgreSQL"
fi

# Vérifier que DATABASE_URL pointe vers PostgreSQL (ou utiliser une URL de test)
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL n'est pas définie"
    echo "   Pour créer les migrations, vous devez avoir une base PostgreSQL accessible"
    echo "   Définissez DATABASE_URL avec votre connection string PostgreSQL"
    echo ""
    echo "   Exemple:"
    echo "   export DATABASE_URL='postgresql://user:password@host/database?sslmode=require'"
    exit 1
fi

# Vérifier que c'est PostgreSQL
if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
    echo "❌ DATABASE_URL ne pointe pas vers PostgreSQL"
    echo "   Les migrations Prisma doivent être créées avec PostgreSQL"
    exit 1
fi

echo "✅ DATABASE_URL configurée pour PostgreSQL"
echo ""

# Sauvegarder les migrations SQL manuelles existantes si elles existent
if [ -f "prisma/migrations/add_image_table.sql" ] || [ -f "prisma/migrations/add_order_to_projects.sql" ]; then
    echo "💾 Sauvegarde des migrations SQL manuelles existantes..."
    mkdir -p prisma/migrations.manual
    [ -f "prisma/migrations/add_image_table.sql" ] && mv prisma/migrations/add_image_table.sql prisma/migrations.manual/ 2>/dev/null || true
    [ -f "prisma/migrations/add_order_to_projects.sql" ] && mv prisma/migrations/add_order_to_projects.sql prisma/migrations.manual/ 2>/dev/null || true
    echo "✅ Migrations SQL manuelles sauvegardées dans prisma/migrations.manual/"
fi

# Créer une migration baseline
echo "📋 Création d'une migration baseline Prisma..."
echo "   Cette migration capture l'état actuel du schéma"
echo ""

# Utiliser migrate dev avec --create-only pour créer la migration sans l'appliquer
# Puis on utilisera migrate resolve pour la marquer comme appliquée si la DB existe déjà
pnpm prisma migrate dev --name init --create-only || {
    echo "❌ Erreur lors de la création de la migration"
    echo "   Vérifiez que le schéma est valide et que DATABASE_URL est correcte"
    exit 1
}

echo ""
echo "✅ Migration baseline créée avec succès !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez le fichier SQL généré dans prisma/migrations/"
echo "   2. Si la base de données existe déjà, marquez la migration comme appliquée:"
echo "      pnpm prisma migrate resolve --applied init"
echo "   3. Sinon, appliquez la migration:"
echo "      pnpm prisma migrate deploy"
echo "   4. Commitez les migrations dans Git:"
echo "      git add prisma/migrations/"
echo "      git commit -m 'Add Prisma migrations for PostgreSQL'"
echo ""

