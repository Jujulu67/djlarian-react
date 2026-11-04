#!/usr/bin/env bash
# « Ignored Build Step » de Vercel : code 0 = on saute le build, code 1 = on construit.
# Évite d'occuper l'unique créneau de build (la prod attendait derrière des previews inutiles).

# Branches Dependabot : la CI GitHub les vérifie, une preview n'apporte rien
if [[ "$VERCEL_GIT_COMMIT_REF" == dependabot/* ]]; then
  echo "Build ignoré : branche Dependabot"
  exit 0
fi

# Commit qui ne touche que la documentation
if git rev-parse --verify --quiet HEAD^ >/dev/null &&
  git diff --quiet HEAD^ HEAD -- . ':(exclude)docs/**' ':(exclude)*.md' ':(exclude)**/*.md'; then
  echo "Build ignoré : seule la documentation a changé"
  exit 0
fi

exit 1
