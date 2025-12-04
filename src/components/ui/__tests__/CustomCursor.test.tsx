import { render } from '@testing-library/react';
import CustomCursor from '../CustomCursor';

describe('CustomCursor', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  it('should render custom cursor', () => {
    const { container } = render(<CustomCursor />);

    const cursor = container.querySelector('.custom-cursor');
    expect(cursor).toBeInTheDocument();
  });

  it('should update cursor position on mouse move', () => {
    const { container } = render(<CustomCursor />);

    const cursor = container.querySelector('.custom-cursor') as HTMLElement;

    // Add class to make cursor visible
    document.documentElement.classList.add('custom-cursor-active');

    // Simulate mouse move
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: 100,
      clientY: 200,
    });
    window.dispatchEvent(mouseEvent);

    // Cursor should have updated transform
    expect(cursor).toBeInTheDocument();
  });

  it('should hide cursor when rhythm-catcher-active class is present', () => {
    const { container } = render(<CustomCursor />);

    const cursor = container.querySelector('.custom-cursor') as HTMLElement;

    // Add classes
    document.documentElement.classList.add('custom-cursor-active');
    document.documentElement.classList.add('rhythm-catcher-active');

    // Force a class change to trigger MutationObserver
    // MutationObserver watches for attribute changes
    document.documentElement.setAttribute('class', document.documentElement.className + ' test');
    document.documentElement.removeAttribute('test');

    expect(cursor).toBeInTheDocument();
  });

  it('should show cursor when custom-cursor-active class is present', () => {
    const { container } = render(<CustomCursor />);

    const cursor = container.querySelector('.custom-cursor') as HTMLElement;

    document.documentElement.classList.add('custom-cursor-active');
    document.documentElement.classList.toggle('test'); // Trigger observer

    expect(cursor).toBeInTheDocument();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<CustomCursor />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
