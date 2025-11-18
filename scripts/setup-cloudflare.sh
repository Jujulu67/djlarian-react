#!/bin/bash

# Script d'aide pour la configuration Cloudflare Pages + Neon
# Usage: ./scripts/setup-cloudflare.sh

echo "🚀 Configuration Cloudflare Pages + Neon"
echo "=========================================="
echo ""

# Vérifier que les dépendances sont installées
echo "📦 Vérification des dépendances..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ Node.js et npm sont installés"
echo ""

# Vérifier que Prisma est installé
echo "🔍 Vérification de Prisma..."
if [ ! -f "node_modules/.bin/prisma" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

echo "✅ Prisma est disponible"
echo ""

# Générer NEXTAUTH_SECRET
echo "🔐 Génération de NEXTAUTH_SECRET..."
if command -v openssl &> /dev/null; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo ""
    echo "✅ NEXTAUTH_SECRET généré :"
    echo "$NEXTAUTH_SECRET"
    echo ""
    echo "⚠️  IMPORTANT : Copiez cette valeur, vous en aurez besoin pour Cloudflare Pages"
    echo ""
else
    echo "⚠️  openssl n'est pas installé. Vous devrez générer NEXTAUTH_SECRET manuellement :"
    echo "   openssl rand -base64 32"
    echo ""
fi

# Vérifier que le fichier .env existe
echo "📝 Vérification des variables d'environnement..."
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo "⚠️  Aucun fichier .env trouvé"
    echo "   Créez un fichier .env.local avec vos variables d'environnement"
    echo ""
fi

echo ""
echo "📋 Prochaines étapes :"
echo "1. Créer un compte Neon : https://neon.tech"
echo "2. Créer un projet et obtenir la connection string"
echo "3. Mettre à jour DATABASE_URL dans .env.local"
echo "4. Exécuter : npx prisma migrate deploy"
echo "5. Créer un compte Cloudflare : https://dash.cloudflare.com"
echo "6. Créer un bucket R2 et obtenir les credentials"
echo "7. Connecter votre repo GitHub à Cloudflare Pages"
echo "8. Configurer les variables d'environnement dans Cloudflare"
echo ""
echo "📚 Consultez DEPLOYMENT_STEP_BY_STEP.md pour le guide complet"
echo ""

