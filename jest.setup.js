// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Import jest-dom matchers
require('@testing-library/jest-dom');

// Mock next/router
jest.mock('next/router', () => require('next-router-mock'));

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
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @typescript-eslint/no-var-requires
    const React = require('react');
    return React.createElement('img', props);
  },
}));

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

// Augmenter la limite de temps pour les tests qui interagissent avec la base de données
jest.setTimeout(10000);
