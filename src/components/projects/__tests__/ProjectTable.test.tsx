/**
 * Tests for ProjectTable component
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTable } from '../ProjectTable';
import { Project, ProjectStatus } from '../types';

// Mock dependencies
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) =>
    children(
      {
        draggableProps: {},
        innerRef: jest.fn(),
      },
      {}
    ),
  Draggable: ({ children }: any) =>
    children(
      {
        draggableProps: {},
        dragHandleProps: {},
        innerRef: jest.fn(),
      },
      { isDragging: false }
    ),
}));

jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: jest.fn().mockReturnValue(false),
}));

// Mock EditableCell to simplify testing
jest.mock('../EditableCell', () => ({
  EditableCell: ({ value, onSave, field }: any) => (
    <input
      data-testid={`editable-cell-${field}`}
      defaultValue={value || ''}
      onBlur={(e) => onSave(field, e.target.value)}
    />
  ),
}));

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project A',
    status: 'EN_COURS',
    style: 'Techno',
    collab: 'Artist X',
    label: 'Label Y',
    labelFinal: 'Label Z',
    releaseDate: '2024-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    streamsJ7: 100,
    streamsJ14: 200,
  },
  {
    id: '2',
    name: 'Project B',
    status: 'TERMINE',
    style: 'House',
    collab: '',
    label: '',
    labelFinal: '',
    releaseDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    streamsJ7: 50,
  },
];

const mockHandlers = {
  onUpdate: jest.fn(),
  onDelete: jest.fn(),
  onCreate: jest.fn(),
  onReorder: jest.fn(),
  onSort: jest.fn(),
  onRefresh: jest.fn(),
  onStatistics: jest.fn(),
  onImport: jest.fn(),
  onExport: jest.fn(),
  onPurge: jest.fn(),
};

describe('ProjectTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true);

    // Mock window.innerWidth for normal mode
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1400,
    });
    window.dispatchEvent(new Event('resize'));
  });

  it('should render projects correctly', () => {
    render(<ProjectTable projects={mockProjects} {...mockHandlers} />);

    expect(screen.getByDisplayValue('Project A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Project B')).toBeInTheDocument();
  });

  it('should handle sorting', async () => {
    const user = userEvent.setup();
    render(
      <ProjectTable
        projects={mockProjects}
        {...mockHandlers}
        sortField="name"
        sortDirection="asc"
      />
    );

    const nameHeader = screen.getByText('Nom Projet');
    await user.click(nameHeader);

    expect(mockHandlers.onSort).toHaveBeenCalledWith('name');
  });

  it('should handle deletion', async () => {
    const user = userEvent.setup();
    render(<ProjectTable projects={mockProjects} {...mockHandlers} />);

    const deleteButtons = screen.getAllByTitle('Supprimer le projet');
    await user.click(deleteButtons[0]);

    expect(global.confirm).toHaveBeenCalled();
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');

    // Wait for state update to complete to avoid act warning
    await waitFor(() => {
      expect(deleteButtons[0]).not.toBeDisabled();
    });
  });

  it('should handle cell updates', async () => {
    const user = userEvent.setup();
    render(<ProjectTable projects={mockProjects} {...mockHandlers} />);

    const nameInput = screen.getAllByTestId('editable-cell-name')[0];
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    fireEvent.blur(nameInput);

    expect(mockHandlers.onUpdate).toHaveBeenCalledWith('1', 'name', 'New Name');
  });

  it('should toggle stats view', () => {
    const { rerender } = render(
      <ProjectTable projects={mockProjects} {...mockHandlers} showStats={false} />
    );

    expect(screen.queryByText('J7')).not.toBeInTheDocument();

    rerender(<ProjectTable projects={mockProjects} {...mockHandlers} showStats={true} />);

    expect(screen.getByText('J7')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<ProjectTable projects={[]} {...mockHandlers} />);

    expect(screen.getByText('Aucun projet')).toBeInTheDocument();
  });

  it('should handle refresh action', async () => {
    const user = userEvent.setup();
    render(<ProjectTable projects={mockProjects} {...mockHandlers} />);

    await user.click(screen.getByTitle('Rafraîchir'));
    expect(mockHandlers.onRefresh).toHaveBeenCalled();
  });
});
