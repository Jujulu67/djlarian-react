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
    messageLower.includes('to ensure scroll offset is calculated correctly') ||
    messageLower.includes("like 'relative', 'fixed', or 'absolute'") ||
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
    // Erreurs 404 sur les images originales (tentatives de chargement avec différentes extensions)
    (messageLower.includes('404') && messageLower.includes('-ori.')) ||
    (messageLower.includes('not found') && messageLower.includes('-ori.')) ||
    // Fast Refresh (HMR)
    messageLower.includes('[fast refresh]') ||
    messageLower.includes('fast refresh') ||
    // Amazon IVS (Twitch player)
    messageLower.includes('amazon ivs') ||
    messageLower.includes('ivs player sdk') ||
    // Erreurs d'extensions de navigateur (message port, content scripts, etc.)
    messageLower.includes('message port closed') ||
    messageLower.includes('runtime.lasterror') ||
    messageLower.includes('unchecked runtime.lasterror') ||
    messageLower.includes('the message port closed before a response was received') ||
    messageLower.includes('content_script.js') ||
    messageLower.includes('cannot read properties of undefined') ||
    // Warnings de preload de ressources (fonts, etc.)
    messageLower.includes('was preloaded using link preload but not used') ||
    messageLower.includes('preload but not used within a few seconds') ||
    messageLower.includes('appropriate `as` value and it is preloaded intentionally')
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

  // Intercepter les erreurs du runtime du navigateur (extensions) AVANT tout
  // Ces erreurs sont générées par le runtime et ne passent pas par console.error
  const handleRuntimeError = (event: ErrorEvent) => {
    const message = String(event.message || '').toLowerCase();
    const source = String(event.filename || '').toLowerCase();
    const target = (event.target as HTMLElement)?.tagName?.toLowerCase() || '';

    // Filtrer les erreurs de message port (extensions de navigateur)
    // et les warnings de preload de ressources (fonts, etc.)
    // et les erreurs 404 sur les images originales
    if (
      message.includes('message port closed') ||
      message.includes('runtime.lasterror') ||
      message.includes('unchecked runtime.lasterror') ||
      message.includes('was preloaded using link preload but not used') ||
      message.includes('preload but not used within a few seconds') ||
      message.includes('appropriate `as` value and it is preloaded intentionally') ||
      (message.includes('404') && (message.includes('-ori.') || source.includes('-ori.'))) ||
      (message.includes('not found') && (message.includes('-ori.') || source.includes('-ori.'))) ||
      (source.includes('/uploads/') && source.includes('-ori.')) ||
      message.includes('content_script.js') ||
      (message.includes('cannot read properties of undefined') && message.includes('reading')) ||
      source.includes('content_script.js') ||
      source.includes('extension://') ||
      source.includes('chrome-extension://') ||
      source.includes('_next/static/media') || // Fonts preloadées par Next.js
      (target === 'img' && source.includes('/uploads/') && source.includes('-ori.'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  };

  // Ajouter le gestionnaire d'erreurs global très tôt
  window.addEventListener('error', handleRuntimeError, true); // true = capture phase

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
      messageStr.includes('message port closed') ||
      messageStr.includes('runtime.lasterror') ||
      messageStr.includes('unchecked runtime.lasterror') ||
      messageStr.includes('was preloaded using link preload but not used') ||
      messageStr.includes('preload but not used within a few seconds') ||
      messageStr.includes('appropriate `as` value and it is preloaded intentionally') ||
      ((messageStr.includes('404') || messageStr.includes('not found')) &&
        messageStr.includes('-ori.')) ||
      messageStr.includes('content_script.js') ||
      (messageStr.includes('cannot read properties of undefined') &&
        messageStr.includes('reading')) ||
      sourceStr.includes('content_script.js') ||
      sourceStr.includes('twitch.tv') ||
      sourceStr.includes('/uploads/') || // Images uploadées
      sourceStr.includes('localhost:3001') ||
      sourceStr.includes('passport.twitch.tv') ||
      sourceStr.includes('gql.twitch.tv') ||
      sourceStr.includes('extension://') ||
      sourceStr.includes('chrome-extension://') ||
      sourceStr.includes('_next/static/media') // Fonts preloadées par Next.js
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
      reasonStr.includes('message port closed') ||
      reasonStr.includes('runtime.lasterror') ||
      reasonStr.includes('err_connection_refused') ||
      reasonStr.includes('content_script.js') ||
      (reasonStr.includes('cannot read properties of undefined') &&
        reasonStr.includes('reading')) ||
      reasonMessage.includes('getlayoutmap') ||
      reasonMessage.includes('securityerror') ||
      reasonMessage.includes('permission policy') ||
      reasonMessage.includes('non-static position') ||
      reasonMessage.includes('scroll offset') ||
      reasonMessage.includes('message port closed') ||
      reasonMessage.includes('runtime.lasterror') ||
      reasonMessage.includes('err_connection_refused') ||
      reasonMessage.includes('content_script.js') ||
      (reasonMessage.includes('cannot read properties of undefined') &&
        reasonMessage.includes('reading'))
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
    window.removeEventListener('error', handleRuntimeError, true);
  };
}
