/**
 * Wrapper pour bcrypt - Vercel (Node.js runtime natif)
 *
 * Sur Vercel, bcryptjs fonctionne nativement sans hacks
 */
import bcrypt from 'bcryptjs';

/**
 * Compare un mot de passe en clair avec un hash bcrypt
 */
export function compare(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash un mot de passe avec bcrypt
 */
export function hash(password: string, saltRounds: number = 10): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}
