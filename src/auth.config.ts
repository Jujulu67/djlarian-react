import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Twitch from 'next-auth/providers/twitch';

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
      console.log('[AuthConfig] signIn callback:', {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider,
        accountId: account?.providerAccountId,
      });
      // Autoriser la connexion pour tous les providers
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      console.log('[AuthConfig] jwt callback:', {
        trigger,
        hasUser: !!user,
        userId: user?.id,
        tokenSub: token?.sub,
        tokenId: token?.id,
        tokenRole: token?.role,
      });

      if (trigger === 'update' && session?.user) {
        console.log('[AuthConfig] jwt - Update trigger:', session.user);
        // Mettre à jour le token avec toutes les données de session.user, y compris l'image
        return {
          ...token,
          ...session.user,
          image: session.user.image,
          name: session.user.name,
          email: session.user.email,
        };
      }

      // Si user est présent (première connexion via authorize)
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.image = user.image;
        token.name = user.name;
        token.email = user.email;
        console.log('[AuthConfig] jwt - Token mis à jour avec user:', {
          id: token.id,
          role: token.role,
          image: token.image,
        });
      }

      // Si token.id est manquant mais sub est présent (JWT manuel)
      // Utiliser sub comme id
      if (!token.id && token.sub) {
        token.id = token.sub;
        console.log('[AuthConfig] jwt - ID récupéré depuis sub:', token.id);
      }

      return token;
    },
    async session({ session, token }) {
      try {
        console.log('[AuthConfig] session callback:', {
          hasSession: !!session,
          hasToken: !!token,
          tokenSub: token?.sub,
          tokenId: token?.id,
          tokenRole: token?.role,
          tokenImage: token?.image,
        });

        // Vérifications défensives - s'assurer que session existe
        if (!session) {
          console.warn('[AuthConfig] session callback - session is null/undefined');
          return {
            user: null,
            expires: new Date().toISOString(),
          } as any;
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
          session.user.image = token.image as string;
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

        // Log sécurisé
        console.log('[AuthConfig] session - Session mise à jour:', {
          userId: session.user?.id,
          role: session.user?.role,
          email: session.user?.email,
          image: session.user?.image,
        });

        return session;
      } catch (error) {
        console.error('[AuthConfig] session callback error:', error);
        // En cas d'erreur, retourner la session originale ou une session vide
        return (
          session ||
          ({
            user: null,
            expires: new Date().toISOString(),
          } as any)
        );
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('[AuthConfig] redirect callback:', { url, baseUrl });
      // Nettoyer l'URL pour éviter les boucles de callbackUrl
      try {
        // Si l'URL est la baseUrl ou la page d'accueil, retourner baseUrl sans query params
        if (url === baseUrl || url === `${baseUrl}/` || url === '/') {
          console.log('[AuthConfig] redirect - URL est baseUrl, retour:', baseUrl);
          return baseUrl;
        }

        const urlObj = new URL(url, baseUrl);
        console.log('[AuthConfig] redirect - URL parsée:', {
          href: urlObj.href,
          pathname: urlObj.pathname,
          search: urlObj.search,
        });

        // Supprimer tous les query params callbackUrl pour éviter les boucles
        urlObj.searchParams.delete('callbackUrl');

        // Si l'URL ne contient plus que le pathname (pas de query params)
        const cleanPath = urlObj.pathname;

        // Si le pathname est juste '/' ou vide, retourner baseUrl
        if (cleanPath === '/' || cleanPath === '') {
          console.log('[AuthConfig] redirect - Pathname est /, retour:', baseUrl);
          return baseUrl;
        }

        // Si l'URL contient encore des query params callbackUrl après nettoyage, les supprimer à nouveau
        if (urlObj.searchParams.has('callbackUrl')) {
          urlObj.searchParams.delete('callbackUrl');
        }

        // Construire l'URL finale
        const finalUrl = `${baseUrl}${cleanPath}${urlObj.search}`;
        console.log('[AuthConfig] redirect - URL finale construite:', finalUrl);

        // Si l'URL finale est juste la baseUrl avec un slash, retourner baseUrl
        if (finalUrl === `${baseUrl}/` || finalUrl === baseUrl) {
          console.log('[AuthConfig] redirect - URL finale est baseUrl, retour:', baseUrl);
          return baseUrl;
        }

        // Vérifier que l'URL finale est sur le même domaine
        const finalUrlObj = new URL(finalUrl);
        if (finalUrlObj.origin !== new URL(baseUrl).origin) {
          console.warn('[AuthConfig] redirect - Origine différente, retour baseUrl:', baseUrl);
          return baseUrl;
        }

        console.log('[AuthConfig] redirect - Retour URL finale:', finalUrl);
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
  },
} satisfies NextAuthConfig;
