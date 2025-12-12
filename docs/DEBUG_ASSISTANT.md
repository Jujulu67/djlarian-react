# Mode Debug - Assistant

## Désactiver les logs de pattern matching

Par défaut, les logs de pattern matching sont **désactivés** pour réduire le bruit dans les logs.

## Activer le mode debug

Pour activer les logs de pattern matching (utile pour le développement), ajoutez dans votre `.env.local` :

```bash
ASSISTANT_DEBUG_PATTERNS=true
```

Une fois activé, vous verrez tous les logs de test de patterns comme :

```
[Parse Query API] 🔍 Test pattern 1: /pattern/ → match: null
[Parse Query API] 🔍 Test pattern 2: /pattern/ → match: ...
```

## Logs toujours actifs

Les logs suivants restent toujours actifs (même sans debug) :

### Logs de mémoire conversationnelle et tokens (toujours actifs pour le debug)

- ✅ **Mémoire conversationnelle** : `[Groq] Contexte conversationnel préparé` (avec tokens, messages récents, total)
- ✅ **Historique filtré** : `[Parse Query API] Historique filtré` (longueur originale vs filtrée)
- ✅ **Envoi prompt** : `[Groq] Envoi prompt...` (avec info sur l'historique)
- ✅ **Réponse Groq** : `[Groq] Réponse:` (réponse complète de l'assistant)

### Logs de détection

- ✅ Détection de notes : `[Parse Query API] ✅ Note détectée`
- ✅ Détection de filtres : `[Parse Query API] Filtre noProgress détecté`
- ✅ Erreurs et warnings importants

## Désactiver le mode debug

Pour désactiver, supprimez la variable ou mettez-la à `false` :

```bash
ASSISTANT_DEBUG_PATTERNS=false
```

Ou supprimez simplement la ligne de `.env.local`.
