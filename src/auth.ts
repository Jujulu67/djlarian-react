import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter } from 'next-auth/adapters';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { compare as bcryptCompare } from '@/lib/bcrypt-edge';
import prisma from '@/lib/prisma';

import { authConfig } from './auth.config';

// Configuration principale avec adaptateur Prisma et Credentials
const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

// Vérifier la configuration au démarrage
if (!secret) {
  console.error('[Auth] ⚠️ NEXTAUTH_SECRET ou AUTH_SECRET non défini !');
}

const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
if (!nextAuthUrl) {
  console.error('[Auth] ⚠️ NEXTAUTH_URL ou AUTH_URL non défini !');
  console.error('[Auth] ⚠️ Ajoutez NEXTAUTH_URL=http://localhost:3000 dans votre .env.local');
}

// Adapter personnalisé minimal : comme authorize() pour credentials, retourner l'utilisateur existant
// au lieu d'en créer un nouveau si un utilisateur existe déjà avec le même email
const baseAdapter = PrismaAdapter(prisma) as Adapter;
const customAdapter: Adapter = {
  ...baseAdapter,
  async getUserByAccount({ provider, providerAccountId }) {
    // D'abord, essayer de trouver le compte via la méthode standard
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: { user: true },
    });

    // Si le compte existe, retourner l'utilisateur
    if (account?.user) {
      return account.user as Awaited<ReturnType<Adapter['getUserByAccount']>>;
    }

    // Si le compte n'existe pas, retourner null (NextAuth créera un nouveau compte)
    return null;
  },
  async getUserByEmail(email) {
    // Utiliser la méthode de base pour obtenir l'utilisateur par email
    // NextAuth utilisera cette méthode pour vérifier si un utilisateur existe
    // Si un utilisateur existe, NextAuth appellera createUser qui retournera l'utilisateur existant
    return baseAdapter.getUserByEmail(email);
  },
  async createUser(user) {
    // Si l'utilisateur a un email, vérifier s'il existe déjà (comme authorize() pour credentials)
    if (user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { Account: true },
      });

      // Si un utilisateur existe déjà avec cet email, retourner l'utilisateur existant
      // NextAuth liera automatiquement le compte OAuth à cet utilisateur via linkAccount
      if (existingUser) {
        console.log(
          `[Auth] Utilisateur existant trouvé pour ${user.email}, liaison du compte OAuth...`
        );
        return existingUser;
      }
    }

    // Si l'image OAuth est vide ou null, laisser null (comme lors d'un signup normal)
    // Sinon, accepter toutes les images OAuth (même les placeholders Google)
    // Le proxy gère maintenant correctement toutes les URLs Google
    const imageValue = user.image;

    if (
      !imageValue ||
      (typeof imageValue === 'string' && imageValue.trim() === '') ||
      imageValue === 'null' ||
      imageValue === 'undefined'
    ) {
      user.image = null;
      console.log(`[Auth] Image OAuth vide/null, définie à null (comme signup normal)`);
    } else {
      // Accepter toutes les images OAuth, même les placeholders Google
      // Le proxy les gère correctement
      console.log(`[Auth] Image OAuth reçue: ${imageValue.substring(0, 50)}...`);
    }

    // Créer un nouvel utilisateur normalement avec l'image (ou null)
    const createdUser = await baseAdapter.createUser(user);
    console.log(
      `[Auth] Utilisateur créé: ${createdUser.id}, image: ${createdUser.image ? 'URL externe' : 'null'}`
    );
    return createdUser;
  },
  async linkAccount(account) {
    // Lier le compte OAuth à l'utilisateur
    const linkedAccount = await baseAdapter.linkAccount(account);

    // Si l'utilisateur a une image dans le profil OAuth, mettre à jour l'image de l'utilisateur
    // Récupérer l'utilisateur pour vérifier s'il faut mettre à jour l'image
    if (account.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: account.userId },
          select: { image: true, name: true },
        });

        // Mettre à jour l'image si elle n'existe pas ou si elle est différente
        // L'image du profil OAuth est disponible dans le token JWT, on la mettra à jour via le callback jwt
        // Pour l'instant, on stocke juste l'info que le compte est lié
        console.log(`[Auth] Compte ${account.provider} lié à l'utilisateur ${account.userId}`);
      } catch (error) {
        console.error('[Auth] Erreur lors de la mise à jour après liaison:', error);
      }
    }

    return linkedAccount;
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: customAdapter,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[Auth] authorize - Credentials manquants');
          // Retourner null au lieu de throw pour que NextAuth retourne CredentialsSignin
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            role: true,
            image: true,
            createdAt: true,
            isVip: true,
          },
        });

        if (!user || !user.hashedPassword) {
          console.warn('[Auth] authorize - Utilisateur non trouvé ou sans mot de passe');
          // Retourner null pour que NextAuth retourne CredentialsSignin
          return null;
        }

        const isPasswordValid = await bcryptCompare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          console.warn('[Auth] authorize - Mot de passe invalide');
          // Retourner null pour que NextAuth retourne CredentialsSignin
          return null;
        }

        return {
          ...user,
          role: user.role ?? undefined,
        };
      },
    }),
  ],
  callbacks: authConfig.callbacks,
  session: authConfig.session,
  pages: authConfig.pages,
  secret: secret,
  debug: false, // Désactiver le debug pour éviter les erreurs "Configuration"
  // Permettre la liaison automatique des comptes OAuth aux comptes existants avec le même email
  // Sécurisé car l'email est vérifié par le provider OAuth (Google/Twitch)
  allowDangerousEmailAccountLinking: true,
});
