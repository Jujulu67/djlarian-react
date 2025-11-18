import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// Note: Pas de Edge Runtime car Auth.js v5 avec Prisma/bcrypt nécessite Node.js
// TODO: Migrer complètement vers Edge Runtime une fois que Auth.js v5 supporte mieux Edge
