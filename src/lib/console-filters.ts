/**
 * Filtres pour supprimer les warnings et erreurs non critiques de la console
 * Centralise toute la logique de filtrage pour une meilleure maintenabilité
 *
 * IMPORTANT: Utilisez le système de logging centralisé (src/lib/logger.ts)
 * au lieu de console.log/warn/error directement dans votre code.
 */

// Fonction pour vérifier si un message doit être filtré
const shouldFilterMessage = (message: string): boolean => {
  const messageLower = message.toLowerCase();
  return (
    // Warnings React Router
    messageLower.includes('react router future flag') ||
    messageLower.includes('v7_starttransition') ||
    messageLower.includes('v7_relativesplatpath') ||
    // Warnings Framer Motion
    messageLower.includes('motion versions') ||
    messageLower.includes('attempting to mix motion versions') ||
    messageLower.includes('12.9.1') ||
    messageLower.includes('12.9.2') ||
    messageLower.includes('non-static position') ||
    messageLower.includes('scroll offset') ||
    messageLower.includes('container has a non-static') ||
    messageLower.includes('please ensure that the container') ||
    messageLower.includes('ensure that the container') ||
    messageLower.includes('container has a non-static') ||
    // Erreurs SecurityError (getLayoutMap, etc.)
    messageLower.includes('getlayoutmap') ||
    messageLower.includes('securityerror') ||
    messageLower.includes('permission policy') ||
    // Erreurs Twitch
    messageLower.includes('twitch') ||
    messageLower.includes('429') ||
    messageLower.includes('too many requests') ||
    messageLower.includes('autoplay disabled') ||
    messageLower.includes('embedded experiences') ||
    // Erreurs réseau
    messageLower.includes('err_connection_refused') ||
    messageLower.includes('localhost:3001') ||
    messageLower.includes('script.js') ||
    // Fast Refresh (HMR)
    messageLower.includes('[fast refresh]') ||
    messageLower.includes('fast refresh') ||
    // Amazon IVS (Twitch player)
    messageLower.includes('amazon ivs') ||
    messageLower.includes('ivs player sdk')
  );
};

/**
 * Initialise les filtres de console pour supprimer les warnings/erreurs non critiques
 * À appeler une seule fois au démarrage de l'application
 */
export function setupConsoleFilters() {
  if (typeof window === 'undefined') {
    return; // Ne rien faire côté serveur
  }

  // Sauvegarder les fonctions originales
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);
  const originalLog = console.log.bind(console);

  // Obtenir le descriptor original de console.warn pour pouvoir le restaurer
  const originalWarnDescriptor =
    Object.getOwnPropertyDescriptor(console, 'warn') ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(console), 'warn');

  // Intercepter console.log
  console.log = (...args: unknown[]) => {
    const message = args.join(' ');
    if (shouldFilterMessage(message)) {
      return; // Ne pas afficher ces logs
    }
    originalLog.apply(console, args);
  };

  // Intercepter console.warn AVANT framer-motion (forward-logs-shared.ts)
  // On doit intercepter très tôt pour capturer les warnings de framer-motion
  if (originalWarnDescriptor) {
    Object.defineProperty(console, 'warn', {
      ...originalWarnDescriptor,
      value: (...args: unknown[]) => {
        const message = args.join(' ');
        if (shouldFilterMessage(message)) {
          return; // Ne pas afficher ces warnings
        }
        originalWarn.apply(console, args);
      },
      writable: true,
      configurable: true,
    });
  } else {
    // Fallback si Object.defineProperty ne fonctionne pas
    console.warn = (...args: unknown[]) => {
      const message = args.join(' ');
      if (shouldFilterMessage(message)) {
        return; // Ne pas afficher ces warnings
      }
      originalWarn.apply(console, args);
    };
  }

  // Intercepter console.error
  console.error = (...args: unknown[]) => {
    const message = args.join(' ');
    if (shouldFilterMessage(message)) {
      return; // Ne pas afficher ces erreurs
    }
    originalError.apply(console, args);
  };

  // Intercepter les erreurs globales
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const messageStr = String(message).toLowerCase();
    const sourceStr = String(source || '').toLowerCase();
    if (
      messageStr.includes('getlayoutmap') ||
      messageStr.includes('securityerror') ||
      messageStr.includes('permission policy') ||
      messageStr.includes('twitch') ||
      messageStr.includes('429') ||
      messageStr.includes('err_connection_refused') ||
      messageStr.includes('non-static position') ||
      messageStr.includes('scroll offset') ||
      sourceStr.includes('twitch.tv') ||
      sourceStr.includes('localhost:3001') ||
      sourceStr.includes('passport.twitch.tv') ||
      sourceStr.includes('gql.twitch.tv')
    ) {
      return true; // Supprimer l'erreur
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };

  // Intercepter les promesses rejetées non gérées
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const { reason } = event;
    const reasonStr = reason ? String(reason).toLowerCase() : '';
    const reasonMessage =
      reason && typeof reason === 'object' && 'message' in reason
        ? String(reason.message).toLowerCase()
        : '';

    if (
      reasonStr.includes('getlayoutmap') ||
      reasonStr.includes('securityerror') ||
      reasonStr.includes('permission policy') ||
      reasonStr.includes('twitch') ||
      reasonStr.includes('429') ||
      reasonMessage.includes('getlayoutmap') ||
      reasonMessage.includes('securityerror') ||
      reasonMessage.includes('permission policy') ||
      reasonMessage.includes('non-static position') ||
      reasonMessage.includes('scroll offset')
    ) {
      event.preventDefault(); // Supprimer l'erreur
      return;
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Retourner une fonction de nettoyage
  return () => {
    // Restaurer les fonctions originales
    if (originalWarnDescriptor) {
      Object.defineProperty(console, 'warn', originalWarnDescriptor);
    } else {
      console.warn = originalWarn;
    }
    console.error = originalError;
    console.log = originalLog;
    window.onerror = originalErrorHandler;
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}
