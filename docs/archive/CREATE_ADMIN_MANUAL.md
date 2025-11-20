# 👤 Créer un Admin Manuellement dans la Base de Données

## 📋 Structure de la Table User

D'après votre schéma Prisma, la table `User` a les champs suivants :

```sql
- id             String (cuid) - Généré automatiquement
- name           String? (optionnel)
- email          String? (unique, requis pour la connexion)
- emailVerified  DateTime? (optionnel, mais recommandé)
- hashedPassword String? (requis pour la connexion)
- role           String? (défaut: "USER", mettre "ADMIN" pour admin)
- isVip          Boolean (défaut: false)
- createdAt      DateTime (généré automatiquement)
- updatedAt      DateTime (généré automatiquement)
```

---

## 🎯 Méthode 1 : Via Neon Console (Recommandé) ✅

### Étape 1 : Accéder à Neon

1. Allez sur [Neon Console](https://console.neon.tech/)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet
4. Cliquez sur **SQL Editor** dans le menu de gauche

### Étape 2 : Générer le Hash du Mot de Passe

Vous devez d'abord générer un hash bcrypt de votre mot de passe. Deux options :

#### Option A : Via Node.js (Local)

Créez un fichier temporaire `hash-password.js` :

```javascript
const bcrypt = require('bcryptjs');

const password = 'VotreMotDePasseSecurise123!';
const saltRounds = 12;

bcrypt.hash(password, saltRounds).then((hash) => {
  console.log('\n✅ Hash généré :');
  console.log(hash);
  console.log("\n📋 Copiez ce hash pour l'utiliser dans la requête SQL\n");
});
```

Exécutez :

```bash
node hash-password.js
```

#### Option B : Via un Outil en Ligne

⚠️ **Attention** : Utilisez uniquement des outils de confiance pour générer des hashes de mots de passe.

- [bcrypt-generator.com](https://bcrypt-generator.com/) (gratuit, côté client)
- Utilisez **12 rounds** (cost factor)

### Étape 3 : Insérer l'Utilisateur Admin

Dans le **SQL Editor** de Neon, exécutez cette requête SQL :

```sql
INSERT INTO "User" (
  "id",
  "name",
  "email",
  "emailVerified",
  "hashedPassword",
  "role",
  "isVip",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,  -- Génère un ID unique (ou utilisez cuid() si disponible)
  'Votre Nom',              -- ⚠️ MODIFIEZ
  'votre-email@example.com', -- ⚠️ MODIFIEZ
  NOW(),                     -- Email vérifié maintenant
  '$2a$12$VOTRE_HASH_BCRYPT_ICI', -- ⚠️ MODIFIEZ avec le hash généré à l'étape 2
  'ADMIN',                   -- Rôle admin
  false,                     -- isVip
  NOW(),                     -- createdAt
  NOW()                      -- updatedAt
);
```

**Exemple complet** :

```sql
INSERT INTO "User" (
  "id",
  "name",
  "email",
  "emailVerified",
  "hashedPassword",
  "role",
  "isVip",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'DJ Larian',
  'admin@djlarian.com',
  NOW(),
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYq5x5x5x5u',
  'ADMIN',
  false,
  NOW(),
  NOW()
);
```

### Étape 4 : Vérifier

Vérifiez que l'utilisateur a été créé :

```sql
SELECT id, name, email, role, "emailVerified"
FROM "User"
WHERE email = 'votre-email@example.com';
```

Vous devriez voir :

```
id    | name       | email                | role  | emailVerified
------|------------|----------------------|-------|------------------
xxx   | Votre Nom  | votre-email@...      | ADMIN | 2025-01-19 15:00:00
```

---

## 🎯 Méthode 2 : Via Vercel (Si vous avez accès à la base)

Vercel ne fournit pas d'interface SQL directe, mais vous pouvez :

1. **Récupérer la DATABASE_URL** depuis Vercel :

   - Dashboard → Projet → Settings → Environment Variables
   - Copiez `DATABASE_URL`

2. **Utiliser un client PostgreSQL** (DBeaver, pgAdmin, TablePlus, etc.) :
   - Connectez-vous avec la `DATABASE_URL`
   - Exécutez la même requête SQL que dans la Méthode 1

---

## 🔧 Script Utilitaire : Générer le Hash (Optionnel)

Si vous voulez un script simple qui génère uniquement le hash (sans créer l'utilisateur) :

Créez `scripts/hash-password.ts` :

```typescript
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'VotreMotDePasseSecurise123!';
const saltRounds = 12;

bcrypt.hash(password, saltRounds).then((hash) => {
  console.log('\n✅ Hash bcrypt généré :');
  console.log(hash);
  console.log('\n📋 Utilisez ce hash dans votre requête SQL\n');
});
```

Usage :

```bash
npx tsx scripts/hash-password.ts "MonMotDePasse123!"
```

---

## ✅ Vérification Finale

Après avoir créé l'utilisateur :

1. **Testez la connexion** sur votre site Vercel
2. **Vérifiez l'accès admin** : vous devriez pouvoir accéder à `/admin`
3. **Supprimez les scripts temporaires** si vous en avez créé

---

## 🔒 Sécurité

### Bonnes Pratiques

- ✅ Utilisez un **mot de passe fort** (minimum 12 caractères)
- ✅ **Ne partagez jamais** le hash ou le mot de passe
- ✅ **Supprimez les scripts temporaires** après utilisation
- ✅ **Vérifiez l'email** en mettant `emailVerified = NOW()`

### Après Création

- ✅ Testez la connexion immédiatement
- ✅ Changez le mot de passe si nécessaire via l'interface admin
- ✅ Supprimez les fichiers temporaires (`hash-password.js`, etc.)

---

## 🆘 Dépannage

### Erreur : "duplicate key value violates unique constraint"

L'email existe déjà. Solutions :

- Utilisez un autre email
- Ou mettez à jour l'utilisateur existant :

```sql
UPDATE "User"
SET
  "role" = 'ADMIN',
  "hashedPassword" = '$2a$12$VOTRE_NOUVEAU_HASH',
  "updatedAt" = NOW()
WHERE email = 'votre-email@example.com';
```

### Erreur : "null value in column"

Vérifiez que tous les champs requis sont remplis (notamment `email` et `hashedPassword`).

### Le hash ne fonctionne pas

- Vérifiez que vous utilisez **12 rounds** (saltRounds = 12)
- Assurez-vous que le hash commence par `$2a$12$` ou `$2b$12$`
- Copiez le hash **en entier** (il fait environ 60 caractères)

---

## 📝 Exemple Complet (Copy-Paste Ready)

1. **Générer le hash** :

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('MonMotDePasse123!', 12).then(h=>console.log(h))"
```

2. **Copier le hash** (exemple : `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYq5x5x5x5u`)

3. **Exécuter dans Neon SQL Editor** :

```sql
INSERT INTO "User" (
  "id", "name", "email", "emailVerified", "hashedPassword", "role", "isVip", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'Votre Nom',
  'votre-email@example.com',
  NOW(),
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYq5x5x5x5u',
  'ADMIN',
  false,
  NOW(),
  NOW()
);
```

**C'est tout !** 🎉
