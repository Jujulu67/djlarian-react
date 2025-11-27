# Gestion des Warnings du React Compiler

## Problème

Le React Compiler intégré dans Next.js 16 génère des warnings qui sont souvent des faux positifs, notamment :

- "React Compiler has skipped optimizing this component"
- "Cannot call impure function"
- "The inferred dependency was X, but the source dependencies were Y"

Ces warnings ne peuvent pas être complètement désactivés via la configuration Next.js car ils sont générés par le compilateur React lui-même.

## Solution

Un script de filtrage a été créé pour supprimer ces warnings de la sortie console lors du build :

```bash
npm run build 2>&1 | bash scripts/filter-react-compiler-warnings.sh
```

## Alternative : Filtrer dans le code

Si vous souhaitez filtrer ces warnings directement dans votre code de build, vous pouvez modifier votre script `build` dans `package.json` :

```json
{
  "scripts": {
    "build": "bash scripts/ensure-postgresql-schema.sh && node scripts/fix-prisma-types.mjs && NODE_OPTIONS='--import tsx' next build 2>&1 | bash scripts/filter-react-compiler-warnings.sh"
  }
}
```

## Note

Ces warnings sont généralement inoffensifs et n'affectent pas le fonctionnement de l'application. Ils indiquent simplement que le compilateur React n'a pas pu optimiser certains composants, ce qui est souvent dû à des patterns de code complexes ou à des dépendances dynamiques.
