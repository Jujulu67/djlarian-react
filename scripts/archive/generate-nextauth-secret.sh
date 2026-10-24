#!/bin/bash

# Script pour générer NEXTAUTH_SECRET
# Usage: ./scripts/generate-nextauth-secret.sh

echo "🔐 Génération de NEXTAUTH_SECRET"
echo "================================="
echo ""

if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -base64 32)
    echo "✅ NEXTAUTH_SECRET généré :"
    echo ""
    echo "$SECRET"
    echo ""
    echo "⚠️  IMPORTANT : Copiez cette valeur, vous en aurez besoin pour Cloudflare Pages"
    echo ""
    echo "Pour l'ajouter dans Cloudflare Pages :"
    echo "1. Dashboard → Pages → votre projet → Settings → Environment Variables"
    echo "2. Ajouter NEXTAUTH_SECRET avec cette valeur"
    echo "3. Cocher 'Encrypt' (Secret)"
    echo ""
else
    echo "❌ openssl n'est pas installé"
    echo ""
    echo "Installez openssl ou générez manuellement avec :"
    echo "  openssl rand -base64 32"
    echo ""
    exit 1
fi

