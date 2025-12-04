import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  const mockOnPageChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pagination with current page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
  });

  it('should call onPageChange when clicking next page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByLabelText('Page suivante');
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when clicking previous page', () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByLabelText('Page précédente');
    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking first page', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const firstButton = screen.getByLabelText('Première page');
    fireEvent.click(firstButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking last page', () => {
    render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

    const lastButton = screen.getByLabelText('Dernière page');
    fireEvent.click(lastButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(5);
  });

  it('should disable previous buttons on first page', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    const prevButton = screen.getByLabelText('Page précédente');
    const firstButton = screen.getByLabelText('Première page');

    expect(prevButton).toBeDisabled();
    expect(firstButton).toBeDisabled();
  });

  it('should disable next buttons on last page', () => {
    render(<Pagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByLabelText('Page suivante');
    const lastButton = screen.getByLabelText('Dernière page');

    expect(nextButton).toBeDisabled();
    expect(lastButton).toBeDisabled();
  });

  it('should show limited pages when totalPages exceeds maxVisiblePages', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        onPageChange={mockOnPageChange}
        maxVisiblePages={5}
      />
    );

    // Should show pages around current page
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 7')).toBeInTheDocument();
  });

  it('should call onPageChange when clicking a page number', () => {
    render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

    const pageButton = screen.getByLabelText('Page 3');
    fireEvent.click(pageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={mockOnPageChange}
        className="custom-class"
      />
    );

    const pagination = container.firstChild;
    expect(pagination).toHaveClass('custom-class');
  });
});
