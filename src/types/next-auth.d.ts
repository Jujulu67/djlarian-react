import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    hashedPassword?: string | null;
  }

  interface Session {
    user: User;
  }
}
