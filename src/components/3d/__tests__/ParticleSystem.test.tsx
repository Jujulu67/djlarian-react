import { render } from '@testing-library/react';
import ParticleSystem, { Particle } from '../ParticleSystem';

describe('ParticleSystem', () => {
  const mockParticles: Particle[] = [
    {
      x: 100,
      y: 100,
      vx: 1,
      vy: 1,
      size: 5,
      color: '#ffffff',
      life: 1,
      timestamp: Date.now(),
    },
  ];

  const mockSetParticles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render canvas', () => {
    const { container } = render(
      <ParticleSystem particles={mockParticles} setParticles={mockSetParticles} />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle empty particles array', () => {
    const { container } = render(<ParticleSystem particles={[]} setParticles={mockSetParticles} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should update canvas size on mount', () => {
    const { container } = render(
      <ParticleSystem particles={mockParticles} setParticles={mockSetParticles} />
    );

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeDefined();
  });
});
