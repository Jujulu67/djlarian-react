# Hardening Phase 1.1: RequestId (CorrelationId) de bout en bout

## Objectif

Pouvoir relier: message utilisateur → routeur → confirmation → API → logs.

## Changements effectués

### 1. Types mis à jour

- `RouterOptions`: ajout champ `requestId?: string`
- `PendingConfirmationAction`: ajout champ `requestId?: string`
- Tous les `ProjectCommandResult`: ajout champ `requestId?: string` (ListCommandResult, CreateCommandResult, PendingActionResult, GeneralCommandResult, PendingScopeConfirmationResult)
- `Message.updateConfirmation`: ajout champ `requestId?: string`

### 2. Génération du requestId

- Créé `src/lib/assistant/utils/generate-request-id.ts`
- Format: `AssistantRequest-<timestamp>-<counter>`
- Fonction `generateRequestId()` utilisable côté client

### 3. Propagation dans le flux

- **Client (useAssistantChat)**: Génère requestId à chaque commande et le propage
- **Client Router**: Accepte et propage requestId dans RouterOptions
- **Router**: Utilise requestId dans tous les logs avec préfixe `[requestId]`
- **PendingAction**: Inclut requestId dans PendingConfirmationAction
- **Handler (handleConfirmUpdate)**: Récupère requestId et l'envoie dans le payload API
- **API batch-update**: Reçoit et log requestId dans tous les logs principaux

### 4. Logs avec requestId

Tous les logs incluent maintenant le requestId:

- Router: `[${requestId}] 📥 Entrée du routeur`
- Handler: `[${requestId}] 📤 Avant appel API`
- API: `[${requestId}] 📥 Inputs reçus`

## Fichiers modifiés

1. `src/lib/assistant/router/types.ts` - Types mis à jour
2. `src/lib/assistant/router/router.ts` - Propagation et logs
3. `src/lib/assistant/router/client-router.ts` - Accepte requestId
4. `src/components/assistant/types.ts` - Message.updateConfirmation.requestId
5. `src/components/assistant/hooks/useAssistantChat.ts` - Génération et propagation
6. `src/components/assistant/handlers/handleConfirmUpdate.ts` - Envoi dans API
7. `src/app/api/projects/batch-update/route.ts` - Réception et logs
8. `src/lib/assistant/utils/generate-request-id.ts` - **NOUVEAU**

## Tests à ajouter

- Test unitaire vérifiant que requestId est propagé dans PendingConfirmationAction
- Test vérifiant que requestId est envoyé dans le payload API (mock fetch)

## Compatibilité

- ✅ Rétrocompatible: requestId est optionnel partout
- ✅ Pas de breaking changes
- ✅ Fonctionne avec ou sans requestId
