# Rapport de Test - Assistant IA

**Date:** 11/12/2025 16:43:53

**Résumé:**

- Total de tests: 10
- Tests réussis: 6
- Tests échoués: 4

---

## Questions Simples

### Test 1.1: Question d'information

**Input:**

```
Bonjour, peux-tu me dire combien de projets j'ai ?
```

**Comportement attendu:** Réponse conversationnelle sans modification

**✅ Réponse reçue:**

```
J'ai trouvé 5 projet(s) correspondant aux critères.1. Projet test 1 (41%) - EN_COURS
2. Projet test 2 (50%) - EN_COURS
3. Projet test 3 (4%) - EN_COURS
4. Projet test 4 (3%) - EN_COURS
5. Projet test 5 (99%) - EN_COURS

```

**Durée:** 410ms
**Outil appelé:** Oui

**⚠️ Avertissements:**

- Question simple mais outil de modification appelé

**Vérifications:**

- Réponse présente: ✅
- Longueur: 219 caractères
- En français: ✅
- Temps de réponse: 410ms

---

### Test 1.6: Question avec nom utilisateur

**Input:**

```
Combien de projets a Larian67 ?
```

**Comportement attendu:** Réponse avec nombre de projets pour Larian67

**❌ Erreur:**

```
Failed to call a function. Please adjust your prompt. See 'failed_generation' for more details.
```

---

### Test 1.2: Question sur les statuts

**Input:**

```
Quels sont les statuts disponibles pour les projets ?
```

**Comportement attendu:** Liste les statuts disponibles sans modification

**✅ Réponse reçue:**

```
J'ai trouvé 4 projet(s) correspondant aux critères.1. Projet test 1 (70%) - EN_COURS
2. Projet test 2 (76%) - EN_COURS
3. Projet test 3 (38%) - EN_COURS
4. Projet test 4 (31%) - EN_COURS

```

**Durée:** 281ms
**Outil appelé:** Oui

**⚠️ Avertissements:**

- Question simple mais outil de modification appelé

**Vérifications:**

- Réponse présente: ✅
- Longueur: 187 caractères
- En français: ✅
- Temps de réponse: 281ms

---

### Test 1.3: Salutation simple

**Input:**

```
Bonjour
```

**Comportement attendu:** Réponse amicale et conversationnelle

**✅ Réponse reçue:**

```
Bienvenue ! Comment puis-je vous aider aujourd'hui ? Vous avez besoin de renseignements sur un fonctionnement spécifique ou souhaitez-vous utiliser certains outils pour récupérer des informations ?
```

**Durée:** 291ms
**Outil appelé:** Non

**Vérifications:**

- Réponse présente: ✅
- Longueur: 197 caractères
- En français: ⚠️
- Temps de réponse: 291ms

---

### Test 1.4: Question avec date relative

**Input:**

```
Quels projets ont une deadline demain ?
```

**Comportement attendu:** Réponse informative sans modification

**✅ Réponse reçue:**

```
J'ai trouvé 2 projet(s) correspondant aux critères.1. Projet test 1 (92%) - EN_COURS
2. Projet test 2 (13%) - EN_COURS

```

**Durée:** 389ms
**Outil appelé:** Oui

**⚠️ Avertissements:**

- Question simple mais outil de modification appelé

**Vérifications:**

- Réponse présente: ✅
- Longueur: 119 caractères
- En français: ✅
- Temps de réponse: 389ms

---

### Test 1.5: Question sur la progression

**Input:**

```
Combien de projets sont à plus de 50% de progression ?
```

**Comportement attendu:** Réponse avec nombre de projets sans modification

**✅ Réponse reçue:**

```
J'ai trouvé 5 projet(s) correspondant aux critères.1. Projet test 1 (23%) - EN_COURS
2. Projet test 2 (40%) - EN_COURS
3. Projet test 3 (30%) - EN_COURS
4. Projet test 4 (69%) - EN_COURS
5. Projet test 5 (74%) - EN_COURS

```

**Durée:** 327ms
**Outil appelé:** Oui

**⚠️ Avertissements:**

- Question simple mais outil de modification appelé

**Vérifications:**

- Réponse présente: ✅
- Longueur: 221 caractères
- En français: ✅
- Temps de réponse: 327ms

---

## Commandes de Modification - Deadlines

### Test 2.1: Déplacer deadline avec filtre de progression

**Input:**

```
Déplace la deadline à demain pour les projets finis à 80%
```

**Comportement attendu:** Modifie les deadlines des projets à 80%+

**✅ Réponse reçue:**

```
J'ai trouvé 3 projet(s) correspondant aux critères.1. Projet test 1 (64%) - EN_COURS
2. Projet test 2 (73%) - EN_COURS
3. Projet test 3 (66%) - EN_COURS

```

**Durée:** 321ms
**Outil appelé:** Oui

**Vérifications:**

- Réponse présente: ✅
- Longueur: 153 caractères
- En français: ✅
- Temps de réponse: 321ms

---

### Test 2.2: Deadline avec date relative "semaine prochaine"

**Input:**

```
Déplace la deadline à la semaine prochaine pour tous les projets
```

**Comportement attendu:** Convertit "semaine prochaine" et modifie tous les projets

**❌ Erreur:**

```
tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'deadline', 'progression', 'status' not allowed]
```

---

## Commandes de Modification - Statuts

### Test 3.1: Marquer comme TERMINE

**Input:**

```
Marque comme TERMINE les projets à 100%
```

**Comportement attendu:** Change le statut en TERMINE pour les projets à 100%

**❌ Erreur:**

```
tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'statut', 'progression' not allowed]
```

---

### Test 3.2: Changer statut en EN_COURS

**Input:**

```
Change le statut en EN_COURS pour les projets à 50%
```

**Comportement attendu:** Change le statut en EN_COURS pour les projets à 50%

**❌ Erreur:**

```
tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'progression', 'statut' not allowed]
```

---

## Analyse Globale

### Problèmes Critiques

1. Erreur lors de l'appel: Failed to call a function. Please adjust your prompt. See 'failed_generation' for more details.
2. Erreur lors de l'appel: tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'deadline', 'progression', 'status' not allowed]
3. Erreur lors de l'appel: tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'statut', 'progression' not allowed]
4. Erreur lors de l'appel: tool call validation failed: parameters for tool updateProjects did not match schema: errors: [additionalProperties 'progression', 'statut' not allowed]

### Avertissements

1. Question simple mais outil de modification appelé
2. Question simple mais outil de modification appelé
3. Question simple mais outil de modification appelé
4. Question simple mais outil de modification appelé

### Statistiques

- Temps de réponse moyen: 326ms
- Taux de succès: 60%
