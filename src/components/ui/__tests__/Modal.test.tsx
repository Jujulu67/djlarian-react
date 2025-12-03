/**
 * Tests for Modal component
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import Modal from '../Modal';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock ReactDOM.createPortal
const originalCreatePortal = require('react-dom').createPortal;
beforeAll(() => {
  require('react-dom').createPortal = jest.fn((element) => element);
});

afterAll(() => {
  require('react-dom').createPortal = originalCreatePortal;
});

describe('Modal', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Mock window and document
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1024, writable: true });
  });

  it('should render modal with children', () => {
    render(
      <Modal>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    );

    const closeButton = screen.getByLabelText('Fermer la modale');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should call router.back when no onClose is provided', () => {
    render(
      <Modal>
        <div>Modal Content</div>
      </Modal>
    );

    const closeButton = screen.getByLabelText('Fermer la modale');
    fireEvent.click(closeButton);

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('should render with custom maxWidth', () => {
    render(
      <Modal maxWidth="max-w-md">
        <div>Modal Content</div>
      </Modal>
    );

    const modal = document.querySelector('.max-w-md');
    expect(modal).toBeInTheDocument();
  });

  it('should not render content when isReady is false', () => {
    render(
      <Modal isReady={false}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });
});
