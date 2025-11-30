import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import type { PrismaClient } from '@prisma/client';

/**
 * Adapter personnalisé qui étend PrismaAdapter pour permettre la liaison automatique
 * des comptes OAuth aux comptes existants avec le même email
 */
export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter;

  return {
    ...baseAdapter,
    async getUserByEmail(email) {
      // Utiliser la méthode de base pour obtenir l'utilisateur par email
      return baseAdapter.getUserByEmail(email);
    },
    async createUser(user) {
      // Si l'utilisateur a un email, vérifier s'il existe déjà
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        // Si un utilisateur existe déjà avec cet email, retourner l'utilisateur existant
        // NextAuth liera automatiquement le compte OAuth à cet utilisateur via linkAccount
        if (existingUser) {
          console.log(
            `[Auth Adapter] Utilisateur existant trouvé pour ${user.email}, liaison du compte OAuth...`
          );
          return existingUser;
        }
      }

      // Sinon, créer un nouvel utilisateur normalement
      return baseAdapter.createUser(user);
    },
    async linkAccount(account) {
      // Vérifier si un compte existe déjà avec ce provider et providerAccountId
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      });

      // Si le compte existe déjà, ne pas le créer à nouveau
      if (existingAccount) {
        console.log(
          `[Auth Adapter] Compte ${account.provider} déjà lié pour ${account.providerAccountId}`
        );
        return existingAccount;
      }

      // Le userId devrait déjà être défini par createUser
      // Si createUser a retourné un utilisateur existant, le userId sera correct
      console.log(
        `[Auth Adapter] Liaison du compte ${account.provider} à l'utilisateur ${account.userId}`
      );

      // Créer le compte normalement
      return baseAdapter.linkAccount(account);
    },
  };
}
