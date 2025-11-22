#!/bin/bash

# Script helper pour ajouter DATABASE_URL_PRODUCTION dans .env.local
# Utilisé quand le switch PostgreSQL est activé en développement local

set -e

ENV_LOCAL_PATH=".env.local"

echo "🔧 Configuration de DATABASE_URL_PRODUCTION pour le développement local"
echo ""

# Vérifier si .env.local existe
if [ ! -f "$ENV_LOCAL_PATH" ]; then
  echo "⚠️  .env.local n'existe pas. Création du fichier..."
  touch "$ENV_LOCAL_PATH"
fi

# Vérifier si DATABASE_URL_PRODUCTION existe déjà
if grep -q '^DATABASE_URL_PRODUCTION=' "$ENV_LOCAL_PATH"; then
  echo "✅ DATABASE_URL_PRODUCTION est déjà défini dans .env.local"
  echo ""
  echo "Valeur actuelle:"
  grep '^DATABASE_URL_PRODUCTION=' "$ENV_LOCAL_PATH" | sed 's/=.*/=***/' || true
  echo ""
  echo "Pour modifier la valeur, éditez manuellement .env.local"
  exit 0
fi

echo "📝 Ajout de DATABASE_URL_PRODUCTION dans .env.local"
echo ""
echo "⚠️  IMPORTANT: Vous devez fournir votre connection string PostgreSQL (Neon)"
echo "   Vous pouvez la trouver dans:"
echo "   - Neon Dashboard → votre projet → Connection String"
echo "   - Ou copier depuis Vercel: Settings → Environment Variables → DATABASE_URL"
echo ""
read -p "Entrez votre DATABASE_URL_PRODUCTION (ou appuyez sur Entrée pour quitter): " db_url

if [ -z "$db_url" ]; then
  echo "❌ Aucune valeur fournie. Annulation."
  exit 1
fi

# Ajouter DATABASE_URL_PRODUCTION à .env.local
echo "" >> "$ENV_LOCAL_PATH"
echo "# Base de données de production (utilisée quand le switch PostgreSQL est activé)" >> "$ENV_LOCAL_PATH"
echo "DATABASE_URL_PRODUCTION=\"$db_url\"" >> "$ENV_LOCAL_PATH"

echo ""
echo "✅ DATABASE_URL_PRODUCTION ajouté dans .env.local"
echo ""
echo "Vous pouvez maintenant activer le switch PostgreSQL dans /admin/configuration"

