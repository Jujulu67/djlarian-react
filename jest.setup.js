import '@testing-library/jest-dom';

// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock next/router
jest.mock('next/router', () => require('next-router-mock'));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const mockComponent = (type) => {
    const component = (props) => {
      const { children, ...rest } = props;
      return require('react').createElement(type, rest, children);
    };
    component.displayName = `motion.${type}`;
    return component;
  };

  return {
    __esModule: true,
    motion: {
      div: mockComponent('div'),
      button: mockComponent('button'),
      span: mockComponent('span'),
      p: mockComponent('p'),
      a: mockComponent('a'),
      h1: mockComponent('h1'),
      h2: mockComponent('h2'),
      h3: mockComponent('h3'),
    },
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({ start: jest.fn() }),
    useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
    useTransform: () => ({ get: () => 0, set: jest.fn() }),
  };
});

// Mock matchMedia
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

// Augmenter la limite de temps pour les tests qui interagissent avec la base de données
jest.setTimeout(10000);
