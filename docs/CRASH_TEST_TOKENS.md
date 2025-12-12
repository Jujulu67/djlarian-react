# Crash Test - Limitation des Tokens

## Test Rapide (5 minutes)

Copie-colle ces messages un par un dans l'interface pour déclencher le résumé automatique :

```
Salut !
Comment ça va ?
Tu aimes la musique ?
Quel est ton style préféré ?
Et tu préfères le rock ou le jazz ?
C'est quoi ta couleur préférée ?
Et pour les films, tu préfères quoi ?
Tu regardes beaucoup de séries ?
Quel est ton livre préféré ?
Tu préfères lire ou regarder des films ?
Et pour les vacances, tu préfères la mer ou la montagne ?
Tu aimes voyager ?
Quel pays aimerais-tu visiter ?
Et tu parles plusieurs langues ?
Quelle est ta langue préférée ?
Tu aimes cuisiner ?
Quel est ton plat préféré ?
Tu préfères le sucré ou le salé ?
Et pour le sport, tu pratiques quoi ?
Tu préfères le foot ou le basket ?
Et pour les animaux, tu préfères les chats ou les chiens ?
Tu as des animaux de compagnie ?
Et pour les saisons, tu préfères quelle saison?
Tu préfères l'été ou l'hiver?
```

## Vérification dans les Logs

À partir du **message 13**, ouvre la console (F12) et vérifie :

```javascript
[Groq] Contexte conversationnel préparé: {
  summaryTokens: X,      // ← Doit être > 0
  recentMessages: Y,     // ← Doit être 12 max
  totalTokens: Z         // ← Doit être < 2000
}
```

## Test de Mémoire avec Résumé

**Message 25** (retour sur un sujet très ancien) :

```
et pour la musique, tu préfères toujours le même style?
```

✅ **Vérification** : L'assistant doit se souvenir qu'on a parlé de musique au début (messages 3-5), même si c'est dans le résumé maintenant.

## Résultats Attendus

- ✅ `summaryTokens` > 0 à partir du message 13
- ✅ `recentMessages` = 12 (max)
- ✅ `totalTokens` < 2000
- ✅ L'assistant se souvient des sujets anciens via le résumé
- ✅ Les réponses restent cohérentes
