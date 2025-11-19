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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/',
  },
} satisfies NextAuthConfig;

