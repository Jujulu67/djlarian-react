#!/bin/bash
# Script pour filtrer les warnings du React Compiler (faux positifs)
# Utilisation: pnpm run build 2>&1 | bash scripts/filter-react-compiler-warnings.sh

# Filtrer les warnings du React Compiler qui sont des faux positifs
# Ces warnings sont générés par le compilateur React intégré dans Next.js
# et ne peuvent pas être désactivés directement via la configuration

grep -v "React Compiler has skipped optimizing" | \
grep -v "Cannot call impure function" | \
grep -v "The inferred dependency was" | \
grep -v "but the source dependencies were" | \
grep -v "Inferred less specific property than source" | \
grep -v "Inferred different dependency than source"

