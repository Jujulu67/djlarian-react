# 🗄️ Configuration Base de Données Locale (SQLite)

## ✅ Solution : SQLite pour le Développement Local

Pour le développement local, vous pouvez utiliser **SQLite** (fichier local) au lieu de Neon. C'est plus simple et vous gardez vos données de test séparées de la production.

## 🚀 Installation Rapide

### Option 1 : Script Automatique (Recommandé)

```bash
npm run db:setup:local
```

Ce script va :

1. **Sauvegarder** votre configuration PostgreSQL actuelle
2. Modifier `prisma/schema.prisma` pour utiliser SQLite
3. Créer un fichier `.env.local` avec `DATABASE_URL` SQLite
4. **Préserver** les données existantes si une base SQLite existe déjà
5. Appliquer les migrations
6. Générer le client Prisma

**⚠️ Important** : Le script préserve automatiquement :

- Votre schema PostgreSQL (dans `prisma/schema.prisma.postgresql.backup`)
- Votre ancienne `DATABASE_URL` (dans `.env.local.backup`)
- Vos données SQLite existantes (si `prisma/dev.db` existe déjà)

### Option 2 : Configuration Manuelle

1. **Modifier `prisma/schema.prisma`** :

   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Mettre à jour `.env.local`** :

   ```env
   # Base de données locale (SQLite)
   DATABASE_URL="file:./dev.db"
   ```

3. **Appliquer les migrations** :

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Vérifier** :
   ```bash
   npx prisma studio
   ```

---

## 🔄 Basculement entre SQLite (dev) et PostgreSQL (prod)

### Pour le Développement Local (SQLite)

```bash
npm run db:local
```

### Pour la Production (PostgreSQL/Neon)

```bash
npm run db:production
```

Ces scripts modifient automatiquement `prisma/schema.prisma` et régénèrent le client Prisma.

---

## 📝 Notes Importantes

### Différences SQLite vs PostgreSQL

1. **Types de données** :
   - SQLite n'a pas de type `DateTime` natif → Prisma le gère automatiquement
   - SQLite n'a pas de type `Json` natif → Prisma le gère automatiquement
   - Les UUIDs sont stockés comme `TEXT` en SQLite

2. **Fonctionnalités** :
   - SQLite supporte la plupart des fonctionnalités Prisma
   - Les migrations fonctionnent de la même manière
   - Prisma Studio fonctionne identiquement

3. **Performance** :
   - SQLite est très rapide pour le développement local
   - Parfait pour les tests et le développement
   - Pas adapté pour la production (concurrence limitée)

### Fichier de Base de Données

Le fichier `dev.db` sera créé dans le dossier `prisma/` :

```
prisma/
  ├── dev.db          # Base de données SQLite (local)
  ├── migrations/     # Migrations Prisma
  └── schema.prisma   # Schéma Prisma
```

**⚠️ Important** : Le fichier `dev.db` est dans `.gitignore` et ne sera **pas commité**.

---

## 🧪 Tester la Configuration

1. **Démarrer l'application** :

   ```bash
   npm run dev
   ```

2. **Ouvrir Prisma Studio** :

   ```bash
   npx prisma studio
   ```

   - Cela ouvrira http://localhost:5555
   - Vous verrez vos tables avec des données vides (ou vos données de test)

3. **Créer un utilisateur de test** :
   - Via l'interface d'inscription de l'app
   - Ou via Prisma Studio directement

---

## 🔄 Migrer les Données

### De Neon vers SQLite Local

Si vous voulez copier certaines données de production vers votre base locale :

1. **Exporter depuis Neon** (via Prisma Studio ou SQL) :

   ```bash
   # Se connecter à Neon
   DATABASE_URL="postgresql://..." npx prisma studio
   ```

2. **Importer dans SQLite** :
   - Ouvrir Prisma Studio avec SQLite
   - Copier-coller les données manuellement
   - Ou utiliser un script de migration

### De SQLite vers Neon

Généralement, vous n'avez pas besoin de migrer de SQLite vers Neon. Les migrations Prisma s'appliquent automatiquement sur les deux.

---

## 🆘 Dépannage

### Erreur : "SQLite doesn't support this type"

Si vous avez une erreur de type, vérifiez que votre `schema.prisma` utilise bien `provider = "sqlite"`.

### Erreur : "Database file not found"

Le fichier `dev.db` sera créé automatiquement lors de la première migration. Si l'erreur persiste :

```bash
npx prisma migrate dev
```

### Je veux réinitialiser la base locale

```bash
# Supprimer le fichier de base
rm prisma/dev.db

# Réappliquer les migrations
npx prisma migrate dev
```

### Je veux utiliser PostgreSQL local au lieu de SQLite

Si vous préférez PostgreSQL local (via Docker) :

1. **Démarrer PostgreSQL avec Docker** :

   ```bash
   docker run --name larian-postgres -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=larian -p 5432:5432 -d postgres:17
   ```

2. **Mettre à jour `.env.local`** :

   ```env
   DATABASE_URL="postgresql://postgres:dev@localhost:5432/larian"
   ```

3. **Modifier `prisma/schema.prisma`** :

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

4. **Appliquer les migrations** :
   ```bash
   npx prisma migrate dev
   ```

---

## ✅ Avantages de SQLite pour le Dev

- ✅ **Rapide** : Pas besoin de serveur de base de données
- ✅ **Simple** : Un seul fichier, facile à gérer
- ✅ **Isolé** : Vos données de test ne touchent pas la production
- ✅ **Portable** : Vous pouvez copier `dev.db` facilement
- ✅ **Gratuit** : Pas de limite de connexions ou de coûts

---

## 📋 Checklist

- [ ] Script `npm run db:setup:local` créé
- [ ] `.env.local` configuré avec SQLite
- [ ] `prisma/schema.prisma` modifié pour SQLite
- [ ] Migrations appliquées
- [ ] Client Prisma généré
- [ ] Prisma Studio fonctionne
- [ ] Application démarre correctement
