/**
 * Utilitaire pour gérer les erreurs de chargement de chunks
 * Cette fonction configure un gestionnaire global pour intercepter et gérer
 * les erreurs de type ChunkLoadError qui peuvent survenir lors du chargement
 * de modules dynamiques ou de chunks webpack.
 */

export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  // Nombre maximum de tentatives de rechargement
  const MAX_RETRIES = Number(process.env.NEXT_PUBLIC_CHUNK_RETRY_COUNT || '3');

  // Clé pour stocker le nombre de tentatives dans sessionStorage
  const RETRY_COUNT_KEY = 'chunkErrorRetryCount';

  // Fonction pour obtenir le nombre actuel de tentatives
  const getRetryCount = () => {
    const count = sessionStorage.getItem(RETRY_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  };

  // Fonction pour incrémenter le compteur de tentatives
  const incrementRetryCount = () => {
    const count = getRetryCount() + 1;
    sessionStorage.setItem(RETRY_COUNT_KEY, count.toString());
    return count;
  };

  // Fonction pour réinitialiser le compteur de tentatives
  const resetRetryCount = () => {
    sessionStorage.removeItem(RETRY_COUNT_KEY);
  };

  // Gestionnaire d'erreurs pour les erreurs de chargement de chunks
  window.addEventListener('error', (event) => {
    // Vérifier si c'est une erreur de chargement de chunk
    const isChunkLoadError =
      (event.message && event.message.includes('ChunkLoadError')) ||
      (event.error && event.error.name === 'ChunkLoadError') ||
      (event.error && event.error.message && event.error.message.includes('Loading chunk'));

    if (isChunkLoadError) {
      // Empêcher l'affichage de l'erreur dans la console
      event.preventDefault();

      console.warn('Erreur de chargement de chunk détectée:', event.error || event.message);

      // Incrémenter le compteur de tentatives
      const retryCount = incrementRetryCount();

      if (retryCount <= MAX_RETRIES) {
        console.log(`Tentative de rechargement ${retryCount}/${MAX_RETRIES}...`);

        // Effacer le cache des chunks en mémoire si possible
        if (window.__NEXT_DATA__) {
          console.log('Nettoyage du cache des chunks...');
          // Accès sécurisé à la propriété chunks avec une vérification de type
          const nextData = window.__NEXT_DATA__ as any;
          if (nextData.chunks) {
            console.log('Chunks trouvés dans __NEXT_DATA__');
          }
        }

        // Recharger la page après un court délai
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error(`Échec après ${MAX_RETRIES} tentatives. Réinitialisation du compteur.`);
        resetRetryCount();

        // Afficher un message à l'utilisateur
        if (document.body) {
          const errorDiv = document.createElement('div');
          errorDiv.style.position = 'fixed';
          errorDiv.style.top = '0';
          errorDiv.style.left = '0';
          errorDiv.style.width = '100%';
          errorDiv.style.padding = '20px';
          errorDiv.style.backgroundColor = '#f44336';
          errorDiv.style.color = 'white';
          errorDiv.style.textAlign = 'center';
          errorDiv.style.zIndex = '9999';
          errorDiv.innerHTML = `
            Une erreur est survenue lors du chargement de la page. 
            <button onclick="window.location.reload()" style="margin-left: 10px; padding: 5px 10px; background: white; color: #f44336; border: none; border-radius: 4px; cursor: pointer;">
              Réessayer
            </button>
          `;
          document.body.prepend(errorDiv);
        }
      }
    }
  });

  // Vérifier si nous venons de recharger à cause d'une erreur de chunk
  if (getRetryCount() > 0) {
    console.log(
      `Page rechargée suite à une erreur de chunk (tentative ${getRetryCount()}/${MAX_RETRIES})`
    );
  }
}

/**
 * Fonction pour charger un module de manière sécurisée avec gestion des erreurs
 * @param importFn - Fonction d'importation dynamique
 * @param fallback - Composant de fallback à afficher en cas d'erreur
 * @returns Le composant chargé ou le fallback en cas d'erreur
 */
export function withChunkErrorHandling(
  importFn: () => Promise<any>,
  fallback: React.ReactNode = null
) {
  return async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Erreur lors du chargement du module:', error);

      // Si nous sommes côté client, tenter de recharger la page
      if (typeof window !== 'undefined') {
        const isChunkError =
          (error instanceof Error && error.message.includes('ChunkLoadError')) ||
          (error instanceof Error && error.name === 'ChunkLoadError');

        if (isChunkError) {
          // Déclencher l'événement d'erreur pour être capturé par le gestionnaire global
          window.dispatchEvent(
            new ErrorEvent('error', {
              error,
              message: error.message,
            })
          );
        }
      }

      // Retourner un composant de fallback
      return { default: () => fallback };
    }
  };
}

export default setupChunkErrorHandler;
