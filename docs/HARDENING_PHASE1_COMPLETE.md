# Hardening Phase 1: Observabilité + UX - COMPLÈTE

## Objectif global

Rendre le système observable (trace de bout en bout) et améliorer l'UX (diff avant→après, scope dev visible).

## Phase 1.1: RequestId (CorrelationId) de bout en bout ✅

### Changements

- **Génération**: Créé `src/lib/assistant/utils/generate-request-id.ts`
  - Format: `AssistantRequest-<timestamp>-<counter>`
  - Fonction `generateRequestId()` côté client

- **Propagation**:
  - Client (`useAssistantChat`): Génère requestId à chaque commande
  - Router: Accepte requestId dans `RouterOptions`, propage dans tous les résultats
  - PendingAction: Inclut requestId
  - Handler: Récupère et envoie requestId dans payload API
  - API: Reçoit et log requestId dans tous les logs principaux

- **Logs**: Tous les logs incluent maintenant `[${requestId}]` comme préfixe
  - Router: `[${requestId}] 📥 Entrée du routeur`
  - Handler: `[${requestId}] 📤 Avant appel API`
  - API: `[${requestId}] 📥 Inputs reçus`

### Fichiers modifiés

1. `src/lib/assistant/router/types.ts` - Types mis à jour (requestId optionnel partout)
2. `src/lib/assistant/router/router.ts` - Propagation et logs
3. `src/lib/assistant/router/client-router.ts` - Accepte requestId
4. `src/components/assistant/types.ts` - Message.updateConfirmation.requestId
5. `src/components/assistant/hooks/useAssistantChat.ts` - Génération et propagation
6. `src/components/assistant/handlers/handleConfirmUpdate.ts` - Envoi dans API
7. `src/app/api/projects/batch-update/route.ts` - Réception et logs
8. `src/lib/assistant/utils/generate-request-id.ts` - **NOUVEAU**

## Phase 1.2: Affichage dev-only du scope ✅

### Changements

- Ajout d'un bloc dev-only dans `ConfirmationButtons` qui affiche:
  - `scopeSource`: LastListedIds, ExplicitFilter, etc.
  - `affectedCount`: Nombre de projets affectés
  - `filterSummary`: Résumé des filtres si ExplicitFilter
  - `requestId`: ID de corrélation

- Affichage conditionnel via `isAssistantDebugEnabled()`
- Style: Fond sombre, police monospace, couleurs distinctes par type

### Fichiers modifiés

1. `src/components/ProjectAssistant.tsx` - Bloc dev-only dans ConfirmationButtons

## Phase 1.3: Diff avant→après standardisé ✅

### Changements

- Ajout type `ProjectPreviewDiff` dans `types.ts`
- Fonction `generateProjectPreviewDiff()` dans router.ts
  - Calcule les changements pour chaque projet
  - Format: "progress 30% → 50%", "status EN_COURS → TERMINE", etc.
  - Gère: progress, status, deadline (absolu et relatif), label, labelFinal, note

- `previewDiff` généré pour les 3 premiers projets affectés
- Affichage dans UI sous forme de cartes avec liste des changements

### Format du diff

```
Aperçu des changements
┌─────────────────────────────┐
│ Nom du projet               │
│ • progress 30% → 50%        │
│ • status EN_COURS → TERMINE  │
│ • deadline 13/01/26 → 13/02/26 │
└─────────────────────────────┘
```

### Fichiers modifiés

1. `src/lib/assistant/router/types.ts` - Type ProjectPreviewDiff
2. `src/lib/assistant/router/router.ts` - Fonction generateProjectPreviewDiff + génération
3. `src/components/assistant/types.ts` - Message.updateConfirmation.previewDiff
4. `src/components/assistant/hooks/useAssistantChat.ts` - Propagation previewDiff
5. `src/components/ProjectAssistant.tsx` - Affichage UI du diff

## Résumé des fichiers modifiés/créés

### Nouveaux fichiers

- `src/lib/assistant/utils/generate-request-id.ts`
- `docs/HARDENING_PHASE1_REQUESTID.md`
- `docs/HARDENING_PHASE1_COMPLETE.md` (ce fichier)

### Fichiers modifiés

1. `src/lib/assistant/router/types.ts`
2. `src/lib/assistant/router/router.ts`
3. `src/lib/assistant/router/client-router.ts`
4. `src/components/assistant/types.ts`
5. `src/components/assistant/hooks/useAssistantChat.ts`
6. `src/components/assistant/handlers/handleConfirmUpdate.ts`
7. `src/components/ProjectAssistant.tsx`
8. `src/app/api/projects/batch-update/route.ts`

## Tests à ajouter (recommandé)

### Phase 1.1

- Test unitaire vérifiant que requestId est propagé dans PendingConfirmationAction
- Test vérifiant que requestId est envoyé dans le payload API (mock fetch)

### Phase 1.3

- Router integration test: un cas progress et un cas deadline vérifient que previewDiff existe et contient un `→`

## Compatibilité

- ✅ Rétrocompatible: Tous les nouveaux champs sont optionnels
- ✅ Pas de breaking changes
- ✅ Fonctionne avec ou sans requestId/previewDiff
- ✅ Affichage dev-only n'affecte pas les utilisateurs normaux

## Prochaines étapes

- Phase 2: Sécurité mutations (idempotency, concurrency, dedupe)
- Phase 3: Parsing maintenable + tests réalistes
- Phase 4: Tests/CI et garde-fous finaux
