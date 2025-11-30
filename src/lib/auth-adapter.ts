import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
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
      if (!baseAdapter.getUserByEmail) {
        return null;
      }
      return baseAdapter.getUserByEmail(email);
    },
    async createUser(user) {
      // Si l'utilisateur a un email, vérifier s'il existe déjà
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // Si un utilisateur existe déjà avec cet email, retourner l'utilisateur existant
        // NextAuth liera automatiquement le compte OAuth à cet utilisateur via linkAccount
        if (existingUser) {
          // Convertir en AdapterUser (sans Account)
          const { Account, ...adapterUser } = existingUser as typeof existingUser & {
            Account?: unknown[];
          };
          return adapterUser as Awaited<ReturnType<NonNullable<Adapter['createUser']>>>;
        }
      }

      // Sinon, créer un nouvel utilisateur normalement
      if (!baseAdapter.createUser) {
        throw new Error('createUser is not available in baseAdapter');
      }
      return baseAdapter.createUser(user);
    },
    async linkAccount(account): Promise<AdapterAccount | null | undefined> {
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
        return existingAccount as AdapterAccount;
      }

      // Le userId devrait déjà être défini par createUser
      // Si createUser a retourné un utilisateur existant, le userId sera correct

      // Créer le compte normalement
      if (!baseAdapter.linkAccount) {
        throw new Error('linkAccount is not available in baseAdapter');
      }
      const result = await baseAdapter.linkAccount(account);
      // S'assurer que le type de retour est cohérent
      return result ?? null;
    },
  };
}
