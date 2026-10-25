import { render, screen } from '@testing-library/react';
import Navigation from '../Navigation';

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ shopEnabled: true }),
  })
) as jest.Mock;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock next-auth/react
let mockSession: unknown = null;
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: mockSession ? 'authenticated' : 'unauthenticated',
  }),
}));

// Mock hooks
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
  }),
}));

// Mock components
jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-modal">Auth Modal</div>,
}));

jest.mock('@/components/projects/MilestoneInbox', () => ({
  MilestoneInbox: () => <div data-testid="milestone-inbox">Milestone Inbox</div>,
}));

describe('Navigation', () => {
  it('should render navigation', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render home link', () => {
    render(<Navigation />);
    const homeLink = screen.getByText(/home/i);
    expect(homeLink).toBeInTheDocument();
  });

  describe('avatar of a Google user', () => {
    const googleImage = 'https://lh3.googleusercontent.com/a/abc=s96-c';

    beforeEach(() => {
      mockSession = {
        user: { name: 'DJ Test', image: googleImage, role: 'USER' },
        expires: '2999-01-01T00:00:00.000Z',
      };
    });

    afterEach(() => {
      mockSession = null;
    });

    it('uses the image proxy in both desktop and mobile menus', () => {
      render(<Navigation />);
      const avatars = screen.getAllByAltText('DJ Test');
      expect(avatars.length).toBeGreaterThanOrEqual(2);
      avatars.forEach((avatar) => {
        expect(avatar.getAttribute('src')).toContain('/api/images/proxy?url=');
      });
    });
  });
});
