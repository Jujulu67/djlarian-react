import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

// Import direct de next/core-web-vitals pour éviter les problèmes de FlatCompat
// next/core-web-vitals inclut déjà: react, react-hooks, import, jsx-a11y, @typescript-eslint
const nextConfig = require('eslint-config-next/core-web-vitals');

const eslintConfig = [
  {
    ignores: [
      '.next/',
      'node_modules/',
      'public/',
      'dist/',
      'coverage/',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
  },
  // Exceptions pour les fichiers de logging (ils utilisent console.log intentionnellement)
  {
    files: ['**/console-filters.ts', '**/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Exceptions pour les fichiers de tests et mocks (any et console.log acceptables)
  {
    files: [
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  // Exceptions pour les routes API qui utilisent any avec Prisma (types dynamiques)
  {
    files: ['src/app/api/**/route.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Warning au lieu d'error pour les types Prisma dynamiques
    },
  },
  ...nextConfig,
  ...compat.extends('plugin:prettier/recommended'),
  {
    rules: {
      // Règles TypeScript
      // explicit-function-return-type désactivé : l'inférence TypeScript suffit, trop verbeux sinon
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'after-used', // Ignorer les paramètres non utilisés si un paramètre après est utilisé
          argsIgnorePattern: '^_', // Ignorer les paramètres qui commencent par _
          varsIgnorePattern: '^_', // Ignorer les variables qui commencent par _
          caughtErrors: 'none', // Ignorer toutes les erreurs catchées non utilisées
          destructuredArrayIgnorePattern: '^_', // Ignorer les éléments de tableau destructurés qui commencent par _
          ignoreRestSiblings: true, // Ignorer les variables non utilisées dans les rest patterns
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error', // Critique : on a fait 90→0 any, il faut maintenir
      // naming-convention en 'off' : trop de faux positifs
      '@typescript-eslint/naming-convention': 'off',

      // Règles React
      // function-component-definition désactivé : question de style, pas critique
      'react/function-component-definition': 'off',
      // jsx-handler-names désactivé : convention de nommage, pas critique
      'react/jsx-handler-names': 'off',
      'react/jsx-no-bind': 'off', // Désactivé : impact performance négligeable en 2025, trop de bruit

      // Règles d'import
      // import/order désactivé : règle de style, pas critique pour le fonctionnement
      'import/order': 'off',

      // Règles d'accessibilité
      'jsx-a11y/anchor-is-valid': 'error', // Critique : liens valides
      'jsx-a11y/click-events-have-key-events': 'warn', // Accessibilité importante mais ne doit pas bloquer
      'jsx-a11y/no-static-element-interactions': 'warn', // Accessibilité importante mais ne doit pas bloquer

      // Règles générales
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prettier/prettier': 'error',

      // Règles assouplies pour réduire le bruit
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'warn', // Peut être nécessaire dans certains cas
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn', // Peut être nécessaire dans certains cas
      'react-hooks/immutability': 'warn', // Peut être nécessaire dans certains cas
      'react/no-unescaped-entities': 'off', // Désactivé car courant en français avec apostrophes
      // Note: Les erreurs React Compiler "Cannot call impure function" ne sont pas contrôlables via ESLint
      // Elles sont générées par le compilateur React intégré dans Next.js

      // Exceptions spécifiques par fichier (doivent être après les règles générales)
      // Fichiers de logging
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {},
      },
    },
  },
  // Exceptions pour les fichiers de logging (ils utilisent console.log intentionnellement)
  {
    files: ['**/console-filters.ts', '**/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Exceptions pour les fichiers de tests et mocks (any et console.log acceptables)
  {
    files: [
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  // Exceptions pour les routes API qui utilisent any avec Prisma (types dynamiques)
  {
    files: ['src/app/api/**/route.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Warning au lieu d'error pour les types Prisma dynamiques
    },
  },
];

export default eslintConfig;
