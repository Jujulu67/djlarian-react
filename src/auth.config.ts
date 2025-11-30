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
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        return { ...token, ...session.user };
      }

      if (user) {
        token.role = user.role;
        token.id = user.id;
      }

      // S'assurer que token.id est toujours présent (role peut être undefined pour certains utilisateurs)
      if (!token.id) {
        // Si l'ID est manquant, le token est invalide
        // NextAuth gérera cela automatiquement
        console.warn('Token JWT invalide: ID manquant');
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // S'assurer que les valeurs sont toujours définies
        session.user.role = (token.role as string | undefined) || undefined;
        session.user.id = (token.id as string) || '';

        // Si l'ID est manquant, la session est invalide
        // Retourner null pour que NextAuth traite la session comme non authentifiée
        if (!session.user.id) {
          return null;
        }
      }
      return session;
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
