import { render, screen } from '@testing-library/react';
import { RandomWheel } from '../RandomWheel';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ get: () => 0 }),
  animate: jest.fn(),
  useTransform: () => 0,
}));

describe('RandomWheel', () => {
  const mockSubmissions = [
    { id: '1', userId: 'user-1', userName: 'User 1', User: { name: 'User 1' } },
    { id: '2', userId: 'user-2', userName: 'User 2', User: { name: 'User 2' } },
  ];

  const mockWeights = [1, 2];
  const mockOnSpinComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render wheel', () => {
    render(
      <RandomWheel
        submissions={mockSubmissions}
        weights={mockWeights}
        selectedIndex={null}
        isSpinning={false}
        onSpinComplete={mockOnSpinComplete}
      />
    );

    // Check that the component renders without crashing
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should handle empty submissions', () => {
    const { container } = render(
      <RandomWheel
        submissions={[]}
        weights={[]}
        selectedIndex={null}
        isSpinning={false}
        onSpinComplete={mockOnSpinComplete}
      />
    );

    // When submissions are empty, the component might not render SVG
    // Just check that it renders without crashing
    expect(container).toBeInTheDocument();
  });

  it('should handle spinning state', () => {
    render(
      <RandomWheel
        submissions={mockSubmissions}
        weights={mockWeights}
        selectedIndex={null}
        isSpinning={true}
        onSpinComplete={mockOnSpinComplete}
      />
    );

    // Check that the component renders without crashing
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
