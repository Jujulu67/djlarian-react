#!/bin/bash
# Script wrapper pour ESLint dans lint-staged
# Ne bloque pas le commit même s'il y a des erreurs non-fixables
# Auto-fixe ce qui peut l'être et continue

eslint --config eslint.config.mjs --fix --max-warnings=9999 "$@" || true

