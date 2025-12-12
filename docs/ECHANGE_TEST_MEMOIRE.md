# Échange de Test - Mémoire Conversationnelle

## Test Rapide (5 minutes)

Copie-colle ces messages dans l'interface de l'assistant, un par un :

### Message 1

```
quelle est ta pizza préférée?
```

### Message 2

```
ah oui ? et quoi d'autre comme garniture
```

**Vérification** : L'assistant devrait se souvenir qu'on parlait de pizzas

### Message 3

```
tu préfères quelle saison?
```

**Vérification** : Nouveau sujet, l'assistant répond sur les saisons

### Message 4 (TEST CRITIQUE)

```
et tu préfères quelle saison finalement?
```

**Vérification** : L'assistant devrait se souvenir qu'on a déjà parlé de saisons dans le message 3

---

## Test de Limitation des Tokens (10+ messages)

Envoie ces messages conversationnels (pas de commandes de projets) pour tester la limitation :

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

**Vérification** : Après 12+ messages, les anciens messages devraient être automatiquement résumés.

---

## Vérification dans les Logs

Ouvre la console du navigateur (F12) et regarde les logs :

```
[Groq] Contexte conversationnel préparé: {
  summaryTokens: X,
  recentMessages: Y,
  totalTokens: Z
}
```

- ✅ `summaryTokens` : ~200 tokens max (résumé des anciens messages)
- ✅ `recentMessages` : max 12 messages récents gardés
- ✅ `totalTokens` : < 2000 tokens total

---

## Ce qui doit fonctionner

✅ L'assistant se souvient des sujets précédents
✅ Les tokens sont limités automatiquement
✅ Les anciens messages sont résumés si nécessaire
✅ Les commandes de projets ne polluent pas l'historique

## Ce qui ne doit PAS être dans l'historique

❌ `combien de ghost prod j'ai` → utilise lastFilters/lastResults
❌ `marque TERMINE les projets à 100%` → utilise lastFilters/lastResults
❌ `donne leurs noms` → utilise lastResults

Ces messages utilisent la pseudo-mémoire des projets, pas la mémoire conversationnelle.
