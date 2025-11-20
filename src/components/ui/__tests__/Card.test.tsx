import { render, screen } from '@testing-library/react';

import { Card } from '../Card';

describe('Card', () => {
  it('renders correctly with children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Card title="Card Title">
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
  });

  it('renders with subtitle', () => {
    render(
      <Card subtitle="Card Subtitle">
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Card footer={<button>Footer Button</button>}>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('applies hoverable classes when isHoverable is true', () => {
    const { container } = render(
      <Card isHoverable>
        <p>Card content</p>
      </Card>
    );
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('hover:shadow-lg');
    expect(cardElement).toHaveClass('hover:-translate-y-1');
  });

  it('applies interactive class when isInteractive is true', () => {
    const { container } = render(
      <Card isInteractive>
        <p>Card content</p>
      </Card>
    );
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('cursor-pointer');
  });

  it('applies base styles and custom className', () => {
    const { container } = render(
      <Card className="custom-class">
        <p>Card content</p>
      </Card>
    );
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('overflow-hidden');
    expect(cardElement).toHaveClass('rounded-lg');
    expect(cardElement).toHaveClass('bg-white');
    expect(cardElement).toHaveClass('shadow');
    expect(cardElement).toHaveClass('dark:bg-dark-800');
    expect(cardElement).toHaveClass('transition-all');
    expect(cardElement).toHaveClass('duration-200');
    expect(cardElement).toHaveClass('custom-class');
  });
});
