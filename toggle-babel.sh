#!/bin/bash

# Script pour activer/désactiver la configuration Babel

if [ "$1" == "dev" ]; then
  # Pour le développement, désactiver Babel
  if [ -f "babel.config.js" ]; then
    # Au lieu de renommer, on fait une sauvegarde et on crée un fichier minimal
    cp babel.config.js babel.config.js.full
    echo "module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [],
    plugins: [],
    ignore: ['**/*'],
  };
};" > babel.config.js
    echo "✅ Mode développement: babel.config.js modifié pour ignorer tous les fichiers"
    echo "⚙️  Vous pouvez maintenant lancer 'pnpm run dev'"
  else
    echo "🔍 babel.config.js non trouvé"
  fi
elif [ "$1" == "test" ]; then
  # Pour les tests, réactiver Babel complet
  if [ -f "babel.config.js.full" ]; then
    cp babel.config.js.full babel.config.js
    echo "✅ Mode test: babel.config.js restauré à sa version complète"
    echo "⚙️  Vous pouvez maintenant lancer 'pnpm test'"
  else
    echo "🔍 babel.config.js.full non trouvé. Vous devez d'abord exécuter ./toggle-babel.sh dev"
  fi
else
  echo "❌ Usage: ./toggle-babel.sh [dev|test]"
  echo "   - dev: Désactive Babel pour le développement"
  echo "   - test: Active Babel pour les tests"
fi 