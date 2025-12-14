/**
 * Test UI/unit pour vérifier que previewDiff n'est rendu que si debug est actif
 */

import { render, screen } from '@testing-library/react';
import { ProjectAssistant } from '../ProjectAssistant';
import type { Project } from '../projects/types';
import * as debugUtils from '@/lib/assistant/utils/debug';

// Mock du hook useAssistantChat
jest.mock('../assistant/hooks/useAssistantChat', () => ({
  useAssistantChat: jest.fn(() => ({
    isOpen: true,
    setIsOpen: jest.fn(),
    input: '',
    setInput: jest.fn(),
    isLoading: false,
    messages: [],
    localProjects: [],
    setLocalProjects: jest.fn(),
    localProjectsRef: { current: [] },
    messagesEndRef: { current: null },
    handleReset: jest.fn(),
    handleSubmit: jest.fn(),
    setMessages: jest.fn(),
  })),
}));

// Mock des handlers
jest.mock('../assistant/handlers/handleConfirmUpdate', () => ({
  handleConfirmUpdate: jest.fn(),
  handleCancelUpdate: jest.fn(),
}));

// Mock du router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('ProjectAssistant - previewDiff conditionnel', () => {
  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'Test Project',
      status: 'EN_COURS',
      progress: 50,
      userId: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: 0,
    },
  ];

  const mockMessageWithPreviewDiff = {
    role: 'assistant' as const,
    content: 'Confirmez-vous cette action ?',
    timestamp: new Date(),
    updateConfirmation: {
      filters: {},
      updateData: {
        newProgress: 60,
      },
      affectedProjects: mockProjects,
      previewDiff: [
        {
          id: '1',
          name: 'Test Project',
          changes: ['progress 50% → 60%'],
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait afficher previewDiff uniquement si isAssistantDebugEnabled() retourne true', () => {
    // Mock debug enabled
    jest.spyOn(debugUtils, 'isAssistantDebugEnabled').mockReturnValue(true);

    // Mock useAssistantChat pour retourner un message avec previewDiff
    const { useAssistantChat } = require('../assistant/hooks/useAssistantChat');
    useAssistantChat.mockReturnValue({
      isOpen: true,
      setIsOpen: jest.fn(),
      input: '',
      setInput: jest.fn(),
      isLoading: false,
      messages: [mockMessageWithPreviewDiff],
      localProjects: mockProjects,
      setLocalProjects: jest.fn(),
      localProjectsRef: { current: mockProjects },
      messagesEndRef: { current: null },
      handleReset: jest.fn(),
      handleSubmit: jest.fn(),
      setMessages: jest.fn(),
    });

    render(<ProjectAssistant projects={mockProjects} />);

    // Vérifier que "Aperçu des changements" est présent
    expect(screen.getByText('Aperçu des changements')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('progress 50% → 60%')).toBeInTheDocument();
  });

  it('ne devrait PAS afficher previewDiff si isAssistantDebugEnabled() retourne false', () => {
    // Mock debug disabled
    jest.spyOn(debugUtils, 'isAssistantDebugEnabled').mockReturnValue(false);

    // Mock useAssistantChat pour retourner un message avec previewDiff
    const { useAssistantChat } = require('../assistant/hooks/useAssistantChat');
    useAssistantChat.mockReturnValue({
      isOpen: true,
      setIsOpen: jest.fn(),
      input: '',
      setInput: jest.fn(),
      isLoading: false,
      messages: [mockMessageWithPreviewDiff],
      localProjects: mockProjects,
      setLocalProjects: jest.fn(),
      localProjectsRef: { current: mockProjects },
      messagesEndRef: { current: null },
      handleReset: jest.fn(),
      handleSubmit: jest.fn(),
      setMessages: jest.fn(),
    });

    render(<ProjectAssistant projects={mockProjects} />);

    // Vérifier que "Aperçu des changements" n'est PAS présent
    expect(screen.queryByText('Aperçu des changements')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    expect(screen.queryByText('progress 50% → 60%')).not.toBeInTheDocument();
  });
});
