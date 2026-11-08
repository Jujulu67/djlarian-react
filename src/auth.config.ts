import type { Account, NextAuthConfig, Session, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import Google from 'next-auth/providers/google';
import Twitch from 'next-auth/providers/twitch';
import { logger } from '@/lib/logger';

// Auth.js configuration - Vercel (Node.js runtime natif)
// Ne configurer les providers OAuth que si les credentials sont disponibles
const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  providers.push(
    Twitch({
      clientId: process.env.TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
    })
  );
}

/** Reprend l'image et le nom du profil OAuth s'ils ont changé. Sans image OAuth, rien ne change. */
async function syncOAuthProfile(
  existing: { id: string; image: string | null; name: string | null },
  user: User
): Promise<void> {
  const data: { image?: string; name?: string } = {};
  if (user.image?.trim() && existing.image !== user.image) data.image = user.image;
  if (user.name && existing.name !== user.name) data.name = user.name;
  if (Object.keys(data).length === 0) return;
  const prisma = (await import('@/lib/prisma')).default;
  await prisma.user.update({ where: { id: existing.id }, data });
}

/** Jeton chiffré (1 h) pour confirmer une fusion de comptes ; null sans secret configuré. */
async function createMergeToken(
  user: User,
  account: Account,
  existingUserId: string
): Promise<string | null> {
  const { hkdf } = await import('@panva/hkdf');
  const { EncryptJWT, base64url, calculateJwkThumbprint } = await import('jose');

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  const isSecure = process.env.NODE_ENV === 'production';
  const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const salt = cookieName;

  const encryptionSecret = await hkdf(
    'sha256',
    secret,
    salt,
    `Auth.js Generated Encryption Key (${salt})`,
    64
  );

  const thumbprint = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(encryptionSecret) },
    'sha256'
  );

  const mergeToken = await new EncryptJWT({
    email: user.email,
    name: user.name,
    image: user.image,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    existingUserId,
    accountData: {
      type: account.type,
      refresh_token: account.refresh_token,
      access_token: account.access_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    },
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256CBC-HS512', kid: thumbprint })
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600) // 1 heure
    .encrypt(encryptionSecret);

  return mergeToken;
}

const ROLE_REFRESH_MS = 5 * 60 * 1000;

// Relit le compte en base (déclenché par update(...)) : seuls les champs de la base sont repris
async function reloadTokenFromDb(token: JWT): Promise<JWT> {
  // Les données envoyées par le client (update(...)) ne sont jamais reprises : elles
  // permettraient de se donner un rôle ou l'id d'un autre compte. On relit le compte en base.
  const userId = (token.id ?? token.sub) as string | undefined;
  if (!userId) return token;
  const prismaModule = await import('@/lib/prisma');
  const dbUser = await prismaModule.default.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isVip: true,
      createdAt: true,
      gameHighScore: true,
      hasDiscoveredCasino: true,
    },
  });
  if (!dbUser) return token;
  return { ...token, ...dbUser } as JWT;
}

// Recopie les informations du compte (première connexion via authorize) dans le jeton
function copyUserToToken(token: JWT, user: User) {
  token.role = user.role;
  token.id = user.id;
  token.image = user.image;
  token.name = user.name;
  token.email = user.email;

  // Ajouter createdAt et isVip si disponibles
  const userWithExtras = user as { createdAt?: string | Date; isVip?: boolean };
  if (userWithExtras.createdAt) {
    token.createdAt = userWithExtras.createdAt;
  }
  if (userWithExtras.isVip !== undefined) {
    token.isVip = userWithExtras.isVip;
  }

  const userWithGameStats = user as { gameHighScore?: number; hasDiscoveredCasino?: boolean };
  if (userWithGameStats.gameHighScore !== undefined) {
    token.gameHighScore = userWithGameStats.gameHighScore;
  }
  if (userWithGameStats.hasDiscoveredCasino !== undefined) {
    token.hasDiscoveredCasino = userWithGameStats.hasDiscoveredCasino;
  }
}

// Relit le rôle en base. Renvoie false si le compte n'existe plus.
async function refreshRoleFromDb(token: JWT): Promise<boolean> {
  try {
    const prismaModule = await import('@/lib/prisma');
    const dbUser = await prismaModule.default.user.findUnique({
      where: { id: token.id as string },
      select: { role: true, isVip: true },
    });
    if (!dbUser) return false;
    token.role = dbUser.role as string;
    token.isVip = dbUser.isVip;
    token.roleCheckedAt = Date.now();
  } catch (error) {
    // Base indisponible : on garde le jeton tel quel et on réessaiera
    logger.error('[AuthConfig] jwt - Relecture du rôle impossible:', error);
  }
  return true;
}

// Image de la session : celle du jeton, sinon celle de la base
async function hydrateSessionImage(session: Session, token: JWT, userId: string) {
  // Récupérer l'image depuis le token si disponible (priorité au token qui est mis à jour via updateSession)
  if (token.image) {
    session.user.image = token.image as string;
    return;
  }
  if (!userId) return;
  // Si l'image n'est pas dans le token, la récupérer depuis la base de données
  try {
    const prismaModule = await import('@/lib/prisma');
    const prisma = prismaModule.default;
    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
      });
      if (user?.image) {
        session.user.image = user.image;
      }
    }
  } catch (error) {
    logger.error('[AuthConfig] Erreur récupération image depuis DB:', error);
  }
}

// createdAt et isVip : ceux du jeton, sinon ceux de la base
async function hydrateSessionProfile(session: Session, token: JWT, userId: string) {
  if (token.createdAt) {
    session.user.createdAt = token.createdAt as string | Date;
    return;
  }
  if (!userId) return;
  // Si createdAt n'est pas dans le token, le récupérer depuis la base de données
  try {
    const prismaModule = await import('@/lib/prisma');
    const prisma = prismaModule.default;
    if (prisma) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true, isVip: true },
      });
      if (user?.createdAt) {
        session.user.createdAt = user.createdAt;
      }
      if (user?.isVip !== undefined) {
        session.user.isVip = user.isVip;
      }
    }
  } catch (error) {
    logger.error('[AuthConfig] Erreur récupération createdAt/isVip depuis DB:', error);
  }
}

// Stats de jeu manquantes dans la session : relues en base (utilisateurs existants)
async function hydrateSessionGameStats(session: Session, userId: string) {
  if (!userId) return;
  if (session.user.gameHighScore !== undefined && session.user.hasDiscoveredCasino !== undefined) {
    return;
  }
  try {
    const prismaModule = await import('@/lib/prisma');
    const prisma = prismaModule.default;
    if (prisma) {
      const userStats = await prisma.user.findUnique({
        where: { id: userId },
        select: { gameHighScore: true, hasDiscoveredCasino: true },
      });
      if (userStats) {
        session.user.gameHighScore = userStats.gameHighScore;
        session.user.hasDiscoveredCasino = userStats.hasDiscoveredCasino;
      }
    }
  } catch (error) {
    logger.error('[AuthConfig] Erreur récupération game stats depuis DB:', error);
  }
}

export const authConfig = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Si c'est une connexion OAuth et qu'un utilisateur existe avec le même email.
      // Les connexions par mot de passe (provider 'credentials') ne sont pas concernées :
      // authorize() a déjà vérifié le mot de passe, et elles n'ont pas de ligne Account.
      if (!account || account.provider === 'credentials' || !user.email) return true;

      const prisma = (await import('@/lib/prisma')).default;

      // Ce compte OAuth est-il déjà lié à un utilisateur ?
      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (existingAccount && existingAccount.user.email === user.email) {
        await syncOAuthProfile(existingAccount.user, user);
        return true;
      }
      if (existingAccount) {
        // Lié à un autre email : NextAuth gère la création ou la liaison
        logger.warn(
          `[Auth] Tentative de connexion avec un compte OAuth déjà lié à un autre utilisateur (${existingAccount.user.email})`
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { Account: true },
      });
      if (!existingUser) return true;

      if (existingUser.Account.some((acc) => acc.provider === account.provider)) {
        await syncOAuthProfile(existingUser, user);
        return true;
      }

      // Si l'utilisateur existe mais n'a pas encore de compte OAuth pour ce provider
      // Par défaut, demander confirmation avant fusion (peut être désactivé avec REQUIRE_MERGE_CONFIRMATION=false).
      // Un compte protégé par mot de passe n'est JAMAIS fusionné automatiquement : la page de
      // confirmation exige ce mot de passe (sinon, quelqu'un qui aurait créé un compte avec
      // l'email d'une victime garderait l'accès après sa connexion OAuth).
      const hasPassword = Boolean(existingUser.hashedPassword);
      const requireMergeConfirmation =
        hasPassword || process.env.REQUIRE_MERGE_CONFIRMATION !== 'false';

      if (requireMergeConfirmation) {
        const mergeToken = await createMergeToken(user, account, existingUser.id);
        if (mergeToken) {
          // Bloquer la connexion et envoyer CE navigateur vers la page de confirmation.
          // Le jeton (chiffré, valable 1 h) n'est jamais stocké ni consultable par un tiers.
          return `/auth/merge-accounts?token=${encodeURIComponent(mergeToken)}`;
        }
        // Sans secret, impossible de créer le jeton : refuser plutôt que fusionner
        if (hasPassword) return false;
      }

      // Sinon, fusionner automatiquement
      await syncOAuthProfile(existingUser, user);
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (trigger === 'update') {
        return reloadTokenFromDb(token);
      }

      // Si user est présent (première connexion via authorize)
      if (user) {
        copyUserToToken(token, user);
      }

      // Si token.id est manquant mais sub est présent (JWT manuel)
      // Utiliser sub comme id
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      // Relire le rôle en base toutes les 5 minutes : un changement de rôle (ou la suppression
      // du compte) s'applique sans attendre l'expiration de la session (30 jours).
      const checkedAt = typeof token.roleCheckedAt === 'number' ? token.roleCheckedAt : 0;
      if (user) {
        token.roleCheckedAt = Date.now();
      } else if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        const accountExists = await refreshRoleFromDb(token);
        if (!accountExists) return null;
      }

      return token;
    },
    async session({ session, token }) {
      try {
        // Vérifications défensives - s'assurer que session existe
        if (!session) {
          logger.warn('[AuthConfig] session callback - session is null/undefined');
          // Retourner une session minimale valide
          return {
            user: {
              id: '',
              name: undefined,
              email: undefined,
              image: undefined,
            },
            expires: new Date().toISOString(),
          } as Session;
        }

        // Si session.user n'existe pas, retourner la session telle quelle
        if (!session.user) {
          logger.warn('[AuthConfig] session callback - session.user is null/undefined');
          return session;
        }

        // Si pas de token, retourner la session telle quelle
        if (!token) {
          return session;
        }

        // Utiliser token.id ou token.sub comme ID utilisateur
        const userId = (token.id as string) || (token.sub as string) || '';

        // Tous les accès à session.user sont maintenant sécurisés
        if (userId) {
          session.user.id = userId;
        }

        if (token.role) {
          session.user.role = token.role as string;
        }

        await hydrateSessionImage(session, token, userId);

        // Récupérer le nom et l'email depuis le token si disponibles
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }

        await hydrateSessionProfile(session, token, userId);

        // Récupérer les stats de jeu depuis le token
        if (token.gameHighScore !== undefined) {
          session.user.gameHighScore = token.gameHighScore as number;
        }
        if (token.hasDiscoveredCasino !== undefined) {
          session.user.hasDiscoveredCasino = token.hasDiscoveredCasino as boolean;
        }

        // Si pas dans le token, fetch depuis DB (pour les utilisateurs existants)
        await hydrateSessionGameStats(session, userId);

        // Récupérer isVip depuis le token si disponible
        if (token.isVip !== undefined) {
          session.user.isVip = token.isVip as boolean;
        }

        return session;
      } catch (error) {
        logger.error('[AuthConfig] session callback error:', error);
        // En cas d'erreur, retourner la session originale ou une session minimale valide
        return (
          session ||
          ({
            user: {
              id: '',
              name: undefined,
              email: undefined,
              image: undefined,
            },
            expires: new Date().toISOString(),
          } as Session)
        );
      }
    },
    redirect({ url, baseUrl }) {
      // Nettoyer l'URL pour éviter les boucles de callbackUrl
      try {
        // Si l'URL est la baseUrl ou la page d'accueil, retourner baseUrl sans query params
        if (url === baseUrl || url === `${baseUrl}/` || url === '/') {
          return baseUrl;
        }

        const urlObj = new URL(url, baseUrl);

        // Vérifier si c'est une association de compte (link=true)
        const isLinking = urlObj.searchParams.get('link') === 'true';

        // Supprimer tous les query params callbackUrl pour éviter les boucles
        urlObj.searchParams.delete('callbackUrl');

        // Si c'est une association, rediriger vers /profile avec un message de succès
        if (isLinking) {
          urlObj.pathname = '/profile';
          urlObj.searchParams.delete('link');
          urlObj.searchParams.set('linked', 'true');
          const finalUrl = urlObj.toString();
          return finalUrl;
        }

        // Si l'URL ne contient plus que le pathname (pas de query params)
        const cleanPath = urlObj.pathname;

        // Si le pathname est juste '/' ou vide, retourner baseUrl
        if (cleanPath === '/' || cleanPath === '') {
          return baseUrl;
        }

        // Si l'URL contient encore des query params callbackUrl après nettoyage, les supprimer à nouveau
        if (urlObj.searchParams.has('callbackUrl')) {
          urlObj.searchParams.delete('callbackUrl');
        }

        // Construire l'URL finale
        const finalUrl = `${baseUrl}${cleanPath}${urlObj.search}`;

        // Si l'URL finale est juste la baseUrl avec un slash, retourner baseUrl
        if (finalUrl === `${baseUrl}/` || finalUrl === baseUrl) {
          return baseUrl;
        }

        // Vérifier que l'URL finale est sur le même domaine
        const finalUrlObj = new URL(finalUrl);
        if (finalUrlObj.origin !== new URL(baseUrl).origin) {
          logger.warn('[AuthConfig] redirect - Origine différente, retour baseUrl:', baseUrl);
          return baseUrl;
        }

        return finalUrl;
      } catch (error) {
        // En cas d'erreur, retourner la baseUrl
        logger.error('[AuthConfig] redirect - Erreur:', error);
        return baseUrl;
      }
    },
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 jours en secondes
    updateAge: 24 * 60 * 60, // Rafraîchir le token tous les 24 heures
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
} satisfies NextAuthConfig;
