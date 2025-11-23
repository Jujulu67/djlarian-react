#!/bin/bash

# Script pour ajouter BLOB_READ_WRITE_TOKEN_PRODUCTION dans .env.local
# Usage: ./scripts/add-blob-token.sh "votre_token_ici"

set -e

ENV_LOCAL=".env.local"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "❌ Erreur: Token manquant"
  echo ""
  echo "Usage: ./scripts/add-blob-token.sh \"votre_token_ici\""
  echo ""
  echo "Pour obtenir le token:"
  echo "1. Allez dans votre projet Vercel"
  echo "2. Settings → Environment Variables"
  echo "3. Trouvez BLOB_READ_WRITE_TOKEN"
  echo "4. Copiez la valeur"
  echo ""
  exit 1
fi

# Créer .env.local s'il n'existe pas
if [ ! -f "$ENV_LOCAL" ]; then
  touch "$ENV_LOCAL"
  echo "✅ Fichier .env.local créé"
fi

# Vérifier si BLOB_READ_WRITE_TOKEN_PRODUCTION existe déjà
if grep -q "^BLOB_READ_WRITE_TOKEN_PRODUCTION=" "$ENV_LOCAL"; then
  # Remplacer la valeur existante
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^BLOB_READ_WRITE_TOKEN_PRODUCTION=.*|BLOB_READ_WRITE_TOKEN_PRODUCTION=\"$TOKEN\"|" "$ENV_LOCAL"
  else
    # Linux
    sed -i "s|^BLOB_READ_WRITE_TOKEN_PRODUCTION=.*|BLOB_READ_WRITE_TOKEN_PRODUCTION=\"$TOKEN\"|" "$ENV_LOCAL"
  fi
  echo "✅ BLOB_READ_WRITE_TOKEN_PRODUCTION mis à jour dans .env.local"
else
  # Ajouter la nouvelle variable
  echo "" >> "$ENV_LOCAL"
  echo "# Blob storage de production (pour le switch)" >> "$ENV_LOCAL"
  echo "BLOB_READ_WRITE_TOKEN_PRODUCTION=\"$TOKEN\"" >> "$ENV_LOCAL"
  echo "✅ BLOB_READ_WRITE_TOKEN_PRODUCTION ajouté dans .env.local"
fi

echo ""
echo "🎉 Configuration terminée !"
echo ""
echo "Prochaines étapes:"
echo "1. Activez le switch de production dans /admin/configuration"
echo "2. Le serveur redémarrera automatiquement"
echo "3. Les images seront servies depuis Vercel Blob"
echo ""

