import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string;
      createdAt?: string | Date;
      isVip?: boolean;
      gameHighScore?: number;
      hasDiscoveredCasino?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role?: string;
    createdAt?: string | Date;
    isVip?: boolean;
    gameHighScore?: number;
    hasDiscoveredCasino?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    createdAt?: string | Date;
    isVip?: boolean;
    gameHighScore?: number;
    hasDiscoveredCasino?: boolean;
  }
}
