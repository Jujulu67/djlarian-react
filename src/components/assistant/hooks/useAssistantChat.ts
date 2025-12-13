'use client';

/**
 * Hook managing all ProjectAssistant state and logic
 * Extracted from ProjectAssistant.tsx for better maintainability
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/components/projects/types';
import { getAssistantService } from '@/lib/assistant/factory';
import type { Message } from '../types';
import { debugLog, isAssistantDebugEnabled } from '@/lib/assistant/utils/debug';

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
  // Mémoire de travail pour le routeur NEW
  const lastAppliedFilterRef = useRef<
    import('@/lib/assistant/router/types').ProjectFilter | undefined
  >(undefined);
  const lastListedProjectIdsRef = useRef<string[] | undefined>(undefined);

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
    lastAppliedFilterRef.current = undefined;
    lastListedProjectIdsRef.current = undefined;
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

        // Vérifier la version sélectionnée
        const { getAssistantVersion } = await import('@/lib/assistant/version-selector');
        const version = getAssistantVersion();

        // Si version NEW : utiliser le routeur côté client (0 DB pour listing)
        if (version === 'new') {
          // Logs avant appel routeur (debug)
          debugLog('hook', '📤 Avant appel routeur', {
            message: currentInput.substring(0, 100),
            projectsCount: localProjectsRef.current.length,
            lastListedProjectIdsCount: lastListedProjectIdsRef.current?.length || 0,
            lastAppliedFilter: lastAppliedFilterRef.current,
            contextPassed: {
              lastListedProjectIds: lastListedProjectIdsRef.current?.slice(0, 5) || [], // Afficher seulement les 5 premiers
              lastAppliedFilterSummary: lastAppliedFilterRef.current
                ? Object.keys(lastAppliedFilterRef.current).filter(
                    (k) =>
                      lastAppliedFilterRef.current?.[k as keyof typeof lastAppliedFilterRef.current]
                  )
                : [],
            },
          });

          const { routeProjectCommandClient } =
            await import('@/lib/assistant/router/client-router');
          const result = await routeProjectCommandClient(currentInput, localProjectsRef.current, {
            conversationHistory,
            lastFilters,
            lastAppliedFilter: lastAppliedFilterRef.current,
            lastListedProjectIds: lastListedProjectIdsRef.current,
          });

          // Traiter le résultat selon le type
          if (result.type === 'list') {
            // Listing : tout est fait côté client, pas d'appel serveur
            // Stocker la mémoire de travail pour les prochaines commandes
            lastAppliedFilterRef.current = result.appliedFilter;
            lastListedProjectIdsRef.current = result.listedProjectIds;

            // Logs de debug pour la mémoire de travail
            debugLog('hook', '📋 LIST résultat - Mémoire de travail stockée', {
              listedProjectIdsCount: result.listedProjectIds.length,
              appliedFilter: result.appliedFilter,
              projectsCount: result.projects.length,
            });

            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: result.message,
                timestamp: new Date(),
                data: {
                  projects: result.projects,
                  type: 'list',
                  fieldsToShow: result.fieldsToShow,
                },
              },
            ]);
          } else if (result.type === 'create') {
            // Création : appeler l'API serveur pour persister
            const createData = result.createData || {
              name: result.project.name,
              status: result.project.status,
              progress: result.project.progress,
              collab: result.project.collab,
              style: result.project.style,
              deadline:
                result.project.deadline && typeof result.project.deadline !== 'string'
                  ? (result.project.deadline as Date).toISOString().split('T')[0]
                  : (result.project.deadline as string | null | undefined),
            };

            const createPayload = {
              name: createData.name,
              status: createData.status || 'EN_COURS',
              progress: createData.progress,
              collab: createData.collab,
              style: createData.style,
              deadline: createData.deadline,
            };

            const createResponse = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload),
            });

            if (!createResponse.ok) {
              throw new Error('Erreur lors de la création du projet');
            }

            const createdProject = await createResponse.json();
            const actualProject = createdProject.data || createdProject;

            // Mettre à jour les projets locaux
            setLocalProjects((prev) => [...prev, actualProject]);
            localProjectsRef.current = [...localProjectsRef.current, actualProject];

            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `Projet "${actualProject.name}" créé avec succès.`,
                timestamp: new Date(),
              },
            ]);

            // Déclencher l'événement pour le scroll et l'animation
            window.dispatchEvent(
              new CustomEvent('projectCreatedFromAssistant', {
                detail: {
                  projectId: actualProject.id,
                  project: actualProject,
                },
              })
            );

            router.refresh();
          } else if (result.type === 'update' || result.type === 'add_note') {
            // Modification/Note : afficher la confirmation
            // La confirmation doit afficher les projets comme un listing
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: result.message,
                timestamp: new Date(),
                // Afficher les projets affectés comme un listing
                data: {
                  projects: result.pendingAction.affectedProjects,
                  type: 'update',
                  fieldsToShow: result.pendingAction.fieldsToShow,
                },
                updateConfirmation: {
                  filters: result.pendingAction.filters,
                  updateData: result.pendingAction.mutation as any,
                  affectedProjects: result.pendingAction.affectedProjects,
                  affectedProjectIds: result.pendingAction.affectedProjectIds,
                  scopeSource: result.pendingAction.scopeSource,
                  fieldsToShow: result.pendingAction.fieldsToShow,
                },
              },
            ]);
          } else if (result.type === 'general') {
            // Vérifier si c'est une confirmation de scope manquant
            if ('confirmationType' in result && result.confirmationType === 'scope_missing') {
              // Confirmation de scope manquant : afficher warning avec mutation proposée
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: result.response,
                  timestamp: new Date(),
                  scopeConfirmation: {
                    proposedMutation: result.proposedMutation as any,
                    totalProjectsCount: result.totalProjectsCount,
                  },
                },
              ]);
            } else {
              // Question généraliste (Groq)
              setMessages((prev) => [
                ...prev,
                {
                  role: 'assistant',
                  content: result.response,
                  timestamp: new Date(),
                },
              ]);
            }
          }
          return; // Sortir après traitement du résultat du routeur NEW
        }

        // Si version OLD : utiliser le factory (ancien système)
        const assistantService = getAssistantService();
        const response = await assistantService.processProjectCommand(currentInput);

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
