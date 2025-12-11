# Audit des Patterns de l'Assistant IA

## Champs disponibles dans le modèle Project

D'après le schéma Prisma, les champs disponibles sont :

- `name` (String) - Nom du projet
- `style` (String?) - Genre musical
- `status` (String) - Statut (EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION)
- `collab` (String?) - Collaborateurs
- `label` (String?) - Label ciblé
- `labelFinal` (String?) - Label final (si signé)
- `deadline` (DateTime?) - Date limite
- `releaseDate` (DateTime?) - Date de sortie
- `externalLink` (String?) - Lien externe (SoundCloud, Spotify, etc.)
- `progress` (Int?) - Pourcentage d'avancement (0-100)
- `note` (String?) - Note/informations

---

## Filtres disponibles (ENTRÉE - pour identifier les projets à modifier)

### ✅ Implémentés

1. **Progress (Progression)**
   - `minProgress` - Progression minimale
   - `maxProgress` - Progression maximale
   - `noProgress` - Projets sans progression
   - Patterns supportés :
     - "projets à X%"
     - "projets à X% d'avancement"
     - "projets sous les X%"
     - "projets sans avancement"
     - "de X% à Y" (filtre X, nouvelle valeur Y)

2. **Status (Statut)**
   - `status` - Statut exact
   - Patterns supportés :
     - "projets TERMINE"
     - "projets EN_COURS"
     - "projets ANNULE"
     - "projets A_REWORK"
     - "projets GHOST_PRODUCTION"

3. **Deadline**
   - `hasDeadline` - Projets avec/sans deadline
   - `deadlineDate` - Deadline à une date spécifique
   - Patterns supportés :
     - "projets avec deadline"
     - "projets sans deadline"
     - "deadline demain"
     - "deadline semaine prochaine"

4. **Collab (Collaborateur)** ✅ **AJOUTÉ DANS LES MODIFICATIONS**
   - `collab` - Collaborateur exact
   - Patterns supportés :
     - "collab avec X"
     - "en collab avec X"
     - "avec X"
   - **Note** : Maintenant supporté comme filtre dans les modifications

5. **Style** ✅ **AJOUTÉ DANS LES MODIFICATIONS**
   - `style` - Style exact
   - Patterns supportés :
     - Détection par nom de style dans la requête
   - **Note** : Maintenant supporté comme filtre dans les modifications

### ❌ Non implémentés (mais détectés comme filtres de recherche)

1. **Label**
   - Pas de filtre `label` dans `updateData`
   - Patterns possibles :
     - "projets label X"
     - "label ciblé X"

2. **LabelFinal**
   - Pas de filtre `labelFinal` dans `updateData`
   - Patterns possibles :
     - "projets label final X"
     - "signé chez X"

3. **ReleaseDate**
   - Pas de filtre `releaseDate` dans `updateData`
   - Patterns possibles :
     - "projets sortis le X"
     - "projets avec release date X"

4. **ExternalLink**
   - Pas de filtre `externalLink` dans `updateData`
   - Patterns possibles :
     - "projets avec lien X"
     - "projets SoundCloud"

5. **Name**
   - Pas de filtre `name` dans `updateData` (mais utilisé pour la recherche)
   - Patterns possibles :
     - "projet nommé X"
     - "projet X"

---

## Nouvelles valeurs disponibles (SORTIE - pour modifier les projets)

### ✅ Implémentés

1. **newProgress**
   - Patterns supportés :
     - "mets à X%"
     - "passe à X%"
     - "change à X%"
     - "modifie à X%"
     - "à X" (après un verbe de modification)
     - "de X% à Y" (nouvelle valeur Y)

2. **newStatus**
   - Patterns supportés :
     - "en TERMINE"
     - "marque TERMINE"
     - "passe en TERMINE"
     - "set to TERMINE"

3. **newDeadline**
   - Patterns supportés :
     - "deadline à demain"
     - "deadline pour semaine prochaine"
     - "déplace deadline à X"

4. **newCollab**
   - Patterns supportés :
     - "en mettant en collaborateur X"
     - "en collaborateur X"
     - "collab X"
     - "en collab avec Y à X" (nouvelle valeur X)
     - "collab avec Y à X" (nouvelle valeur X)

### ❌ Non implémentés

1. **newStyle**
   - Patterns possibles :
     - "en style X"
     - "change le style à X"
     - "passe en X" (si X est un style)

2. **newLabel**
   - Patterns possibles :
     - "label à X"
     - "change le label à X"
     - "label ciblé X"

3. **newLabelFinal**
   - Patterns possibles :
     - "label final à X"
     - "signé chez X"
     - "label final X"

4. **newReleaseDate**
   - Patterns possibles :
     - "release date à X"
     - "sortie le X"
     - "date de sortie X"

5. **newExternalLink**
   - Patterns possibles :
     - "lien à X"
     - "SoundCloud à X"
     - "external link X"

6. **newNote**
   - Patterns possibles :
     - "note à X"
     - "ajoute note X"
     - "commentaire X"

---

## Patterns de modification complexes

### ✅ Implémentés

1. **"de X% à Y"** - Filtre progression X, nouvelle valeur Y
   - Exemple : "passe les projets de 10% à 15"

2. **"en collab avec X à Y"** - Filtre collab X, nouvelle valeur Y
   - Exemple : "modifie les projets en collab avec toto à tata"

### ❌ Non implémentés

1. **"de style X à Y"** - Filtre style X, nouvelle valeur Y
   - Exemple : "change les projets de style House à Techno"

2. **"de statut X à Y"** - Filtre statut X, nouvelle valeur Y
   - Exemple : "passe les projets EN_COURS à TERMINE"

3. **"de label X à Y"** - Filtre label X, nouvelle valeur Y
   - Exemple : "modifie les projets label Spinnin à Revealed"

4. **Combinaisons multiples**
   - Exemple : "modifie les projets à 50% en collab avec X et mets le style à Y"
   - Actuellement, on peut filtrer par plusieurs critères mais pas modifier plusieurs champs en une seule commande (sauf progress + status + deadline + collab)

---

## Recommandations

### Priorité Haute

1. **Ajouter `newStyle`** - Très utilisé pour changer le style des projets
2. **Améliorer la détection de `newCollab`** - Le pattern "en collab avec X à Y" fonctionne mais pourrait être plus robuste
3. **Ajouter support pour combinaisons multiples** - Permettre de modifier plusieurs champs en une seule commande

### Priorité Moyenne

4. **Ajouter `newLabel` et `newLabelFinal`** - Utile pour gérer les labels
5. **Ajouter filtres `label`, `labelFinal`, `releaseDate`** - Pour cibler des projets spécifiques

### Priorité Basse

6. **Ajouter `newReleaseDate`** - Moins fréquent
7. **Ajouter `newExternalLink`** - Rarement modifié en batch
8. **Ajouter `newNote`** - Notes généralement ajoutées individuellement

---

## Tests à effectuer

Pour chaque pattern implémenté, tester :

- [ ] Détection correcte du filtre
- [ ] Détection correcte de la nouvelle valeur
- [ ] Confirmation affichée correctement
- [ ] Modification appliquée en base de données
- [ ] Mise à jour UI immédiate
- [ ] Animation sur les projets modifiés

---

## Exemples de patterns à supporter

### Progress

- ✅ "passe les projets sans avancement à 0%"
- ✅ "modifie les projets à 7% et mets les à 10"
- ✅ "passe les projets de 10% à 15"
- ❌ "passe les projets sous 50% à 60%" (filtre min/max, pas exact)

### Status

- ✅ "marque les projets TERMINE"
- ✅ "passe les projets EN_COURS en TERMINE"
- ❌ "passe les projets EN_COURS à TERMINE" (variante)

### Collab

- ✅ "modifie les projets en collab avec toto à tata"
- ❌ "change le collaborateur de toto à tata" (variante)
- ❌ "enlève le collaborateur toto" (supprimer collab)

### Style

- ❌ "change le style des projets House à Techno"
- ❌ "passe les projets en style Dnb"
- ❌ "modifie les projets style Basshouse à Future Bounce"

### Deadline

- ✅ "déplace la deadline à demain"
- ✅ "deadline semaine prochaine"
- ❌ "enlève la deadline" (supprimer deadline)

### Combinaisons

- ❌ "modifie les projets à 50% en collab avec X : mets le style à Y et le label à Z"
- ❌ "passe les projets EN_COURS à 100% et marque TERMINE"
