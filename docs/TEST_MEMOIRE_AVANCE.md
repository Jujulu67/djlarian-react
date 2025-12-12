# Tests Avancés - Mémoire Conversationnelle

## Test Complexe : Références Croisées (15-20 minutes)

Ce test vérifie que l'assistant se souvient de plusieurs sujets et peut faire des références croisées.

### Scénario : Conversation multi-sujets

**Message 1** (Sujet A - Pizzas)

```
quelle est ta pizza préférée?
```

✅ Vérification : L'assistant répond sur les pizzas

**Message 2** (Sujet A - Suite)

```
ah oui ? et quoi d'autre comme garniture
```

✅ Vérification : L'assistant se souvient qu'on parlait de pizzas

**Message 3** (Sujet B - Saisons)

```
tu préfères quelle saison?
```

✅ Vérification : Nouveau sujet, l'assistant répond sur les saisons

**Message 4** (Sujet C - Musique)

```
quel est ton style de musique préféré?
```

✅ Vérification : Nouveau sujet, l'assistant répond sur la musique

**Message 5** (Retour Sujet A - Pizzas)

```
et pour les pizzas, tu préfères avec ou sans anchois?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir qu'on a parlé de pizzas au début

- Doit mentionner qu'on en a déjà parlé (ex: "Comme on en parlait...", "Pour revenir sur les pizzas...")
- Ne doit pas répondre comme si c'était la première fois qu'on parle de pizzas

**Message 6** (Retour Sujet B - Saisons)

```
et pour les saisons, tu préfères l'été ou l'hiver?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir qu'on a parlé de saisons

- Doit faire référence à la conversation précédente sur les saisons
- Doit mentionner sa réponse précédente (printemps) et comparer avec été/hiver

**Message 7** (Retour Sujet C - Musique)

```
et pour la musique, tu préfères le rock ou l'électro?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir qu'on a parlé de musique

- Doit faire référence à la conversation précédente sur la musique

**Message 8** (Sujet D - Films)

```
tu aimes les films?
```

✅ Vérification : Nouveau sujet

**Message 9** (Retour Sujet A - Pizzas)

```
finalement, tu préfères quelle pizza?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir de TOUTE la conversation sur les pizzas

- Doit mentionner qu'on en a déjà parlé plusieurs fois
- Doit résumer ou faire référence aux échanges précédents

**Message 10** (Retour Sujet B - Saisons)

```
et pour les saisons, tu as changé d'avis?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir de ses réponses précédentes sur les saisons

- Doit mentionner qu'on en a déjà parlé
- Doit confirmer ou nuancer sa réponse précédente

---

## Crash Test : Limitation des Tokens (20+ messages)

Ce test vérifie que le système de résumé fonctionne correctement quand il y a beaucoup de messages.

### Scénario : Conversation longue

Envoie ces messages un par un (copie-colle) :

1. `Salut !`
2. `Comment ça va ?`
3. `Tu aimes la musique ?`
4. `Quel est ton style préféré ?`
5. `Et tu préfères le rock ou le jazz ?`
6. `C'est quoi ta couleur préférée ?`
7. `Et pour les films, tu préfères quoi ?`
8. `Tu regardes beaucoup de séries ?`
9. `Quel est ton livre préféré ?`
10. `Tu préfères lire ou regarder des films ?`
11. `Et pour les vacances, tu préfères la mer ou la montagne ?`
12. `Tu aimes voyager ?`
13. `Quel pays aimerais-tu visiter ?`
14. `Et tu parles plusieurs langues ?`
15. `Quelle est ta langue préférée ?`
16. `Tu aimes cuisiner ?`
17. `Quel est ton plat préféré ?`
18. `Tu préfères le sucré ou le salé ?`
19. `Et pour le sport, tu pratiques quoi ?`
20. `Tu préfères le foot ou le basket ?`
21. `Et pour les animaux, tu préfères les chats ou les chiens ?`
22. `Tu as des animaux de compagnie ?`
23. `Et pour les saisons, tu préfères quelle saison?` ← **TEST CRITIQUE**
24. `Tu préfères l'été ou l'hiver?` ← **TEST CRITIQUE**

### Vérifications dans les logs

Ouvre la console (F12) et regarde les logs pour les messages 13+ :

```
[Groq] Contexte conversationnel préparé: {
  summaryTokens: X,  ← Doit être > 0 à partir du message 13
  recentMessages: Y, ← Doit être 12 max
  totalTokens: Z     ← Doit rester < 2000
}
```

**Vérifications attendues :**

✅ **Message 13-15** :

- `summaryTokens` devrait commencer à apparaître (> 0)
- `recentMessages` devrait être 12
- `totalTokens` devrait être < 2000

✅ **Message 16-20** :

- `summaryTokens` devrait augmenter progressivement
- `recentMessages` devrait rester à 12
- `totalTokens` devrait rester stable (< 2000)

✅ **Message 23-24** (Retour sur les saisons) :

- L'assistant devrait se souvenir qu'on a parlé de saisons dans les messages précédents
- Le résumé devrait contenir l'info sur les saisons
- L'assistant devrait faire référence à la conversation précédente

### Test de mémoire avec résumé

**Message 25** (Retour très ancien)

```
et pour la musique, tu préfères toujours le même style?
```

✅ **TEST CRITIQUE** : L'assistant doit se souvenir qu'on a parlé de musique au début (messages 3-5)

- Le résumé devrait contenir cette info
- L'assistant devrait faire référence à la conversation précédente

---

## Checklist de Validation

### Test Complexe

- [ ] L'assistant se souvient des pizzas après plusieurs messages
- [ ] L'assistant se souvient des saisons après plusieurs messages
- [ ] L'assistant se souvient de la musique après plusieurs messages
- [ ] L'assistant fait des références explicites ("Comme on en parlait...", etc.)
- [ ] L'assistant ne répond pas comme si c'était la première fois qu'on parle d'un sujet

### Crash Test Tokens

- [ ] Le résumé apparaît à partir du message 13 (`summaryTokens > 0`)
- [ ] Les messages récents restent limités à 12 (`recentMessages <= 12`)
- [ ] Les tokens totaux restent sous 2000 (`totalTokens < 2000`)
- [ ] L'assistant se souvient des sujets anciens via le résumé
- [ ] Les réponses restent cohérentes malgré le résumé

---

## Résultats Attendus

### Si tout fonctionne bien :

**Test Complexe** :

- L'assistant fait des références naturelles aux sujets précédents
- Les réponses montrent clairement qu'il se souvient
- Pas de répétition comme si c'était nouveau

**Crash Test** :

- Le résumé se déclenche automatiquement
- Les tokens restent sous contrôle
- La mémoire fonctionne même avec beaucoup de messages
- Les réponses restent contextuelles

### Si ça ne fonctionne pas :

**Problèmes possibles** :

- L'assistant ne fait pas de références → Vérifier le preprompt
- Le résumé ne se déclenche pas → Vérifier `prepareConversationContext`
- Les tokens dépassent 2000 → Vérifier la limitation
- L'assistant oublie les sujets anciens → Vérifier que le résumé contient les bonnes infos
