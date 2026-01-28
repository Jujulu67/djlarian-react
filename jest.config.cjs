/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
    '^exceljs$': '<rootDir>/src/__mocks__/exceljs.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(next-auth|cheerio|@auth|uuid))'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  collectCoverageFrom: [
    // On se concentre sur le code métier testable en unitaires/intégration légère
    'src/lib/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',

    // Exclusions générales
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/types.ts',
    '!src/**/*.test.{ts,tsx}',

    // Les pages Next.js et routes API sont couvertes plutôt par Cypress / tests e2e
    '!src/app/**/*.{ts,tsx}',
    '!src/app/**/*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
  // Force Jest à échouer si les seuils ne sont pas atteints
  // Cela bloque uniquement lors des tests (test:ci, test:coverage)
  // et n'affecte pas le build de production sur Vercel
  coverageReporters: ['text', 'text-summary', 'json-summary'],
};
