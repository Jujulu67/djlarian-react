import { render, screen } from '@testing-library/react';
import { ProjectTable } from '../ProjectTable';
import type { Project } from '../types';

// Mock @hello-pangea/dnd
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <>{children}</>,
  Droppable: ({ children }: any) => {
    const provided = {
      innerRef: jest.fn(),
      droppableProps: {},
    };
    return children(provided, { isDraggingOver: false });
  },
  Draggable: ({ children }: any) => {
    const provided = {
      innerRef: jest.fn(),
      draggableProps: {},
      dragHandleProps: {},
    };
    const snapshot = { isDragging: false, isDropAnimating: false, dropAnimation: null };
    return children(provided, snapshot);
  },
}));

// Mock hooks
jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// Mock components
jest.mock('../AddProjectRow', () => ({
  AddProjectRow: () => <div data-testid="add-project-row">Add Project Row</div>,
}));

jest.mock('../EditableCell', () => ({
  EditableCell: ({ value }: any) => <div>{String(value)}</div>,
}));

jest.mock('../ProjectStatusBadge', () => ({
  ProjectStatusBadge: ({ status }: any) => <div>{status}</div>,
}));

describe('ProjectTable', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Test Project',
      status: 'pending',
      style: 'Electronic',
      collab: 'Artist',
      label: 'ACCEPTE',
      labelFinal: 'Final Label',
      releaseDate: '2024-01-01',
      streamsJ7: 1000,
      streamsJ14: 2000,
      streamsJ21: 3000,
      streamsJ28: 4000,
      streamsJ56: 5000,
      streamsJ84: 6000,
      streamsJ180: 7000,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render project table', () => {
    render(
      <ProjectTable
        projects={mockProjects}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('should display project status', () => {
    render(
      <ProjectTable
        projects={mockProjects}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('should handle empty projects', () => {
    render(
      <ProjectTable
        projects={[]}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    expect(screen.getByTestId('add-project-row')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(
      <ProjectTable
        projects={mockProjects}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
        isLoading={true}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });
});
