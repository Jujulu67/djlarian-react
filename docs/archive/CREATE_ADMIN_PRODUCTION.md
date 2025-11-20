# 👤 Créer un Compte Admin en Production

## 🎯 Options Disponibles

Vous avez plusieurs façons de créer un compte admin en production :

- **Option 0 (Manuelle)** : Ajouter directement dans la base via Neon Console (voir `CREATE_ADMIN_MANUAL.md`) ✅ **Recommandé si vous voulez éviter les scripts**
- **Option 1** : Script local avec DATABASE_URL (ci-dessous)
- **Option 2** : Promouvoir un utilisateur existant
- **Option 3** : Route API temporaire

---

## Option 1 : Script Local avec DATABASE_URL de Production (Recommandé) ✅

### Étape 1 : Le Script est Prêt !

Le script `scripts/create-admin.ts` a été amélioré et est prêt à l'emploi. Il :

- ✅ Vérifie si l'utilisateur existe déjà
- ✅ Crée un nouvel admin ou promouvoit un utilisateur existant
- ✅ Gère les erreurs proprement
- ✅ Utilise des variables d'environnement pour la sécurité

### Étape 2 : Exécuter le Script avec DATABASE_URL de Production

```bash
# Utiliser la DATABASE_URL de production depuis Vercel
# Remplacez les valeurs entre guillemets
DATABASE_URL="votre-database-url-de-vercel" \
ADMIN_EMAIL="votre-email@example.com" \
ADMIN_PASSWORD="VotreMotDePasseSecurise123!" \
ADMIN_NAME="Votre Nom" \
npx tsx scripts/create-admin.ts
```

**Où trouver la DATABASE_URL** :

1. Dashboard Vercel → Votre projet → **Settings** → **Environment Variables**
2. Copiez la valeur de `DATABASE_URL`
3. Utilisez-la dans la commande ci-dessus

**Note** : Si `tsx` n'est pas installé, il sera installé automatiquement via `npx`.

### Étape 3 : Vérifier

Testez la connexion sur votre site Vercel :

- Allez sur `https://votre-projet.vercel.app`
- Connectez-vous avec l'email et mot de passe que vous avez créés
- Vous devriez avoir accès au panel admin

---

## Option 2 : Via l'Interface Admin (Si vous avez déjà un compte)

Si vous avez déjà un compte utilisateur (même sans rôle admin), vous pouvez le promouvoir :

### Étape 1 : Modifier le Script set-admin.ts

```typescript
// scripts/set-admin.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAdmin() {
  try {
    // ⚠️ MODIFIEZ L'EMAIL
    const email = 'votre-email@example.com';

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log('\n✅ Utilisateur promu administrateur !');
    console.log('--------------------------------');
    console.log('- Nom:', updatedUser.name);
    console.log('- Email:', updatedUser.email);
    console.log('- Nouveau rôle:', updatedUser.role);
  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error.code === 'P2025') {
      console.error("⚠️  Utilisateur non trouvé. Créez d'abord un compte via l'interface.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
```

### Étape 2 : Exécuter

```bash
DATABASE_URL="votre-database-url-de-vercel" npx tsx scripts/set-admin.ts
```

---

## Option 3 : Route API Temporaire (Alternative)

Si vous préférez créer l'admin via une route API temporaire :

### Étape 1 : Créer une Route API Temporaire

Créez `src/app/api/admin/create-first-admin/route.ts` :

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from '@/lib/bcrypt-edge';

export async function POST(request: Request) {
  try {
    // ⚠️ SÉCURITÉ : Vérifier qu'il n'y a pas déjà d'admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Un administrateur existe déjà. Utilisez le script local.' },
        { status: 403 }
      );
    }

    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || 'Admin',
        hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrateur créé avec succès',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}
```

### Étape 2 : Appeler la Route

```bash
curl -X POST https://votre-projet.vercel.app/api/admin/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre-email@example.com",
    "password": "VotreMotDePasseSecurise123!",
    "name": "Votre Nom"
  }'
```

### Étape 3 : Supprimer la Route Après Utilisation

⚠️ **Important** : Supprimez cette route après avoir créé l'admin pour des raisons de sécurité.

---

## 🔒 Sécurité

### Bonnes Pratiques

1. ✅ **Utilisez un mot de passe fort** (minimum 12 caractères, majuscules, minuscules, chiffres, symboles)
2. ✅ **Ne partagez jamais** les credentials
3. ✅ **Supprimez les routes temporaires** après utilisation
4. ✅ **Vérifiez que l'admin fonctionne** puis supprimez les scripts sensibles

### Après Création

Une fois l'admin créé :

- ✅ Testez la connexion
- ✅ Vérifiez l'accès au panel admin
- ✅ Changez le mot de passe si nécessaire via l'interface
- ✅ Supprimez les routes API temporaires si créées

---

## ✅ Recommandation

**Je recommande l'Option 1** (Script local avec DATABASE_URL) car :

- ✅ Simple et direct
- ✅ Pas besoin de créer de route API
- ✅ Contrôle total sur le processus
- ✅ Sécurisé (exécuté localement)

---

## 📝 Exemple Complet (Option 1)

```bash
# 1. Modifier scripts/create-admin.ts avec vos infos
# 2. Exécuter avec la DATABASE_URL de production
DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  npx tsx scripts/create-admin.ts

# 3. Résultat attendu :
# ✅ Administrateur créé: { id: '...', email: '...', role: 'ADMIN' }
```

---

**Une fois l'admin créé, vous pourrez vous connecter et gérer votre site !** 🎉
