/**
 * Mock for next-auth/react
 * Used for testing components that depend on next-auth
 */

const mockUseSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated' as const,
  update: jest.fn(),
}));

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn(() => Promise.resolve(null));
const mockGetCsrfToken = jest.fn(() => Promise.resolve('mock-csrf-token'));
const mockGetProviders = jest.fn(() => Promise.resolve({}));

const SessionProvider = ({ children }: { children: React.ReactNode }) => children;

module.exports = {
  useSession: mockUseSession,
  signIn: mockSignIn,
  signOut: mockSignOut,
  getSession: mockGetSession,
  getCsrfToken: mockGetCsrfToken,
  getProviders: mockGetProviders,
  SessionProvider,
  // Allow tests to access mocks for assertions
  __esModule: true,
  default: {
    useSession: mockUseSession,
    signIn: mockSignIn,
    signOut: mockSignOut,
    getSession: mockGetSession,
    getCsrfToken: mockGetCsrfToken,
    getProviders: mockGetProviders,
    SessionProvider,
  },
};
