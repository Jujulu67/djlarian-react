import type { NextAuthConfig, Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import Twitch from 'next-auth/providers/twitch';
import { storeMergeToken } from '@/lib/merge-token-cache';

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

export const authConfig = {
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Si c'est une connexion OAuth et qu'un utilisateur existe avec le même email
      if (account && user.email) {
        const prismaModule = await import('@/lib/prisma');
        const prisma = prismaModule.default;

        // Vérifier si ce compte OAuth est déjà lié à un autre utilisateur
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        // Si le compte OAuth est déjà lié à un utilisateur
        if (existingAccount) {
          // Si l'email correspond, c'est le même utilisateur, autoriser
          if (existingAccount.user.email === user.email) {
            // Le compte est déjà lié, autoriser la connexion
            // Mettre à jour l'image et le nom depuis le profil OAuth si disponibles
            const updateData: { image?: string; name?: string } = {};

            if (
              user.image &&
              (!existingAccount.user.image || existingAccount.user.image !== user.image)
            ) {
              updateData.image = user.image;
            }

            if (
              user.name &&
              (!existingAccount.user.name || existingAccount.user.name !== user.name)
            ) {
              updateData.name = user.name;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: existingAccount.user.id },
                data: updateData,
              });
            }

            return true;
          } else {
            // Le compte OAuth est lié à un autre utilisateur avec un email différent
            console.warn(
              `[Auth] Tentative de connexion avec un compte OAuth déjà lié à un autre utilisateur (${existingAccount.user.email})`
            );
            // Autoriser quand même, NextAuth gérera la création/liaison
            // Mais on log un avertissement
          }
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { Account: true },
        });

        // Si un utilisateur existe et qu'il a déjà un compte OAuth pour ce provider, autoriser
        if (existingUser) {
          const hasAccountForProvider = existingUser.Account.some(
            (acc) => acc.provider === account.provider
          );

          if (hasAccountForProvider) {
            // Le compte est déjà lié, autoriser la connexion
            // Mettre à jour l'image et le nom depuis le profil OAuth si disponibles
            const updateData: { image?: string; name?: string } = {};

            if (user.image && (!existingUser.image || existingUser.image !== user.image)) {
              updateData.image = user.image;
            }

            if (user.name && (!existingUser.name || existingUser.name !== user.name)) {
              updateData.name = user.name;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: updateData,
              });
            }

            return true;
          }

          // Si l'utilisateur existe mais n'a pas encore de compte OAuth pour ce provider
          // Par défaut, demander confirmation avant fusion (peut être désactivé avec REQUIRE_MERGE_CONFIRMATION=false)
          const requireMergeConfirmation = process.env.REQUIRE_MERGE_CONFIRMATION !== 'false';

          if (requireMergeConfirmation) {
            // Créer un token temporaire pour la fusion
            const { hkdf } = await import('@panva/hkdf');
            const { EncryptJWT, base64url, calculateJwkThumbprint } = await import('jose');

            const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
            if (secret) {
              const isSecure = process.env.NODE_ENV === 'production';
              const cookieName = isSecure
                ? '__Secure-authjs.session-token'
                : 'authjs.session-token';
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
                existingUserId: existingUser.id,
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

              // Stocker le token dans la base de données (partagé entre tous les workers)
              await storeMergeToken(user.email, mergeToken);

              // Retourner false pour bloquer la connexion
              // La page d'erreur récupérera le token depuis la base de données et redirigera
              return false;
            }
          }

          // Sinon, fusionner automatiquement (comportement par défaut)
          // Mettre à jour l'image et le nom depuis le profil OAuth si disponibles
          const updateData: { image?: string; name?: string } = {};

          // Si l'image OAuth existe, l'utiliser
          // Sinon, si l'utilisateur n'a pas d'image, laisser null (comme lors d'un signup normal)
          if (user.image && user.image.trim() !== '') {
            if (!existingUser.image || existingUser.image !== user.image) {
              updateData.image = user.image;
            }
          }
          // Si l'image OAuth est vide et que l'utilisateur n'a pas d'image, on ne fait rien
          // (on laisse null, le placeholder sera géré côté UI)

          if (user.name && (!existingUser.name || existingUser.name !== user.name)) {
            updateData.name = user.name;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: updateData,
            });
          }
        }
      }

      // Autoriser la connexion
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        // Mettre à jour le token avec toutes les données de session.user, y compris l'image, createdAt et isVip
        const userWithExtras = session.user as { createdAt?: string | Date; isVip?: boolean };
        return {
          ...token,
          ...session.user,
          image: session.user.image,
          name: session.user.name,
          email: session.user.email,
          createdAt: userWithExtras.createdAt || token.createdAt,
          isVip: userWithExtras.isVip !== undefined ? userWithExtras.isVip : token.isVip,
          gameHighScore: (session.user as any).gameHighScore ?? token.gameHighScore,
          hasDiscoveredCasino:
            (session.user as any).hasDiscoveredCasino ?? token.hasDiscoveredCasino,
        };
      }

      // Si user est présent (première connexion via authorize)
      if (user) {
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

      // Si token.id est manquant mais sub est présent (JWT manuel)
      // Utiliser sub comme id
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      return token;
    },
    async session({ session, token }) {
      try {
        // Vérifications défensives - s'assurer que session existe
        if (!session) {
          console.warn('[AuthConfig] session callback - session is null/undefined');
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
          console.warn('[AuthConfig] session callback - session.user is null/undefined');
          return session;
        }

        // Si pas de token, retourner la session telle quelle
        if (!token) {
          return session;
        }

        // À ce point, on sait que session et session.user existent
        // Mais on vérifie encore une fois par sécurité
        if (!session.user) {
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

        // Récupérer l'image depuis le token si disponible (priorité au token qui est mis à jour via updateSession)
        if (token.image) {
          const imageUrl = token.image as string;
          session.user.image = imageUrl;
        } else if (userId) {
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
            console.error('[AuthConfig] Erreur récupération image depuis DB:', error);
          }
        }

        // Récupérer le nom et l'email depuis le token si disponibles
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }

        // Récupérer createdAt et isVip depuis le token si disponibles
        if (token.createdAt) {
          session.user.createdAt = token.createdAt as string | Date;
        } else if (userId) {
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
            console.error('[AuthConfig] Erreur récupération createdAt/isVip depuis DB:', error);
          }
        }

        // Récupérer les stats de jeu depuis le token
        if (token.gameHighScore !== undefined) {
          session.user.gameHighScore = token.gameHighScore as number;
        }
        if (token.hasDiscoveredCasino !== undefined) {
          session.user.hasDiscoveredCasino = token.hasDiscoveredCasino as boolean;
        }

        // Si pas dans le token, fetch depuis DB (pour les utilisateurs existants)
        if (
          userId &&
          (session.user.gameHighScore === undefined ||
            session.user.hasDiscoveredCasino === undefined)
        ) {
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
            console.error('[AuthConfig] Erreur récupération game stats depuis DB:', error);
          }
        }

        // Récupérer isVip depuis le token si disponible
        if (token.isVip !== undefined) {
          session.user.isVip = token.isVip as boolean;
        }

        return session;
      } catch (error) {
        console.error('[AuthConfig] session callback error:', error);
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
    async redirect({ url, baseUrl }) {
      // Vérifier s'il y a un token de fusion en attente et définir le cookie
      try {
        const { peekAnyMergeToken } = await import('@/lib/merge-token-cache');
        const peekedToken = await peekAnyMergeToken();
        if (peekedToken) {
          // Note: On ne peut pas définir de cookie directement ici, mais on peut utiliser l'email dans l'URL
          // Le cookie sera défini par la page d'erreur ou l'API check
        }
      } catch (error) {
        console.error('[AuthConfig] redirect - Erreur vérification token fusion:', error);
      }

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
          console.warn('[AuthConfig] redirect - Origine différente, retour baseUrl:', baseUrl);
          return baseUrl;
        }

        return finalUrl;
      } catch (error) {
        // En cas d'erreur, retourner la baseUrl
        console.error('[AuthConfig] redirect - Erreur:', error);
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
