# Cas de Test - Assistant IA de Gestion de Projet

Ce document liste tous les cas de test pour vérifier la cohérence des réponses de l'assistant IA.

## 📋 Cas de Test

### 1. Questions Simples (Sans Modifications)

#### Test 1.1 : Question d'information

**Input :** `"Bonjour, peux-tu me dire combien de projets j'ai ?"`

**Attentes :**

- ✅ Réponse conversationnelle et informative
- ✅ Pas d'appel à l'outil `updateProjects`
- ✅ Pas de revalidation de page (`revalidatePath` non appelé)
- ✅ Réponse en français
- ✅ Contient le mot "projet" ou "projets"

**Exemple de réponse attendue :**

> "Vous avez actuellement X projets dans votre liste."

---

#### Test 1.2 : Question sur les statuts

**Input :** `"Quels sont les statuts disponibles pour les projets ?"`

**Attentes :**

- ✅ Liste les statuts disponibles : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE
- ✅ Pas de modification en base
- ✅ Réponse claire et structurée

---

#### Test 1.3 : Salutation simple

**Input :** `"Bonjour"`

**Attentes :**

- ✅ Réponse amicale et conversationnelle
- ✅ Pas d'erreur
- ✅ Invite l'utilisateur à poser une question ou donner une commande

---

#### Test 1.4 : Question avec date relative

**Input :** `"Quels projets ont une deadline demain ?"`

**Attentes :**

- ✅ Comprend la date relative "demain"
- ✅ Réponse informative (pas de modification)
- ✅ Mentionne les projets concernés si possible

---

#### Test 1.5 : Question sur la progression

**Input :** `"Combien de projets sont à plus de 50% de progression ?"`

**Attentes :**

- ✅ Réponse avec le nombre de projets
- ✅ Pas de modification
- ✅ Comprend le filtre de progression

---

### 2. Commandes de Modification - Deadlines

#### Test 2.1 : Déplacer deadline avec filtre de progression

**Input :** `"Déplace la deadline à demain pour les projets finis à 80%"`

**Attentes :**

- ✅ L'assistant comprend l'intention de modification
- ✅ Appelle l'outil `updateProjects` avec :
  - `minProgress: 80`
  - `newDeadline: "demain"` (converti en ISO date)
- ✅ Filtre par `userId` (sécurité)
- ✅ Retourne le nombre de projets modifiés
- ✅ Appelle `revalidatePath('/projects')`
- ✅ Message de confirmation

**Exemple de réponse attendue :**

> "Mise à jour réussie pour X projet(s)."

---

#### Test 2.2 : Deadline avec date relative "semaine prochaine"

**Input :** `"Déplace la deadline à la semaine prochaine pour tous les projets"`

**Attentes :**

- ✅ Convertit "semaine prochaine" en date ISO (date actuelle + 7 jours)
- ✅ Met à jour tous les projets de l'utilisateur
- ✅ Confirmation avec le nombre de projets

---

#### Test 2.3 : Deadline avec date ISO

**Input :** `"Déplace la deadline au 2024-12-25 pour les projets à 50%"`

**Attentes :**

- ✅ Accepte la date au format ISO (YYYY-MM-DD)
- ✅ Filtre par progression (50%)
- ✅ Met à jour correctement

---

### 3. Commandes de Modification - Statuts

#### Test 3.1 : Marquer comme TERMINE

**Input :** `"Marque comme TERMINE les projets à 100%"`

**Attentes :**

- ✅ Appelle l'outil avec :
  - `minProgress: 100`
  - `newStatus: "TERMINE"`
- ✅ Filtre par userId
- ✅ Confirmation du nombre de projets modifiés

---

#### Test 3.2 : Changer statut en EN_COURS

**Input :** `"Change le statut en EN_COURS pour les projets à 50%"`

**Attentes :**

- ✅ Utilise le statut correct : `EN_COURS`
- ✅ Filtre par progression (50%)
- ✅ Confirmation

---

#### Test 3.3 : Statut invalide

**Input :** `"Change le statut en INVALID_STATUS pour tous les projets"`

**Attentes :**

- ✅ Rejette le statut invalide
- ✅ Message d'erreur explicite
- ✅ Liste les statuts valides
- ✅ Pas de modification en base

---

### 4. Commandes de Modification - Filtres de Progression

#### Test 4.1 : Progression minimum

**Input :** `"Met à jour les projets avec au moins 75% de progression"`

**Attentes :**

- ✅ Filtre avec `progress.gte: 75`
- ✅ Applique les modifications demandées

---

#### Test 4.2 : Progression maximum

**Input :** `"Met à jour les projets avec moins de 25% de progression"`

**Attentes :**

- ✅ Filtre avec `progress.lte: 25`
- ✅ Applique les modifications

---

#### Test 4.3 : Plage de progression

**Input :** `"Met à jour les projets entre 50% et 80% de progression"`

**Attentes :**

- ✅ Filtre avec `progress.gte: 50` ET `progress.lte: 80`
- ✅ Applique les modifications

---

### 5. Sécurité

#### Test 5.1 : Filtrage par utilisateur

**Vérification :** Toutes les requêtes Prisma doivent inclure `userId` dans le `where`

**Attentes :**

- ✅ `where.userId` toujours présent
- ✅ Utilise l'ID de l'utilisateur connecté
- ✅ Pas de modification des projets d'autres utilisateurs

---

#### Test 5.2 : Authentification requise

**Input :** N'importe quelle commande sans session

**Attentes :**

- ✅ Retourne une erreur : "Vous devez être connecté"
- ✅ Pas d'appel à l'API Groq
- ✅ Pas de modification en base

---

### 6. Gestion des Erreurs

#### Test 6.1 : Erreur API Groq

**Scénario :** Clé API manquante ou invalide

**Attentes :**

- ✅ Message d'erreur clair
- ✅ Indique que la clé API doit être configurée
- ✅ Pas de crash de l'application

---

#### Test 6.2 : Aucun projet correspondant

**Input :** `"Marque comme TERMINE les projets à 200%"`

**Attentes :**

- ✅ Retourne : "Aucun projet ne correspond aux critères"
- ✅ `count: 0` dans la réponse
- ✅ Pas d'erreur

---

#### Test 6.3 : Date invalide

**Input :** `"Déplace la deadline à 'date-invalide' pour tous les projets"`

**Attentes :**

- ✅ Message d'erreur sur le format de date
- ✅ Suggère d'utiliser YYYY-MM-DD ou une date relative
- ✅ Pas de modification

---

### 7. Cohérence des Réponses

#### Test 7.1 : Réponse toujours présente

**Attentes :**

- ✅ Toute demande retourne une réponse (string non vide)
- ✅ Pas de `null` ou `undefined`
- ✅ Longueur minimale raisonnable (> 10 caractères)

---

#### Test 7.2 : Format de réponse pour modifications

**Attentes :**

- ✅ Inclut le nombre de projets modifiés
- ✅ Message de confirmation clair
- ✅ Format cohérent : "Mise à jour réussie pour X projet(s)."

---

#### Test 7.3 : Langue de réponse

**Attentes :**

- ✅ Réponses en français (ou langue de la demande)
- ✅ Pas de mélange de langues
- ✅ Vocabulaire cohérent

---

## 🔍 Checklist de Vérification

Pour chaque test, vérifier :

- [ ] La réponse est cohérente avec la demande
- [ ] La réponse est en français
- [ ] Pour les questions : pas de modification en base
- [ ] Pour les commandes : confirmation de l'action
- [ ] Pas d'erreurs techniques
- [ ] Filtrage par userId (sécurité)
- [ ] Revalidation de page après modification
- [ ] Format des dates correct (ISO ou conversion des dates relatives)
- [ ] Validation des paramètres (progression 0-100, statuts valides)

---

## 🚀 Comment Tester

1. **Démarrer le serveur :**

   ```bash
   pnpm run dev
   ```

2. **Ouvrir la page des projets :**

   ```
   http://localhost:3000/projects
   ```

3. **Ouvrir l'assistant :**
   - Cliquer sur le bouton flottant (icône Sparkles) en bas à droite

4. **Tester chaque cas :**
   - Copier-coller chaque input dans l'assistant
   - Vérifier que la réponse correspond aux attentes
   - Noter les écarts éventuels

5. **Pour les commandes de modification :**
   - ⚠️ **Tester d'abord avec UN projet de test**
   - Vérifier dans la base de données que les modifications sont correctes
   - Vérifier que seuls les projets de l'utilisateur connecté sont modifiés

---

## 📝 Notes Importantes

- Les tests de modification modifient **réellement** la base de données
- Toujours tester avec des données de test d'abord
- Vérifier que le filtrage par `userId` fonctionne correctement
- Les dates relatives sont converties automatiquement (demain, semaine prochaine, etc.)
- Les statuts doivent être exactement : `EN_COURS`, `TERMINE`, `ANNULE`, `A_REWORK`, `GHOST_PRODUCTION`, `ARCHIVE`
