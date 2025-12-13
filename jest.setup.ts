/**
 * Configuration Jest globale - Mocks centralisés
 *
 * Tous les mocks utilisés par les tests du router assistant sont centralisés ici
 * pour éviter la duplication et garantir la cohérence.
 */

// Import jest-dom matchers
require('@testing-library/jest-dom');

// ========================================
// Mocks Next.js
// ========================================

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

// ========================================
// Mocks Assistant Router (centralisés)
// ========================================

// Mock ai (pour generateText)
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// ========================================
// Mocks Assistant Router
// ========================================
// Note: Les mocks spécifiques au router sont dans router-test-mocks.ts
// et doivent être importés dans les fichiers de test du router.
// Ici, on garde seulement les mocks vraiment globaux (Next.js, etc.)

// ========================================
// Mocks Browser APIs (si window existe)
// ========================================

// Mock matchMedia (only if window exists - for jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock requestAnimationFrame (only if window exists - for jsdom environment)
if (typeof window !== 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };

  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// ========================================
// Configuration Jest
// ========================================

// Augmenter la limite de temps pour les tests qui interagissent avec la base de données
jest.setTimeout(10000);
