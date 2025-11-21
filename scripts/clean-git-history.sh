#!/bin/bash
# Script pour nettoyer l'historique Git des secrets
# ATTENTION: Cette opération réécrit l'historique Git
# À utiliser uniquement si vous êtes sûr de vouloir supprimer définitivement les secrets

set -e

echo "🔒 Nettoyage de l'historique Git des secrets..."
echo ""
echo "⚠️  ATTENTION: Cette opération va réécrire l'historique Git"
echo "   - Tous les commits seront modifiés"
echo "   - Vous devrez faire un force push si vous avez un remote"
echo "   - Les autres développeurs devront re-cloner le repo"
echo ""
read -p "Continuer? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Opération annulée"
  exit 1
fi

# Supprimer .env.local.backup de tout l'historique
echo "🧹 Suppression de .env.local.backup de l'historique..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local.backup" \
  --prune-empty --tag-name-filter cat -- --all

# Supprimer les références de backup créées par filter-branch
echo "🧹 Nettoyage des références de backup..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Nettoyer les objets non référencés
echo "🧹 Nettoyage des objets Git..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Nettoyage terminé!"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Vérifiez l'historique: git log --all"
echo "   2. Si vous avez un remote, faites un force push:"
echo "      git push --force --all"
echo "      git push --force --tags"
echo "   3. Informez votre équipe qu'ils doivent re-cloner le repo"
echo ""


