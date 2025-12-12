# Test de la Mémoire Conversationnelle

## Échange de test à faire dans l'interface

Voici un échange conversationnel à tester pour vérifier que la mémoire fonctionne :

### Échange 1 : Vérification de la mémoire basique

1. **Message 1 (User)** : `quelle est ta pizza préférée?`
   - L'assistant devrait répondre sur les pizzas

2. **Message 2 (User)** : `ah oui ? et quoi d'autre comme garniture`
   - L'assistant devrait se souvenir qu'on parlait de pizzas et répondre en conséquence

3. **Message 3 (User)** : `tu préfères quelle saison?`
   - Nouveau sujet, l'assistant devrait répondre sur les saisons

4. **Message 4 (User)** : `et tu préfères quelle saison finalement?`
   - **TEST CRITIQUE** : L'assistant devrait se souvenir qu'on a déjà parlé de saisons dans le message 3

### Échange 2 : Vérification de la limitation des tokens

Pour tester la limitation, envoie plusieurs messages conversationnels (pas de commandes de projets) :

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

Après 12+ messages, les anciens messages devraient être résumés automatiquement.

## Vérification dans les logs

Regarde les logs de la console pour voir :

```
[Groq] Contexte conversationnel préparé: {
  summaryTokens: X,
  recentMessages: Y,
  totalTokens: Z
}
```

- `summaryTokens` : nombre de tokens du résumé (devrait être ~200 max)
- `recentMessages` : nombre de messages récents gardés (max 12)
- `totalTokens` : total des tokens (devrait être < 2000)

## Ce qui doit fonctionner

✅ L'assistant se souvient des messages précédents dans la même conversation
✅ Les tokens sont limités (max 2000 pour l'historique)
✅ Les anciens messages sont résumés si l'historique dépasse 12 messages
✅ Les commandes de projets ne sont PAS ajoutées à l'historique conversationnel

## Ce qui ne doit PAS être dans l'historique

❌ Les requêtes de projets (ex: "combien de ghost prod j'ai")
❌ Les commandes de modification (ex: "marque TERMINE les projets à 100%")
❌ Les questions de suivi sur les projets (ex: "donne leurs noms")

Ces messages utilisent `lastFilters` / `lastResults`, pas `conversationHistory`.
