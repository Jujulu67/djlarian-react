/**
 * Script pour remplacer automatiquement les références à baseMockProjects et mockContext
 * dans les tests de la matrice
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/lib/assistant/router/__tests__/router.mutations-after-list.test.ts';
let content = readFileSync(filePath, 'utf-8');

// Pattern 1: Remplacer les références dans les describe.each qui calculent initialListedIds
// Ces références doivent être supprimées car elles seront calculées dynamiquement dans le test

// Pattern 2: Remplacer les références dans les tests qui utilisent baseMockProjects ou mockContext
// Par des appels à buildTestDataset() et createMockContext()

// Note: Ce script est un helper, mais le remplacement manuel est plus sûr pour éviter les erreurs
console.log('Script de remplacement créé. Utilisez-le avec précaution.');

