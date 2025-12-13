'use client';

/**
 * Hook managing all ProjectAssistant state and logic
 * Extracted from ProjectAssistant.tsx for better maintainability
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/components/projects/types';
import { processProjectCommand } from '@/app/actions/assistant';
import type { Message } from '../types';

export interface UseAssistantChatOptions {
  projects: Project[];
}

export interface UseAssistantChatReturn {
  // State
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  messages: Message[];
  localProjects: Project[];
  setLocalProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  localProjectsRef: React.MutableRefObject<Project[]>;
  messagesEndRef: React.RefObject<HTMLDivElement>;

  // Handlers
  handleReset: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useAssistantChat({ projects }: UseAssistantChatOptions): UseAssistantChatReturn {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFilters, setLastFilters] = useState<any | null>(null);
  const [lastResults, setLastResults] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>
  >([]);
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const localProjectsRef = useRef<Project[]>(projects);

  // Sync with props
  useEffect(() => {
    setLocalProjects(projects);
    localProjectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    localProjectsRef.current = localProjects;
  }, [localProjects]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Computed values
  const uniqueCollabs = useMemo(
    () => [...new Set(localProjectsRef.current.filter((p) => p.collab).map((p) => p.collab!))],
    [localProjects]
  );

  const uniqueStyles = useMemo(
    () => [...new Set(localProjectsRef.current.filter((p) => p.style).map((p) => p.style!))],
    [localProjects]
  );

  const handleReset = useCallback(() => {
    setMessages([]);
    setLastFilters(null);
    setLastResults([]);
    setConversationHistory([]);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      setIsLoading(true);

      const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
      setMessages((prev) => [...prev, userMessage]);
      const currentInput = input;
      setInput('');

      try {
        console.log('[Assistant] 📝 Question reçue:', currentInput);

        // Use the Server Action directly
        const response = await processProjectCommand(currentInput);

        // Parser la réponse pour détecter les données structurées (projets créés, listes, etc.)
        let messageContent = response;
        let createdProject: Project | null = null;
        let messageData:
          | {
              projects: Project[];
              type: 'count' | 'list' | 'search' | 'create' | 'update';
              fieldsToShow: string[];
            }
          | undefined = undefined;

        try {
          const parsed = JSON.parse(response);
          if (parsed.message) {
            messageContent = parsed.message;

            // Si un projet a été créé
            if (parsed.createdProject) {
              createdProject = parsed.createdProject;
            }

            // Si des données structurées sont présentes (pour l'affichage en tableau)
            if (parsed.data && parsed.data.projects && Array.isArray(parsed.data.projects)) {
              messageData = {
                projects: parsed.data.projects,
                type: parsed.data.type || 'list',
                fieldsToShow: parsed.data.fieldsToShow || [],
              };
            }
          }
        } catch {
          // La réponse n'est pas un JSON, utiliser la réponse telle quelle
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: messageContent,
            timestamp: new Date(),
            ...(messageData && { data: messageData }),
          },
        ]);

        // Si un projet a été créé, déclencher l'événement pour le scroll et l'animation
        if (createdProject) {
          window.dispatchEvent(
            new CustomEvent('projectCreatedFromAssistant', {
              detail: {
                projectId: createdProject.id,
                project: createdProject,
              },
            })
          );
        }

        // If the answer implies an update (contains "succès", "mis à jour", "créé"), refresh the view
        if (
          /succès|mis à jour|créé|clôturé|effectuée/i.test(messageContent) ||
          messageContent.includes('!')
        ) {
          router.refresh();
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Désolé, une erreur est survenue lors du traitement de ta demande.',
            timestamp: new Date(),
          },
        ]);
        console.error('[Assistant] ❌ Error processing query:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, router]
  );

  return {
    isOpen,
    setIsOpen,
    input,
    setInput,
    isLoading,
    messages,
    setMessages,
    localProjects,
    setLocalProjects,
    localProjectsRef,
    messagesEndRef,
    handleReset,
    handleSubmit,
  };
}
