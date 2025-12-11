# Batterie de tests pour l'assistant - Questions conversationnelles vs commandes

## Questions générales (doivent appeler Groq, pas parser)

Ces questions ne doivent PAS déclencher le parseur, mais appeler Groq pour une réponse conversationnelle.

### Salutations et questions générales

1. `bonjour comment vas tu`
2. `salut ça va?`
3. `hey comment ça va?`
4. `hello how are you?`
5. `comment cuire une pizza?`
6. `what's the weather like?`
7. `c'est quoi la capitale de la France?`
8. `dis moi une blague`
9. `raconte moi une histoire`

### Questions conversationnelles sur les projets (doivent appeler Groq)

10. `ok et concernant nos projets? Faut qu'on cook!`
11. `ça fait une belle liste t'en penses quoi?`
12. `et nos projets alors?`
13. `alors pour nos projets?`
14. `qu'est-ce que tu en penses de nos projets?`
15. `t'en penses quoi de cette liste?`
16. `c'est pas mal non?`
17. `ça fait beaucoup de projets tu trouves pas?`
18. `on a beaucoup bossé hein?`
19. `et maintenant on fait quoi?`

### Questions d'opinion/commentaires

20. `c'est cool non?`
21. `tu penses quoi?`
22. `qu'est-ce que tu en penses?`
23. `t'en penses quoi?`
24. `what do you think?`
25. `c'est bien fait non?`
26. `ça te plaît?`

## Vraies commandes (doivent parser, pas appeler Groq)

Ces questions doivent déclencher le parseur et retourner des résultats.

### Commandes de liste

27. `liste moi les projets en cours`
28. `liste mes projets`
29. `montre moi tous les projets`
30. `affiche les projets terminés`
31. `list my projects`
32. `show me all projects`
33. `quels sont mes projets?`
34. `donne moi la liste des projets`

### Commandes de comptage

35. `combien de projets j'ai?`
36. `combien de projets sous les 70%?`
37. `nombre de projets terminés`
38. `how many projects do I have?`
39. `count projects under 50%`
40. `total de ghost prod`

### Commandes avec filtres

41. `liste mes ghost prod`
42. `projets terminés`
43. `projets en cours`
44. `projets sous les 70%`
45. `projets avec collab X`
46. `projets en drum and bass`
47. `ghost production`
48. `projets annulés`
49. `projets archivés`
50. `projets à rework`

### Commandes de création

51. `ajoute un projet Test`
52. `créer projet Nouveau`
53. `nouveau projet Mon Projet`
54. `add project Test`
55. `create new project`

## Cas limites (à tester attentivement)

56. `liste` (seul mot, doit parser ou conversationnel?)
57. `projets` (seul mot, doit parser ou conversationnel?)
58. `combien` (seul mot, doit parser ou conversationnel?)
59. `ok liste` (début conversationnel + commande)
60. `alors combien de projets?` (début conversationnel + vraie commande)
61. `et liste moi les projets` (début conversationnel + vraie commande)
62. `dis moi combien de projets j'ai` (début conversationnel + vraie commande)

## Questions mixtes (conversation + mention projets)

63. `on a combien de projets déjà?` (conversationnel mais avec "combien")
64. `et nos projets, on en a combien?` (conversationnel mais avec "combien")
65. `c'est quoi nos projets?` (conversationnel mais mention projets)

## Questions pièges (tricky) - Test des limites

66. `et liste moi les projets` (début conversationnel + commande claire)
67. `alors combien de projets?` (début conversationnel + vraie commande)
68. `dis moi combien de projets j'ai` (début conversationnel + vraie commande)
69. `quels sont tes projets dans la vie?` (question sur l'assistant, pas les projets musicaux)
70. `et liste moi les films préférés de macron` (verbe d'action mais pas lié aux projets)
71. `montre moi tes projets` (verbe d'action + possessif 2e personne)
72. `combien de projets tu as?` (question sur l'assistant, pas l'utilisateur)
73. `liste les projets de toi` (verbe d'action + possessif 2e personne)
74. `quels projets tu gères?` (question sur l'assistant)
75. `montre tes projets musicaux` (verbe d'action + possessif 2e personne + mention musique)
76. `combien de projets sans avancement tu as?` (question sur l'assistant avec filtre)
77. `liste tes projets terminés` (verbe d'action + possessif 2e personne + statut)
78. `quels sont les projets que tu gères?` (question sur l'assistant)
79. `montre moi tous tes projets` (verbe d'action + possessif 2e personne + "tous")
80. `combien de projets musicaux tu as en cours?` (question sur l'assistant avec statut)

## Instructions de test

Pour chaque question :

1. Vérifier si elle déclenche le parseur (`understood: true`) ou appelle Groq (`understood: false`)
2. Vérifier que la réponse est appropriée
3. Noter les cas qui ne fonctionnent pas comme attendu

### Résultats attendus

**Questions générales (1-26)** : `understood: false` → Appel Groq
**Vraies commandes (27-55)** : `understood: true` → Parse et retourne résultats
**Cas limites (56-65)** : À déterminer selon le comportement souhaité

## Questions critiques - Test final

### Questions qui DOIVENT appeler Groq (conversationnelles)

81. `quels sont tes projets dans la vie?` (question sur l'assistant)
82. `combien de projets tu as?` (question sur l'assistant)
83. `montre moi tes projets` (possessif 2e personne)
84. `liste tes projets terminés` (possessif 2e personne + filtre)
85. `quels sont les projets que tu gères?` (question sur l'assistant)
86. `combien de projets sans avancement tu as?` (question sur l'assistant + filtre)
87. `et liste moi les films préférés de macron` (verbe d'action mais pas lié aux projets)
88. `quels projets tu gères?` (question sur l'assistant)
89. `montre tes projets musicaux` (possessif 2e personne)
90. `liste les projets de toi` (possessif 2e personne)

### Questions qui DOIVENT parser (vraies commandes)

91. `liste mes projets` (possessif 1re personne = commande)
92. `combien de projets j'ai?` (possessif 1re personne = commande)
93. `montre moi mes projets terminés` (possessif 1re personne + filtre = commande)
94. `quels sont mes projets en cours?` (possessif 1re personne + filtre = commande)
95. `liste les projets terminés` (pas de possessif = commande sur les projets de l'utilisateur)
96. `combien de projets sans avancement?` (pas de possessif = commande)
97. `et liste moi les projets` (début conversationnel mais commande claire)
98. `alors combien de projets?` (début conversationnel mais commande claire)
99. `dis moi combien de projets j'ai` (début conversationnel mais commande claire)
100.  `montre moi tous mes projets` (possessif 1re personne = commande)
