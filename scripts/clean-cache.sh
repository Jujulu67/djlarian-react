#!/bin/bash
# Script pour nettoyer le cache webpack après le build
# Utilisé pour Cloudflare Pages qui a une limite de 25 MiB par fichier

echo "🧹 Nettoyage du cache webpack..."

# Supprimer le cache webpack qui peut contenir des fichiers > 25 MiB
rm -rf .next/cache/webpack

# Supprimer les autres caches volumineux
rm -rf .next/cache/eslint
rm -rf .next/cache/swc

echo "✅ Cache nettoyé !"

