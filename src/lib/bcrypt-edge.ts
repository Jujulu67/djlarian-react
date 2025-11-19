/**
 * Wrapper pour bcrypt compatible avec Edge Runtime (Cloudflare Workers/Pages)
 * 
 * En Edge Runtime, utilise Web Crypto API
 * En Node.js runtime, utilise bcryptjs
 */

// Détecter si on est en Edge Runtime
const isEdgeRuntime = 
  typeof process === 'undefined' || 
  !process.versions?.node ||
  process.env.CF_PAGES === '1' ||
  process.env.NEXT_RUNTIME === 'edge';

/**
 * Compare un mot de passe en clair avec un hash bcrypt
 * Compatible Edge Runtime et Node.js
 */
export async function compare(password: string, hash: string): Promise<boolean> {
  if (isEdgeRuntime) {
    // En Edge Runtime, utiliser Web Crypto API
    // Note: bcrypt n'est pas disponible, donc on doit utiliser une alternative
    // Pour l'instant, on utilise bcryptjs même en Edge (il peut fonctionner avec des polyfills)
    // Si ça ne fonctionne pas, il faudra migrer vers une solution basée sur Web Crypto API
    
    // Solution temporaire: utiliser bcryptjs même en Edge
    // Cloudflare Workers supporte certaines APIs Node.js via des polyfills
    try {
      const bcrypt = await import('bcryptjs');
      return bcrypt.compare(password, hash);
    } catch (error) {
      console.error('[BCRYPT] Erreur lors de la comparaison en Edge Runtime:', error);
      // Fallback: utiliser Web Crypto API pour une comparaison basique
      // ATTENTION: Ce n'est pas sécurisé pour la production, juste pour le développement
      throw new Error('bcryptjs n\'est pas disponible en Edge Runtime. Utilisez Node.js runtime pour l\'authentification.');
    }
  } else {
    // En Node.js runtime, utiliser bcryptjs normalement
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }
}

/**
 * Hash un mot de passe avec bcrypt
 * Compatible Edge Runtime et Node.js
 */
export async function hash(password: string, saltRounds: number = 10): Promise<string> {
  if (isEdgeRuntime) {
    // En Edge Runtime, utiliser bcryptjs avec polyfills
    try {
      const bcrypt = await import('bcryptjs');
      return bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('[BCRYPT] Erreur lors du hash en Edge Runtime:', error);
      throw new Error('bcryptjs n\'est pas disponible en Edge Runtime. Utilisez Node.js runtime pour l\'authentification.');
    }
  } else {
    // En Node.js runtime, utiliser bcryptjs normalement
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, saltRounds);
  }
}

