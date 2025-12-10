/**
 * Tests for HomePage Component (Server Component)
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../page';
import { defaultConfigs } from '@/config/defaults';

// Mock the data fetching functions
jest.mock('@/lib/data/homepage', () => ({
  getHomepageConfig: jest.fn(),
}));

jest.mock('@/lib/data/events', () => ({
  getUpcomingEvents: jest.fn(),
}));

jest.mock('@/lib/data/music', () => ({
  getLatestReleases: jest.fn(),
}));

// Mock child components
jest.mock('../components/HeroSection', () => {
  return function HeroSection({ config }: { config: any }) {
    return (
      <div data-testid="hero-section">
        <h1>{config.heroTitle}</h1>
        <p>{config.heroSubtitle}</p>
      </div>
    );
  };
});

jest.mock('../components/LatestReleasesWrapper', () => {
  return function LatestReleasesWrapper({ title }: { title: string }) {
    return <div data-testid="latest-releases">{title}</div>;
  };
});

jest.mock('../components/EventsSectionWrapper', () => {
  return function EventsSectionWrapper({ title }: { title: string }) {
    return <div data-testid="upcoming-events">{title}</div>;
  };
});

jest.mock('../components/VisualizerSectionWrapper', () => {
  return function VisualizerSectionWrapper({ title }: { title: string }) {
    return (
      <div data-testid="visualizer-section">
        <button data-testid="visualizer-button">{title}</button>
      </div>
    );
  };
});

jest.mock('../components/HomePageClient', () => {
  return function HomePageClient() {
    return null; // Client component that doesn't render anything visible
  };
});

jest.mock('../components/ClientUIComponents', () => {
  return function ClientUIComponents() {
    return (
      <>
        <div data-testid="scroll-progress">Scroll Progress</div>
        <div data-testid="scroll-to-top">Scroll To Top</div>
      </>
    );
  };
});

jest.mock('@/components/sections/TwitchStream', () => {
  return function TwitchStream() {
    return <div data-testid="twitch-stream">Twitch Stream</div>;
  };
});

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
  },
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { getHomepageConfig } from '@/lib/data/homepage';
import { getUpcomingEvents } from '@/lib/data/events';
import { getLatestReleases } from '@/lib/data/music';

const mockConfig = {
  ...defaultConfigs.homepage,
  heroTitle: 'Test Hero Title',
  heroSubtitle: 'Test Hero Subtitle',
  sectionsOrder: 'hero,releases,visualizer,events,stream',
  releasesEnabled: true,
  releasesTitle: 'Latest Releases',
  releasesCount: 3,
  visualizerEnabled: true,
  visualizerTitle: 'My Visualizer',
  eventsEnabled: true,
  eventsTitle: 'Upcoming Events',
  eventsCount: 3,
  streamEnabled: true,
};

describe('HomePage (Server Component)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getHomepageConfig as jest.Mock).mockResolvedValue(mockConfig);
    (getUpcomingEvents as jest.Mock).mockResolvedValue([]);
    (getLatestReleases as jest.Mock).mockResolvedValue([]);
  });

  it('should render hero section correctly', async () => {
    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByText('Test Hero Title')).toBeInTheDocument();
      expect(screen.getByText('Test Hero Subtitle')).toBeInTheDocument();
    });
  });

  it('should render all enabled sections', async () => {
    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('latest-releases')).toBeInTheDocument();
      expect(screen.getByTestId('visualizer-section')).toBeInTheDocument();
      expect(screen.getByTestId('upcoming-events')).toBeInTheDocument();
      expect(screen.getByTestId('twitch-stream')).toBeInTheDocument();
    });
  });

  it('should respect sectionsOrder configuration', async () => {
    const customConfig = {
      ...mockConfig,
      sectionsOrder: 'hero,events,releases',
      visualizerEnabled: false,
      streamEnabled: false,
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(customConfig);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('upcoming-events')).toBeInTheDocument();
      expect(screen.getByTestId('latest-releases')).toBeInTheDocument();
      // Visualizer and stream should not be rendered
      expect(screen.queryByTestId('visualizer-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('twitch-stream')).not.toBeInTheDocument();
    });
  });

  it('should hide disabled sections', async () => {
    const disabledConfig = {
      ...mockConfig,
      releasesEnabled: false,
      visualizerEnabled: false,
      eventsEnabled: false,
      streamEnabled: false,
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(disabledConfig);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      // Other sections should not be rendered
      expect(screen.queryByTestId('latest-releases')).not.toBeInTheDocument();
      expect(screen.queryByTestId('visualizer-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('upcoming-events')).not.toBeInTheDocument();
      expect(screen.queryByTestId('twitch-stream')).not.toBeInTheDocument();
    });
  });

  it('should use default sectionsOrder when not provided', async () => {
    const configWithoutOrder = {
      ...mockConfig,
      sectionsOrder: undefined,
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(configWithoutOrder);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      // Should still render all sections (default order)
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully and use default config', async () => {
    // Mock getHomepageConfig to return default config (as it does in real code on error)
    (getHomepageConfig as jest.Mock).mockResolvedValue(defaultConfigs.homepage);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      // Should render with default config values
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByText(defaultConfigs.homepage.heroTitle)).toBeInTheDocument();
    });
  });

  it('should render UI components (ScrollProgress, ScrollToTop)', async () => {
    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByTestId('scroll-progress')).toBeInTheDocument();
      expect(screen.getByTestId('scroll-to-top')).toBeInTheDocument();
    });
  });

  it('should pass correct props to LatestReleasesWrapper', async () => {
    const configWithCustomReleases = {
      ...mockConfig,
      releasesTitle: 'Custom Releases Title',
      releasesCount: 5,
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(configWithCustomReleases);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByText('Custom Releases Title')).toBeInTheDocument();
    });
  });

  it('should pass correct props to EventsSectionWrapper', async () => {
    const configWithCustomEvents = {
      ...mockConfig,
      eventsTitle: 'Custom Events Title',
      eventsCount: 5,
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(configWithCustomEvents);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByText('Custom Events Title')).toBeInTheDocument();
    });
  });

  it('should pass correct props to VisualizerSectionWrapper', async () => {
    const configWithCustomVisualizer = {
      ...mockConfig,
      visualizerTitle: 'Custom Visualizer Title',
    };
    (getHomepageConfig as jest.Mock).mockResolvedValue(configWithCustomVisualizer);

    const HomePageComponent = await HomePage();
    render(HomePageComponent);

    await waitFor(() => {
      expect(screen.getByText('Custom Visualizer Title')).toBeInTheDocument();
    });
  });
});
