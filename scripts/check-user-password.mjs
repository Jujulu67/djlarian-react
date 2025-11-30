#!/usr/bin/env node

/**
 * Script pour vérifier si un utilisateur a un mot de passe et des comptes OAuth
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function checkUser(email) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        hashedPassword: true,
        role: true,
        createdAt: true,
        Account: {
          select: {
            id: true,
            provider: true,
            type: true,
            providerAccountId: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ Utilisateur non trouvé pour l'email: ${email}`);
      return;
    }

    console.log('\n📋 Informations utilisateur:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nom: ${user.name || 'N/A'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role || 'N/A'}`);
    console.log(`   Créé le: ${user.createdAt.toISOString()}`);
    
    console.log(`\n🔐 Mot de passe:`);
    if (user.hashedPassword) {
      console.log(`   ✅ Mot de passe défini (hash: ${user.hashedPassword.substring(0, 20)}...)`);
    } else {
      console.log(`   ❌ Aucun mot de passe défini`);
    }

    console.log(`\n🔗 Comptes OAuth (${user.Account.length}):`);
    if (user.Account.length === 0) {
      console.log(`   Aucun compte OAuth lié`);
    } else {
      user.Account.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.provider} (${account.type})`);
        console.log(`      ID: ${account.id}`);
        console.log(`      Provider Account ID: ${account.providerAccountId}`);
      });
    }

    // Vérifier la sécurité
    const oauthAccounts = user.Account.filter((acc) => acc.type === 'oauth');
    const hasPassword = !!user.hashedPassword;
    const canUnlink = oauthAccounts.length > 1 || hasPassword;

    console.log(`\n🔒 État de sécurité:`);
    if (canUnlink) {
      console.log(`   ✅ L'utilisateur peut désassocier ses comptes OAuth`);
      if (oauthAccounts.length === 1 && hasPassword) {
        console.log(`   ⚠️  C'est le dernier compte OAuth, mais un mot de passe existe`);
      } else if (oauthAccounts.length > 1) {
        console.log(`   ℹ️  Plusieurs comptes OAuth disponibles`);
      }
    } else {
      console.log(`   ⚠️  ATTENTION: L'utilisateur ne peut pas désassocier son dernier compte OAuth`);
      console.log(`      (Aucun mot de passe défini)`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'juan.zeiher@viacesi.fr';
checkUser(email);

