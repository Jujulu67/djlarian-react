# Phrases de test pour l'ajout de notes aux projets

## Patterns supportés

1. **Pattern "Session [nom] du jour"** : `session\s+([nom])\s+du\s+jour[,\s]+([contenu])`
2. **Pattern "Note pour [nom]"** : `note\s+pour\s+([nom])[:,\s]+([contenu])`
3. **Pattern "Ajoute une note à [nom]"** : `ajoute\s+(?:une\s+)?note\s+à\s+([nom])[:,\s]+([contenu])`
4. **Pattern "Note [nom]"** (début de phrase) : `^note\s+([nom])[:,\s]+([contenu])`
5. **Pattern direct "[nom] du jour"** : `^([nom])\s+du\s+jour[,\s]+([contenu])`

## Phrases de test - Pattern "Session [nom] du jour"

### Variations de base

- `Session magnetize du jour, j'ai refait le mix`
- `session magnetize du jour, j'ai refait le mix` (minuscules)
- `SESSION MAGNETIZE DU JOUR, J'AI FINI` (majuscules)
- `Session magnetize du jour: j'ai refait le mix` (deux-points)
- `Session magnetize du jour j'ai refait le mix` (sans ponctuation)

### Variations avec noms de projets

- `Session myproject du jour, test`
- `Session project123 du jour, test` (avec chiffres)
- `Session project_name du jour, test` (avec underscore)
- `Session my awesome project du jour, test` (avec espaces)
- `Session project name du jour, test` (nom multi-mots)

### Variations avec contenu

- `Session magnetize du jour, reste à faire améliorer le mastering et envoyer label`
- `Session magnetize du jour, j'ai terminé le mix, reste à faire mastering`
- `Session magnetize du jour, todo: mix, mastering, label`
- `Session magnetize du jour, prochaines étapes: mix puis mastering`

### Variations avec ponctuation

- `Session magnetize du jour, test` (virgule)
- `Session magnetize du jour: test` (deux-points)
- `Session magnetize du jour test` (espace)

### Cas farfelus

- `Session magnetize du jour, 🎵 j'ai fini! 🎉`
- `Session magnetize du jour, j'ai fait @#$%^&*()`
- `Session magnetize du jour, ligne1\nligne2\nligne3`
- `Session magnetize du jour, a`.repeat(500) (très long)

## Phrases de test - Pattern "Note pour [nom]"

### Variations de base

- `Note pour magnetize, j'ai refait le mix`
- `note pour magnetize, j'ai refait le mix` (minuscules)
- `NOTE POUR MAGNETIZE, J'AI FINI` (majuscules)
- `Note pour magnetize: j'ai refait le mix` (deux-points)
- `Note pour magnetize j'ai refait le mix` (sans ponctuation)

### Variations avec noms

- `Note pour myproject, test`
- `Note pour project123, test`
- `Note pour project_name, test`
- `Note pour my awesome project, test`
- `Note pour project name, test`

### Variations avec contenu

- `Note pour magnetize, reste à faire améliorer le mastering`
- `Note pour magnetize, j'ai terminé, todo: mix`
- `Note pour magnetize, prochaines étapes: mix et mastering`

## Phrases de test - Pattern "Ajoute une note à [nom]"

### Variations de base

- `Ajoute une note à magnetize, j'ai refait le mix`
- `ajoute une note à magnetize, j'ai refait le mix` (minuscules)
- `AJOUTE UNE NOTE À MAGNETIZE, J'AI FINI` (majuscules)
- `Ajoute note à magnetize, j'ai refait le mix` (sans "une")
- `ajoute note à magnetize, j'ai refait le mix` (sans "une", minuscules)
- `Ajoute une note à magnetize: j'ai refait le mix` (deux-points)
- `Ajoute note à magnetize: j'ai refait le mix` (sans "une", deux-points)

### Variations avec noms

- `Ajoute une note à myproject, test`
- `Ajoute note à project123, test`
- `Ajoute une note à project_name, test`
- `Ajoute note à my awesome project, test`

### Variations avec contenu

- `Ajoute une note à magnetize, reste à faire mix et mastering`
- `Ajoute note à magnetize, j'ai terminé, todo: label`

## Phrases de test - Pattern "Note [nom]" (début de phrase)

### Variations de base

- `Note magnetize, j'ai refait le mix`
- `note magnetize, j'ai refait le mix` (minuscules)
- `NOTE MAGNETIZE, J'AI FINI` (majuscules)
- `Note magnetize: j'ai refait le mix` (deux-points)
- `Note magnetize j'ai refait le mix` (sans ponctuation)

### Variations avec noms

- `Note myproject, test`
- `Note project123, test`
- `Note project_name, test`
- `Note my awesome project, test`

### Variations avec contenu

- `Note magnetize, reste à faire mix`
- `Note magnetize, j'ai terminé, todo: mastering`

## Phrases de test - Pattern direct "[nom] du jour"

### Variations de base

- `magnetize du jour, j'ai refait le mix`
- `MAGNETIZE du jour, J'AI FINI` (majuscules)
- `magnetize du jour: j'ai refait le mix` (deux-points)
- `magnetize du jour j'ai refait le mix` (sans ponctuation)

### Variations avec noms

- `myproject du jour, test`
- `project123 du jour, test`
- `project_name du jour, test`
- `my awesome project du jour, test`

### Variations avec contenu

- `magnetize du jour, reste à faire mix et mastering`
- `magnetize du jour, j'ai terminé, todo: label`

## Phrases qui NE DOIVENT PAS matcher

### Patterns incomplets

- `Session du jour, test` (pas de nom de projet)
- `Session magnetize, test` (sans "du jour")
- `Note pour, test` (pas de nom)
- `Ajoute note à, test` (pas de nom)
- `Note, test` (pas de nom)
- `du jour, test` (pas de nom)

### Mots communs

- `session du jour, test` (mot commun "session")
- `note du jour, test` (mot commun "note")
- `projet du jour, test` (mot commun "projet")
- `project du jour, test` (mot commun "project")
- `le du jour, test` (mot commun "le")
- `la du jour, test` (mot commun "la")
- `les du jour, test` (mot commun "les")

### Noms trop courts

- `a du jour, test` (1 caractère)
- `Note a, test` (1 caractère)
- `Session a du jour, test` (1 caractère)

### Patterns sans contenu

- `Session magnetize du jour,` (pas de contenu)
- `Note pour magnetize,` (pas de contenu)
- `magnetize du jour,` (pas de contenu)

## Phrases avec contexte supplémentaire

### Texte avant

- `Salut ! Session magnetize du jour, j'ai refait le mix`
- `Bonjour, Note pour magnetize, test`
- `Hey, magnetize du jour, j'ai fini`

### Texte après

- `Session magnetize du jour, j'ai fini. C'est cool non?`
- `Note pour magnetize, test. Et maintenant?`
- `magnetize du jour, j'ai terminé. On continue?`

### Contexte mixte

- `Salut ! Session magnetize du jour, j'ai refait le mix. C'est cool non?`
- `Bonjour, Note pour magnetize, reste à faire mix. On y va?`

## Phrases avec variations d'orthographe

### Fautes de frappe

- `Session magnetise du jour, test` (sans "d")
- `Session magnetiz du jour, test` (tronqué)
- `Session magnetize du jour, test` (espace bizarre)
- `Session MaGnEtIzE du jour, test` (mélange majuscules/minuscules)

### Variations de ponctuation

- `Session magnetize du jour... test` (points de suspension)
- `Session magnetize du jour!!! test` (points d'exclamation)
- `Session magnetize du jour - test` (tiret)
- `Session magnetize du jour; test` (point-virgule)

## Phrases avec contenu complexe

### Tâches multiples

- `Session magnetize du jour, reste à faire mix, mastering, label`
- `Session magnetize du jour, reste à faire mix et mastering puis label`
- `Session magnetize du jour, todo: mix; mastering; label`

### Contenu très long

- `Session magnetize du jour, ` + 'a'.repeat(1000)

### Contenu avec emojis

- `Session magnetize du jour, 🎵 j'ai fini! 🎉 reste à faire: mix 🎶`

### Contenu avec caractères spéciaux

- `Session magnetize du jour, j'ai fait @#$%^&*()`

### Contenu avec sauts de ligne

- `Session magnetize du jour, ligne1\nligne2\nligne3`

## Phrases avec noms de projets complexes

### Noms avec chiffres

- `Session project123 du jour, test`
- `Session project_123 du jour, test`
- `Session project 123 du jour, test`

### Noms avec underscores

- `Session project_name du jour, test`
- `Session my_project_name du jour, test`

### Noms multi-mots

- `Session my awesome project du jour, test`
- `Session project name du jour, test`
- `Session very long project name here du jour, test`

### Noms très longs

- `Session ` + 'a'.repeat(100) + ` du jour, test`

## Phrases avec variations de langage

### Français familier

- `Session magnetize du jour, j'ai refait le mix, reste à faire améliorer le mastering et envoyer label`
- `Note pour magnetize, j'ai terminé le mix, à faire: mastering`

### Français formel

- `Session magnetize du jour, j'ai effectué le mix, il reste à faire l'amélioration du mastering`

### Mélange français/anglais

- `Session magnetize du jour, j'ai fait le mix, todo: mastering, label`

## Phrases avec tâches extraites automatiquement

### Pattern "reste à faire"

- `Session magnetize du jour, reste à faire mix, mastering, label`
- `Session magnetize du jour, reste à faire: mix, mastering`
- `Session magnetize du jour, reste mix, mastering`

### Pattern "à faire"

- `Session magnetize du jour, à faire: mix, mastering`
- `Session magnetize du jour, à faire mix et mastering`

### Pattern "todo"

- `Session magnetize du jour, todo: mix, mastering`
- `Session magnetize du jour, TODO: mix, mastering`

### Pattern "prochaines étapes"

- `Session magnetize du jour, prochaines étapes: mix, mastering`
- `Session magnetize du jour, prochaine étape: mix`

### Séparateurs variés

- `Session magnetize du jour, reste à faire mix, mastering, label` (virgules)
- `Session magnetize du jour, reste à faire mix et mastering` (et)
- `Session magnetize du jour, reste à faire mix puis mastering` (puis)
- `Session magnetize du jour, reste à faire mix; mastering; label` (point-virgule)

## Phrases de test recommandées pour validation complète

### Tests essentiels (à tester en priorité)

1. `Session magnetize du jour, j'ai refait le mix, reste à faire améliorer le mastering et envoyer label`
2. `Note pour magnetize, j'ai terminé`
3. `Ajoute une note à magnetize, test`
4. `Note magnetize, test`
5. `magnetize du jour, j'ai refait le mix`

### Tests de robustesse

6. `SESSION MAGNETIZE DU JOUR, J'AI FINI` (majuscules)
7. `Session MaGnEtIzE du jour, test` (mélange)
8. `Session magnetize du jour: test` (deux-points)
9. `Session magnetize du jour test` (sans ponctuation)
10. `Session my awesome project du jour, test` (nom multi-mots)

### Tests de limites

11. `Session ab du jour, test` (nom très court - 2 caractères)
12. `Session ` + 'a'.repeat(100) + ` du jour, test` (nom très long)
13. `Session magnetize du jour, ` + 'a'.repeat(1000) (contenu très long)
14. `Session magnetize du jour, 🎵 test 🎉` (emojis)

### Tests négatifs (ne doivent pas matcher)

15. `Session du jour, test` (pas de nom)
16. `session du jour, test` (mot commun)
17. `a du jour, test` (nom trop court)
18. `Session magnetize du jour,` (pas de contenu)
