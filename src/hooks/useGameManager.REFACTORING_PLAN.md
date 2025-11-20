# Plan de Refactorisation - useGameManager.ts

## 📊 État Initial
- **Lignes**: 1185
- **Complexité**: Très élevée (monolithique, gestion audio + patterns + score)

## 🎯 Sections Identifiées

### 1. Constantes (lignes 5-80)
- Constantes de score (SCORE_INCREMENT, GOLDEN_SCORE, etc.)
- Constantes de jeu (PATTERN_LIFETIME, SCROLL_SPEED, etc.)
- FREQUENCY_LANES
- PRE_MAPPED_PATTERNS

### 2. Gestion Audio (lignes 128-385)
- `reconnectAudio` - Reconnexion audio
- `setupAudioAnalyser` - Configuration de l'analyseur
- `analyzeFrequencyBands` - Analyse des bandes de fréquence
- `detectBeat` - Détection de beats et calcul BPM

### 3. Gestion des Patterns (lignes 387-545)
- `generatePattern` - Génération d'un pattern
- `generateObstacles` - Génération principale des patterns
- `simpleUpdateGame` - Mise à jour simple des patterns
- Logique de création/mise à jour/suppression des patterns

### 4. Gestion du Score (lignes 643-854)
- `calculateHitAccuracy` - Calcul de la précision
- `handleCollision` - Gestion des collisions et mise à jour du score
- Logique de combo et high score

### 5. Animation Loop (lignes 547-641)
- `updateGame` - Boucle principale d'animation
- Mise à jour des positions des patterns

### 6. Contrôle du Jeu (lignes 1061-1162)
- `startGame` - Démarrage du jeu
- `endGame` - Fin du jeu

## ✅ Plan d'Extraction

### Étape 1: Extraire les constantes
- Créer `src/hooks/game/constants.ts`

### Étape 2: Créer useAudioAnalyser
- Extraire toute la logique audio
- Créer `src/hooks/game/useAudioAnalyser.ts`

### Étape 3: Créer usePatternManager
- Extraire la génération et gestion des patterns
- Créer `src/hooks/game/usePatternManager.ts`

### Étape 4: Créer useScoreManager
- Extraire la gestion du score et des collisions
- Créer `src/hooks/game/useScoreManager.ts`

### Étape 5: Refactoriser useGameManager
- Utiliser les nouveaux hooks
- Réduire à la logique de coordination

## 📋 Fichiers à Créer

1. `src/hooks/game/constants.ts` - Constantes
2. `src/hooks/game/useAudioAnalyser.ts` - Gestion audio
3. `src/hooks/game/usePatternManager.ts` - Gestion patterns
4. `src/hooks/game/useScoreManager.ts` - Gestion score
5. `src/hooks/useGameManager.refactored.ts` - Version refactorisée

