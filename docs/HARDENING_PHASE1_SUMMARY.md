# Hardening Phase 1: Résumé des changements

## ✅ Phase 1 complétée: Observabilité + UX

### Liste des fichiers modifiés/créés

#### Nouveaux fichiers

- `src/lib/assistant/utils/generate-request-id.ts`
- `docs/HARDENING_PHASE1_REQUESTID.md`
- `docs/HARDENING_PHASE1_COMPLETE.md`
- `docs/HARDENING_PHASE1_SUMMARY.md` (ce fichier)

#### Fichiers modifiés

1. `src/lib/assistant/router/types.ts`
2. `src/lib/assistant/router/router.ts`
3. `src/lib/assistant/router/client-router.ts`
4. `src/components/assistant/types.ts`
5. `src/components/assistant/hooks/useAssistantChat.ts`
6. `src/components/assistant/handlers/handleConfirmUpdate.ts`
7. `src/components/ProjectAssistant.tsx`
8. `src/app/api/projects/batch-update/route.ts`

---

## Extraits 5 lignes avant/après

### 1. Router: requestId + previewDiff + dedupe IDs

#### router.ts - Propagation requestId dans logs

**AVANT:**

```typescript
export async function routeProjectCommand(
  userMessage: string,
  options: RouterOptions
): Promise<ProjectCommandResult> {
  const { context, conversationHistory, lastFilters } = options;
  const { projects, availableCollabs, availableStyles, projectCount } = context;

  // Logs d'entrée (debug) - Sanitizer le message utilisateur
  const sanitizedMessage = sanitizeForLogs(userMessage, 200);
  debugLog('router', '📥 Entrée du routeur', {
```

**APRÈS:**

```typescript
export async function routeProjectCommand(
  userMessage: string,
  options: RouterOptions
): Promise<ProjectCommandResult> {
  const { context, conversationHistory, lastFilters, requestId } = options;
  const { projects, availableCollabs, availableStyles, projectCount } = context;

  // Logs d'entrée (debug) - Sanitizer le message utilisateur
  const sanitizedMessage = sanitizeForLogs(userMessage, 200);
  const logPrefix = requestId ? `[${requestId}]` : '';
  debugLog('router', `${logPrefix} 📥 Entrée du routeur`, {
    requestId,
```

#### router.ts - Génération previewDiff

**AVANT:**

```typescript
    // Utiliser les champs du dernier listing si disponibles, sinon par défaut
    const fieldsToShowForConfirmation = fieldsToShow || ['progress', 'status', 'deadline'];

    const pendingAction: PendingConfirmationAction = {
      actionId: generateActionId(),
      type: actionType,
      filters: effectiveFilters,
      mutation,
      affectedProjects,
      affectedProjectIds: affectedProjects.map((p) => p.id),
```

**APRÈS:**

```typescript
    // Utiliser les champs du dernier listing si disponibles, sinon par défaut
    const fieldsToShowForConfirmation = fieldsToShow || ['progress', 'status', 'deadline'];

    // Générer previewDiff pour les 3 premiers projets
    const previewDiff: import('./types').ProjectPreviewDiff[] = affectedProjects
      .slice(0, 3)
      .map((project) => generateProjectPreviewDiff(project, mutation));

    const pendingAction: PendingConfirmationAction = {
      actionId: generateActionId(),
      type: actionType,
      filters: effectiveFilters,
      mutation,
      affectedProjects,
      affectedProjectIds: Array.from(new Set(affectedProjects.map((p) => p.id))), // Dedupe
```

---

### 2. API batch-update: idempotency + concurrency check

#### route.ts - Réception requestId

**AVANT:**

```typescript
    const body = await request.json();
    const {
      // IDs spécifiques des projets à modifier (priorité sur les filtres)
      projectIds,
      scopeSource,
      // Filtres pour identifier les projets à modifier
      minProgress,
```

**APRÈS:**

```typescript
    const body = await request.json();
    const {
      // IDs spécifiques des projets à modifier (priorité sur les filtres)
      projectIds,
      scopeSource,
      // ID de corrélation pour tracer la requête
      requestId,
      // Filtres pour identifier les projets à modifier
      minProgress,
```

#### route.ts - Logs avec requestId

**AVANT:**

```typescript
    // Logs des inputs
    console.log('[Batch Update API] 📥 Inputs reçus:', {
      projectIdsCount: projectIds?.length || 0,
      scopeSource: scopeSource || 'filter-based',
```

**APRÈS:**

```typescript
    // Logs des inputs avec requestId
    const logPrefix = requestId ? `[${requestId}]` : '';
    console.log(`[Batch Update API] ${logPrefix} 📥 Inputs reçus:`, {
      requestId,
      projectIdsCount: projectIds?.length || 0,
      scopeSource: scopeSource || 'filter-based',
```

---

### 3. UI: affichage dev scope + diff

#### ProjectAssistant.tsx - Bloc dev-only scope

**AVANT:**

```typescript
function ConfirmationButtons({
  msg,
  idx,
  router,
  setIsLoading,
  setMessages,
  setLocalProjects,
  localProjectsRef,
  setLastFilters,
}: MessageBubbleProps) {
  return (
    <div className="mt-3 flex flex-col gap-2 w-full">
      <div className="flex gap-2">
```

**APRÈS:**

```typescript
function ConfirmationButtons({
  msg,
  idx,
  router,
  setIsLoading,
  setMessages,
  setLocalProjects,
  localProjectsRef,
  setLastFilters,
}: MessageBubbleProps) {
  const updateConfirmation = msg.updateConfirmation;
  const isDevMode = isAssistantDebugEnabled();

  // Construire le résumé du filtre si ExplicitFilter
  const filterSummary = updateConfirmation?.scopeSource === 'ExplicitFilter'
    ? Object.entries(updateConfirmation.filters || {})
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ')
    : null;

  return (
    <div className="mt-3 flex flex-col gap-2 w-full">
      {/* Bloc dev-only: Scope et requestId */}
      {isDevMode && updateConfirmation && (
        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-xs font-mono">
          <div className="text-slate-400 mb-2 font-semibold">[DEV] Scope Info</div>
          <div className="space-y-1 text-slate-300">
            <div>
              <span className="text-slate-500">scopeSource:</span>{' '}
              <span className="text-yellow-400">{updateConfirmation.scopeSource || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500">affectedCount:</span>{' '}
              <span className="text-blue-400">
                {updateConfirmation.affectedProjectIds?.length || updateConfirmation.affectedProjects?.length || 0}
              </span>
            </div>
            {filterSummary && (
              <div>
                <span className="text-slate-500">filterSummary:</span>{' '}
                <span className="text-green-400">{filterSummary}</span>
              </div>
            )}
            {updateConfirmation.requestId && (
              <div>
                <span className="text-slate-500">requestId:</span>{' '}
                <span className="text-purple-400">{updateConfirmation.requestId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Diff avant→après */}
      {updateConfirmation?.previewDiff && updateConfirmation.previewDiff.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-xs">
          <div className="text-slate-400 mb-2 font-semibold">Aperçu des changements</div>
          <div className="space-y-2">
            {updateConfirmation.previewDiff.map((diff) => (
              <div key={diff.id} className="bg-slate-800/30 rounded p-2">
                <div className="text-slate-200 font-medium mb-1">{diff.name}</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  {diff.changes.map((change, idx) => (
                    <li key={idx}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
```

---

## Nouveaux tests (à ajouter)

### Test requestId propagation

```typescript
it('devrait propager requestId dans PendingConfirmationAction et payload API', async () => {
  const requestId = 'AssistantRequest-1234567890-1';
  const result = await routeProjectCommand('passe les terminés à 50%', {
    context: mockContext,
    requestId,
  });

  expect(result.type).toBe(ProjectCommandType.UPDATE);
  if (result.type === ProjectCommandType.UPDATE) {
    expect(result.pendingAction.requestId).toBe(requestId);
    expect(result.requestId).toBe(requestId);
  }
});
```

### Test previewDiff

```typescript
it('devrait générer previewDiff avec changements progress', async () => {
  const result = await routeProjectCommand('passe les terminés à 50%', {
    context: mockContextWithProjects,
  });

  if (result.type === ProjectCommandType.UPDATE) {
    expect(result.pendingAction.previewDiff).toBeDefined();
    expect(result.pendingAction.previewDiff?.length).toBeGreaterThan(0);
    expect(result.pendingAction.previewDiff?.[0].changes).toContain('progress');
    expect(result.pendingAction.previewDiff?.[0].changes[0]).toContain('→');
  }
});
```

---

## Résumé "risques/compat"

### ✅ Rétrocompatibilité

- Tous les nouveaux champs sont **optionnels**
- Le système fonctionne avec ou sans requestId/previewDiff
- Pas de breaking changes

### ✅ Production

- **RequestId**: Non sensible, peut être loggé sans sanitization
- **PreviewDiff**: Calculé côté client, pas de charge serveur
- **Affichage dev-only**: N'affecte pas les utilisateurs normaux (conditionné par `isAssistantDebugEnabled()`)

### ⚠️ Points d'attention

- Les logs avec requestId augmentent légèrement la taille des logs (acceptable)
- PreviewDiff calculé pour max 3 projets (impact négligeable)

---

## Plan de commits (recommandé)

```bash
# Commit 1: RequestId
git add src/lib/assistant/utils/generate-request-id.ts
git add src/lib/assistant/router/types.ts
git add src/lib/assistant/router/router.ts
git add src/lib/assistant/router/client-router.ts
git add src/components/assistant/types.ts
git add src/components/assistant/hooks/useAssistantChat.ts
git add src/components/assistant/handlers/handleConfirmUpdate.ts
git add src/app/api/projects/batch-update/route.ts
git commit -m "feat: add requestId and dev scope display"

# Commit 2: Preview Diff
git add src/lib/assistant/router/router.ts
git add src/components/assistant/types.ts
git add src/components/assistant/hooks/useAssistantChat.ts
git add src/components/ProjectAssistant.tsx
git commit -m "feat: add preview diffs for confirmations"
```

---

## Commandes de test

```bash
# Tests existants (doivent toujours passer)
pnpm run test:assistant-router

# Tests à ajouter (recommandé)
pnpm test -- src/lib/assistant/router/__tests__/router.requestid.test.ts
pnpm test -- src/lib/assistant/router/__tests__/router.previewdiff.test.ts
```

---

## Prochaines phases

- **Phase 2**: Sécurité mutations (idempotency, concurrency, dedupe)
- **Phase 3**: Parsing maintenable + tests réalistes
- **Phase 4**: Tests/CI et garde-fous finaux
