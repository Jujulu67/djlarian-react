# Patch: Correction du redémarrage automatique après DB switch

## 🔍 Diagnostic (Cause racine)

### Problème 1: Port 3000 reste occupé

**Cause**:

- `fuser` n'est pas disponible sur macOS (ou syntaxe incompatible)
- Les processus Next.js/Turbopack créent des processus enfants qui survivent au `kill` du parent
- Le script tuait le PID stocké mais pas le process group complet

### Problème 2: Lock `.next/dev/lock` revient

**Cause**:

- Le lock était supprimé AVANT que les processus Next.js soient complètement arrêtés
- Un processus zombie pouvait recréer le lock immédiatement après sa suppression
- Pas d'attente garantie que tous les processus soient morts

### Problème 3: Prisma P1001 (DB non joignable)

**Cause**:

- Le script vérifiait Postgres healthy uniquement au premier lancement
- Lors des redémarrages déclenchés par switch, aucune vérification n'était faite
- Next.js démarrait avant que Postgres soit prêt à accepter des connexions

### Problème 4: Redémarrages concurrents

**Cause**:

- Pas de mutex/lockfile pour empêcher plusieurs redémarrages simultanés
- Si plusieurs switchs DB étaient déclenchés rapidement, plusieurs redémarrages pouvaient s'empiler

## ✅ Corrections apportées

### 1. Fonction `kill_port()` cross-platform

- Utilise `lsof` (disponible sur macOS et Linux) comme méthode principale
- Fallback vers `fuser` sur Linux si disponible
- Tentatives gracieuses (SIGTERM) puis forcées (SIGKILL)
- Retourne un code d'erreur pour indiquer le succès/échec

### 2. Fonction `kill_process_group()`

- Tue le process group complet au lieu du PID seul
- Utilise `kill -TERM -$pgid` pour tuer tout le groupe gracieusement
- Fallback vers `pkill -P` si le PGID n'est pas disponible
- Attend que le processus soit vraiment mort avec `wait_process_dead()`

### 3. Fonction `wait_process_dead()`

- Vérifie que le processus ET tous ses enfants sont morts
- Timeout configurable pour éviter les attentes infinies
- Utilisée après chaque kill pour garantir l'arrêt complet

### 4. Fonction `wait_postgres_ready()`

- Vérifie que Postgres est healthy ET joignable (test de connexion réel)
- Utilise `psql` si disponible, sinon Node.js avec `pg`
- Appelée AVANT chaque redémarrage de Next.js
- Timeout configurable (15 secondes par défaut lors des redémarrages)

### 5. Mutex pour redémarrages concurrents

- Fichier `.restart-server.lock` avec PID du processus en cours
- Vérification avant chaque redémarrage
- Nettoyage automatique des lock files orphelins

### 6. Ordre d'opérations corrigé

**AVANT**:

1. Tuer processus
2. Supprimer lock
3. Libérer ports
4. Redémarrer

**APRÈS**:

1. Tuer processus (avec process group)
2. Libérer ports (avec vérification)
3. Attendre que tout soit mort
4. Supprimer lock (maintenant sûr)
5. Vérifier Postgres ready
6. Redémarrer

### 7. Amélioration du lancement Next.js

- Tentative d'utiliser `setsid` pour créer un nouveau process group
- Fallback vers subshell si `setsid` n'est pas disponible
- Log du PGID pour debug

## 📝 Modifications détaillées

### Fichier: `scripts/start-dev-with-auto-restart.sh`

#### Ajouts:

- `RESTART_LOCK_FILE=".restart-server.lock"` (ligne ~11)
- Fonction `kill_port(port, max_attempts)` (lignes ~15-60)
- Fonction `wait_process_dead(pid, max_wait)` (lignes ~62-80)
- Fonction `kill_process_group(pid, graceful_wait, force_wait)` (lignes ~82-120)
- Fonction `wait_postgres_ready(max_wait, wait_interval)` (lignes ~272-310)
- Vérification mutex dans la boucle de surveillance (lignes ~430-445)
- Appel à `wait_postgres_ready()` avant redémarrage (lignes ~570-580)

#### Modifications:

- `start_postgres()`: Utilise maintenant `wait_postgres_ready()` pour vérifier la connexion réelle
- `start_server()`: Lance Next.js dans un nouveau process group si possible
- Section de nettoyage: Utilise `kill_process_group()` et `kill_port()`
- Section de redémarrage: Ordre corrigé, vérification Postgres ajoutée
- `cleanup()`: Nettoie aussi `RESTART_LOCK_FILE`

## 🧪 Validation

### Étapes de test:

1. Lancer `npm run dev:auto`
2. Aller sur `/admin/configuration`
3. Déclencher plusieurs switchs DB (prod → local → prod → local)
4. Vérifier dans les logs:
   - ✅ Pas d'erreur "Unable to acquire lock"
   - ✅ Pas d'erreur "Port 3000 is in use"
   - ✅ Pas d'erreur Prisma P1001
   - ✅ Messages "Port X libéré" et "PostgreSQL est prêt et joignable"

### Logs attendus (exemple):

```
🔄 Signal de redémarrage détecté...
   Arrêt du serveur actuel (PID: 12345)...
   Nettoyage des processus Next.js restants...
   Libération des ports 3000, 3001 et 3002...
      ✅ Port 3000 libéré
      ✅ Port 3001 libéré
      ✅ Port 3002 libéré
   Attente que les processus soient complètement arrêtés...
   Suppression du verrou Next.js...
      ✅ Verrou supprimé
   Vérification que PostgreSQL est prêt...
   ⏳ Vérification que PostgreSQL est prêt...
   ✅ PostgreSQL est prêt et joignable
🚀 Démarrage du serveur Next.js...
   Serveur démarré (PID: 12346, PGID: 12346)
```

## 🔧 Compatibilité

- ✅ macOS (testé avec `lsof`)
- ✅ Linux (utilise `lsof` en priorité, `fuser` en fallback)
- ✅ Compatible avec Next.js 16.0.7 + Turbopack
- ✅ Compatible avec Prisma 7.1.0

## 📌 Notes importantes

1. **Process Group**: Sur macOS, `setsid` n'est pas toujours disponible. Le script utilise un subshell comme fallback, ce qui fonctionne mais ne garantit pas un nouveau process group. Le `kill_process_group()` gère ce cas.

2. **Ports multiples**: Le script libère 3000, 3001, 3002 pour gérer les cas où Next.js bascule automatiquement sur un port disponible.

3. **Timeout Postgres**: 15 secondes par défaut lors des redémarrages (vs 30 au premier lancement). Si Postgres n'est pas prêt, le script tente de le redémarrer puis continue quand même.

4. **Lock file orphelin**: Le script vérifie que le PID dans le lock file existe encore. Si non, il supprime le lock (processus mort).

## 🚀 Prochaines améliorations possibles (bonus)

- [ ] Ajouter retries/backoff dans Prisma client pour gérer les fenêtres de restart
- [ ] Logger les PIDs tués pour chaque port (debug)
- [ ] Option pour éviter le restart complet en rendant Prisma instanciable avec URL dynamique
