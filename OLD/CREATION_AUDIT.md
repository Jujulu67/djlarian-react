# Audit : Fonctionnalité de Création de Projets

## 📅 Chronologie des Commits

### Commits liés à `assistant.ts` :

1. **18b36c5** (2025-12-11) - `feat: update dependencies and enhance project structure`
2. **3048bf0** (2025-12-12) - `refactor: streamline assistant actions and enhance query parsing`
3. **cfe65e4** (2025-12-12) - `feat: enhance project management with note handling and query parsing improvements` ⚠️ **COMMIT RÉCUPÉRÉ (OLD)**
4. **12ae9dd** (2025-12-12) - `refactor: improve debug logging and modularize query parsing`
5. **e0fc2c2** (2025-12-12) - `feat: enhance conversational context handling and refactor ProjectAssistant`
6. **37d195b** (2025-12-13) - `feat: enhance project command processing and query classification` ✅ **CRÉATION AJOUTÉE ICI**

## 🔍 Résultats de l'Audit

### Commit cfe65e4 (OLD - récupéré)

- ❌ **PAS de `createCreateProjectsTool`**
- ❌ **PAS de `createProjects` dans les outils**
- ❌ **PAS de création de projets côté serveur**
- ✅ **MAIS** : Le composant `ProjectAssistant.tsx` gère la création côté client (lignes 718-772)

### Commit 37d195b (actuel)

- ✅ **A `createCreateProjectsTool`**
- ✅ **A `createProjects` dans les outils**
- ✅ **A la création de projets côté serveur**
- ✅ **Fichiers ajoutés** :
  - `src/lib/assistant/tools/create-projects-schema.ts` (33 lignes)
  - `src/lib/assistant/tools/create-projects-tool.ts` (145 lignes)

## 📊 Conclusion

### Quand la fonctionnalité a été "perdue" ?

**La fonctionnalité de création de projets côté serveur n'a JAMAIS existé dans le commit cfe65e4 (OLD).**

Elle a été **ajoutée APRÈS** dans le commit **37d195b** (2025-12-13).

**Note sur les dates** : Les commits datent de **2025**, pas 2024 (corrigé dans ce document).

**IMPORTANT** : La création n'a pas été "perdue", elle a été **déplacée** :

- **Avant (cfe65e4)** : Création gérée **côté client** dans `ProjectAssistant.tsx`
- **Après (37d195b)** : Création gérée **côté serveur** via l'outil `createProjects`

### Comment la création était gérée dans OLD ?

Dans le commit cfe65e4, la création de projets était gérée **côté client** dans `ProjectAssistant.tsx` :

**Raison** : Tous les projets étaient déjà chargés en mémoire via `initialProjects` dans `ProjectsClient`, donc :

- ✅ **Avantage** : Évite des appels base inutiles (les projets sont déjà en mémoire)
- ✅ **Performance** : Pas besoin de recharger depuis la base
- ✅ **Simplicité** : Le parsing et la création se font côté client avec les données déjà disponibles

**Flux OLD** :

- L'utilisateur tape "ajoute le projet X"
- Le composant appelle `parseQueryWithAI()` qui fait un appel API `/api/assistant/parse-query`
- **MAIS** : Passe les projets déjà en mémoire dans le contexte :
  - `availableCollabs` : Extraits de `localProjectsRef.current` (ligne 662)
  - `availableStyles` : Extraits de `localProjectsRef.current` (ligne 663)
  - `projectCount` : `localProjectsRef.current.length` (ligne 664)
- Le parsing utilise ces données en mémoire, pas besoin de recharger depuis la base
- Si `parsed.type === 'create'`, le composant fait un appel API `POST /api/projects` pour créer
- Le composant met à jour l'état local `localProjects` avec le nouveau projet
- Le composant gère l'affichage et la mise à jour de l'UI sans recharger depuis la base

**Code OLD (ProjectAssistant.tsx lignes 718-772)** :

```typescript
// Si c'est une commande de création, créer le projet
if (parsed.type === 'create' && parsed.createData) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  });
  // ...
}
```

### Différence avec la version actuelle

**Version ACTUELLE (NEW)** :

- La création est gérée **côté serveur** via `createProjects` tool
- L'IA peut créer des projets directement via l'outil
- **MAIS** : Fait un appel base Prisma même si les projets sont déjà en mémoire côté client
- Le parsing côté serveur utilise les outils IA pour détecter les créations
- **Inconvénient** : Appel base inutile car les projets sont déjà chargés via `initialProjects` dans `ProjectsClient`

**Version OLD** :

- La création était gérée **côté client** dans `ProjectAssistant.tsx`
- Le parsing était fait côté client avec `parseQuery` (utilise les projets déjà en mémoire via `props.projects`)
- L'appel API `POST /api/projects` était fait côté client uniquement pour persister en base
- **Avantage** : Évite des appels base inutiles car :
  - Les projets sont déjà chargés via `initialProjects` dans `ProjectsClient` (ligne 45)
  - Le composant `ProjectAssistant` reçoit `allProjects` en props (ligne 1333)
  - Le parsing utilise ces projets en mémoire, pas besoin de recharger depuis la base
  - Seul l'appel API final persiste en base (nécessaire)

**Note importante** : Dans les deux versions, les projets sont chargés en mémoire via `initialProjects` dans `ProjectsClient` :

- **OLD** : Utilise les projets en mémoire pour le parsing, évite les appels base inutiles
- **NEW** : Fait des appels base Prisma même si les projets sont en mémoire (trade-off : meilleure cohérence IA vs performance)

## 🎯 Recommandation

Pour que la version OLD fonctionne avec la création de projets, il faudrait :

1. **Option 1** : Garder la logique côté client (comme dans OLD)
   - Le composant `ProjectAssistant.tsx` OLD gère déjà la création
   - Mais il faut que le parsing détecte les créations

2. **Option 2** : Ajouter l'outil `createProjects` dans OLD
   - Récupérer `create-projects-tool.ts` depuis le commit 37d195b
   - L'ajouter dans `OLD/src/lib/assistant/tools/`
   - Modifier `OLD/src/app/actions/assistant.ts` pour l'utiliser

3. **Option 3** : Modifier le prompt OLD pour rediriger vers le client
   - L'IA répond qu'elle ne peut pas créer, mais le composant client détecte et crée

## 📝 Fichiers à restaurer pour OLD

Pour restaurer la création côté serveur dans OLD (comme dans la version actuelle), récupérer depuis le commit 37d195b :

1. **Fichiers à copier dans OLD/** :
   - `src/lib/assistant/tools/create-projects-tool.ts` → `OLD/src/lib/assistant/tools/create-projects-tool.ts`
   - `src/lib/assistant/tools/create-projects-schema.ts` → `OLD/src/lib/assistant/tools/create-projects-schema.ts`

2. **Modifications dans `OLD/src/app/actions/assistant.ts`** :
   - Ajouter l'import : `import { createCreateProjectsTool } from '@old/lib/assistant/tools/create-projects-tool';`
   - Créer l'outil : `const createProjects = createCreateProjectsTool({ ... });`
   - Ajouter dans `availableTools` : `availableTools.createProjects = createProjects;`
   - Ajouter la logique de création (comme dans le commit 37d195b)

3. **Mettre à jour le prompt système** :
   - Retirer la section "❌ CRÉATION DE PROJETS : Tu ne peux PAS créer..."
   - Ajouter les instructions pour utiliser `createProjects`

## 🎯 Résumé Exécutif

| Date           | Commit      | État Création                                      |
| -------------- | ----------- | -------------------------------------------------- |
| 2025-12-11     | 18b36c5     | ❌ Pas de création serveur                         |
| 2025-12-12     | 3048bf0     | ❌ Pas de création serveur                         |
| **2025-12-12** | **cfe65e4** | **✅ Création côté CLIENT (ProjectAssistant.tsx)** |
| 2025-12-12     | 12ae9dd     | ❌ Pas de création serveur                         |
| 2025-12-12     | e0fc2c2     | ❌ Pas de création serveur                         |
| **2025-12-13** | **37d195b** | **✅ Création côté SERVEUR (createProjects tool)** |

**Conclusion** : La création n'a jamais été "perdue", elle a été **migrée du client vers le serveur** entre cfe65e4 et 37d195b.

## 🔄 Comparaison Comportement Actuel OLD vs NEW

### Chargement des Projets

**Les deux versions chargent les projets de la même manière** :

- `ProjectsPage` (serveur) charge tous les projets via Prisma
- Passe `initialProjects` à `ProjectsClient`
- `ProjectsClient` stocke dans `allProjects` (ligne 53)
- `ProjectAssistant` reçoit `allProjects` en props (ligne 1333)

### Différence Clé : Où se fait le parsing et la création ?

**Version OLD (cfe65e4)** :

```
Utilisateur → ProjectAssistant (client)
  ↓
parseQueryWithAI() → POST /api/assistant/parse-query
  ↓
Passe availableCollabs, availableStyles, projectCount (extraits de localProjectsRef.current)
  ↓
API parse-query utilise ces données en mémoire (pas d'appel base)
  ↓
Détecte type='create'
  ↓
POST /api/projects (côté client, uniquement pour persister)
  ↓
Met à jour localProjects (état local)
```

**Avantages OLD** :

- ✅ Pas d'appel base pour le parsing (utilise projets en mémoire via contexte)
- ✅ Pas d'appel base pour la détection (utilise projets en mémoire)
- ✅ Un seul appel API pour persister (nécessaire)
- ✅ Les collabs/styles disponibles sont extraits des projets en mémoire

**Version NEW (actuelle)** :

```
Utilisateur → useAssistantChat → processProjectCommand (serveur)
  ↓
parseQuery() côté serveur (ne peut pas utiliser projets en mémoire)
  ↓
createProjects.execute() → Prisma.create() (appel base)
  ↓
Retourne projet créé → Client met à jour via événement
```

**Inconvénients NEW** :

- ❌ Appel base Prisma pour créer (même si projets en mémoire)
- ❌ Le parsing serveur ne peut pas utiliser les projets en mémoire
- ✅ Mais : Meilleure cohérence avec l'IA, tout centralisé côté serveur

### Pourquoi OLD était plus performant ?

Dans OLD, `parseQueryWithAI` (ligne 660) reçoit :

- `localProjectsRef.current` : Tous les projets déjà en mémoire
- `uniqueCollabs` : Extraits des projets en mémoire
- `uniqueStyles` : Extraits des projets en mémoire

Donc le parsing peut :

- Vérifier si un projet existe déjà (évite doublons)
- Utiliser les collabs/styles disponibles sans appel base
- Détecter les créations sans appel serveur

Dans NEW, `processProjectCommand` (serveur) :

- Ne peut pas accéder aux projets en mémoire du client
- Doit faire des appels Prisma pour créer
- Ne peut pas utiliser les projets déjà chargés pour le parsing

### Trade-off

| Aspect           | OLD (Client)                   | NEW (Serveur)           |
| ---------------- | ------------------------------ | ----------------------- |
| **Performance**  | ✅ Meilleure (utilise mémoire) | ❌ Appels base inutiles |
| **Cohérence IA** | ⚠️ Parsing séparé              | ✅ Tout centralisé      |
| **Maintenance**  | ⚠️ Logique client/serveur      | ✅ Tout côté serveur    |
| **Appels base**  | ✅ Minimaux                    | ❌ Plus nombreux        |
