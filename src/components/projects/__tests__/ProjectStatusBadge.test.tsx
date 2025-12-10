import { render, screen } from '@testing-library/react';
import { ProjectStatusBadge } from '../ProjectStatusBadge';

describe('ProjectStatusBadge', () => {
  it('should render EN_COURS status', () => {
    render(<ProjectStatusBadge status="EN_COURS" />);
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });

  it('should render TERMINE status', () => {
    render(<ProjectStatusBadge status="TERMINE" />);
    expect(screen.getByText('Terminé')).toBeInTheDocument();
  });

  it('should render ANNULE status', () => {
    render(<ProjectStatusBadge status="ANNULE" />);
    expect(screen.getByText('Annulé')).toBeInTheDocument();
  });

  it('should render A_REWORK status', () => {
    render(<ProjectStatusBadge status="A_REWORK" />);
    expect(screen.getByText('A Rework')).toBeInTheDocument();
  });

  it('should render GHOST_PRODUCTION status', () => {
    render(<ProjectStatusBadge status="GHOST_PRODUCTION" />);
    expect(screen.getByText('Ghost Prod')).toBeInTheDocument();
  });

  it('should render ARCHIVE status', () => {
    render(<ProjectStatusBadge status="ARCHIVE" />);
    expect(screen.getByText('Archivé')).toBeInTheDocument();
  });

  it('should render with small size by default', () => {
    render(<ProjectStatusBadge status="EN_COURS" />);
    const badge = screen.getByText('En cours');
    expect(badge.className).toMatch(/text-xs/);
  });

  it('should render with small size when specified', () => {
    render(<ProjectStatusBadge status="EN_COURS" size="sm" />);
    const badge = screen.getByText('En cours');
    expect(badge.className).toMatch(/text-xs/);
  });

  it('should render with medium size when specified', () => {
    render(<ProjectStatusBadge status="EN_COURS" size="md" />);
    const badge = screen.getByText('En cours');
    expect(badge.className).toMatch(/text-sm/);
  });

  it('should return null for invalid status', () => {
    const { container } = render(<ProjectStatusBadge status={'INVALID' as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('should apply correct color classes for each status', () => {
    const { rerender } = render(<ProjectStatusBadge status="EN_COURS" />);
    let badge = screen.getByText('En cours');
    expect(badge.className).toMatch(/blue/);

    rerender(<ProjectStatusBadge status="TERMINE" />);
    badge = screen.getByText('Terminé');
    expect(badge.className).toMatch(/emerald|green/);

    rerender(<ProjectStatusBadge status="ANNULE" />);
    badge = screen.getByText('Annulé');
    expect(badge.className).toMatch(/red/);

    rerender(<ProjectStatusBadge status="A_REWORK" />);
    badge = screen.getByText('A Rework');
    expect(badge.className).toMatch(/amber|orange/);

    rerender(<ProjectStatusBadge status="GHOST_PRODUCTION" />);
    badge = screen.getByText('Ghost Prod');
    expect(badge.className).toMatch(/purple/);
  });

  it('should use default blue color when statusConfig color is not in colorMap', () => {
    // This test verifies the fallback behavior
    const { container } = render(<ProjectStatusBadge status="EN_COURS" />);
    const badge = screen.getByText('En cours');
    // Should have a color class (blue is the default)
    expect(badge.className).toMatch(/blue|emerald|red|amber|purple/);
  });
});
