'use client';

/**
 * Hook managing all ProjectAssistant state and logic
 * Extracted from ProjectAssistant.tsx for better maintainability
 *
 * O10: Session persistence via SessionPersistence.ts
 * - sessionId survit au refresh (sessionStorage)
 * - tabId isole les onglets
 * - userId persiste entre sessions (localStorage)
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/components/projects/types';
import type { Message, QueryFilters, UpdateData } from '../types';
import { debugLog, isAssistantDebugEnabled } from '@/lib/assistant/utils/debug';
import { generateRequestId } from '@/lib/assistant/utils/generate-request-id';
import { generateConfirmationId } from '@/lib/assistant/utils/generate-confirmation-id';
// O10: Session persistence pour survivre au refresh et isoler les onglets
import {
  getOrCreateSessionId,
  getOrCreateTabId,
  getSessionInfo,
  resetSession as resetSessionStorage,
} from '@/lib/assistant/utils/SessionPersistence';
// 🔒 Architecture mémoire étanche - Ne pas mélanger chat et actions
// NOTE: classifyUserMessage supprimé - le routing est fait UNIQUEMENT par router/router.ts (I2)
import {
  trackChatMessage,
  trackActionContext,
  resetSession,
  debugMemoryState,
  getConversationMemorySize,
} from '@/lib/assistant/memory';

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
  messagesEndRef: React.RefObject<HTMLDivElement | null>;

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
  const [lastFilters, setLastFilters] = useState<QueryFilters | null>(null);
  const [lastResults, setLastResults] = useState<Project[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // 🔒 SUPPRIMÉ: conversationHistory state fantôme - géré par ConversationMemory (I3)
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const localProjectsRef = useRef<Project[]>(projects);
  // Mémoire de travail pour le routeur NEW
  const lastAppliedFilterRef = useRef<
    import('@/lib/assistant/router/types').ProjectFilter | undefined
  >(undefined);
  const lastListedProjectIdsRef = useRef<string[] | undefined>(undefined);

  // 🔒 O10: Session ID stable via SessionPersistence (survit au refresh, isolé par onglet)
  // Utilise useRef pour éviter les re-renders inutiles, initialisé côté client
  const sessionIdRef = useRef<string>('');

  // O10: Initialiser le sessionId côté client uniquement (évite SSR)
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = getOrCreateSessionId();

      // Log debug pour vérifier la persistence
      if (isAssistantDebugEnabled()) {
        const sessionInfo = getSessionInfo();
        console.warn('[Assistant] 🔒 Session persistence initialized:', sessionInfo);
      }
    }
  }, []);

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

  // 🔒 SUPPRIMÉ: useEffect sync messages→history (I3 - source de vérité unique = ConversationMemory)

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
    // 🔒 SUPPRIMÉ: setConversationHistory([]) - state fantôme éliminé (I3)
    lastAppliedFilterRef.current = undefined;
    lastListedProjectIdsRef.current = undefined;
    // 🔒 Reset des mémoires étanches (source de vérité unique)
    resetSession(sessionIdRef.current);
    // O10: Générer un nouveau sessionId pour vraiment "recommencer"
    sessionIdRef.current = resetSessionStorage();
    console.warn('[Assistant] 🔄 Session reset, nouveau sessionId:', sessionIdRef.current);
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
        console.warn('[Assistant] 📝 Question reçue:', currentInput);

        // 🔒 Classification SUPPRIMÉE côté client (I2 - un seul routeur)
        // Le routing se fait UNIQUEMENT par routeProjectCommand() dans router/router.ts
        // Pas de double classification pour éviter les décisions concurrentes

        // Générer un requestId pour cette requête
        const requestId = generateRequestId();

        // 🔒 CRITIQUE: Utiliser l'historique filtré de ConversationMemory
        // Cela garantit que Groq ne reçoit JAMAIS les résultats d'actions (listings, etc.)
        const { getFilteredConversationHistory: getFilteredHistory } =
          await import('@/lib/assistant/memory');
        const filteredHistory = getFilteredHistory(sessionIdRef.current);

        // Convertir au format attendu par le router
        const currentHistory = filteredHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(), // Le timestamp exact n'est pas critique pour Groq
        }));

        console.warn('[Assistant] 🔒 Historique filtré pour Groq:', {
          originalMessagesCount: messages.length,
          filteredHistoryCount: currentHistory.length,
          filteredPreview: currentHistory
            .slice(-3)
            .map((m) => `[${m.role}] ${m.content.substring(0, 30)}...`),
        });

        // Logs avant appel routeur (debug)
        debugLog('hook', `[${requestId}] 📤 Avant appel routeur`, {
          requestId,
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

        const { routeProjectCommandClient } = await import('@/lib/assistant/router/client-router');
        const result = await routeProjectCommandClient(currentInput, localProjectsRef.current, {
          conversationHistory: currentHistory,
          lastFilters: lastFilters ? (lastFilters as Record<string, unknown>) : undefined,
          lastAppliedFilter: lastAppliedFilterRef.current,
          lastListedProjectIds: lastListedProjectIdsRef.current,
          requestId,
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

          // 🔒 Tracker dans ActionMemory (PAS dans ConversationMemory!)
          trackActionContext(sessionIdRef.current, 'LIST', result.listedProjectIds);
          debugMemoryState(sessionIdRef.current);

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
                displayMode: result.displayMode,
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

          // 🔒 Tracker dans ActionMemory (PAS dans ConversationMemory!)
          trackActionContext(sessionIdRef.current, 'CREATE', [actualProject.id]);
          debugMemoryState(sessionIdRef.current);

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
          // Générer un confirmationId unique pour l'idempotency
          const confirmationId = generateConfirmationId();

          const mutation = result.pendingAction.mutation as UpdateData;
          // Cas spécial : ajout de note à un projet spécifique
          // Ne pas afficher la liste des projets, mais plutôt la note qui va être ajoutée
          const isSpecificProjectNote = !!(mutation.projectName && mutation.newNote);

          // 🔒 Tracker dans ActionMemory (PAS dans ConversationMemory!)
          trackActionContext(
            sessionIdRef.current,
            result.type === 'add_note' ? 'NOTE' : 'UPDATE',
            result.pendingAction.affectedProjectIds || []
          );
          debugMemoryState(sessionIdRef.current);

          // La confirmation doit afficher les projets comme un listing (sauf pour note spécifique)
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: result.message,
              timestamp: new Date(),
              // Afficher les projets affectés comme un listing (sauf pour note spécifique)
              data: isSpecificProjectNote
                ? undefined
                : {
                    projects: result.pendingAction.affectedProjects,
                    type: 'update',
                    fieldsToShow: result.pendingAction.fieldsToShow,
                  },
              updateConfirmation: {
                filters: result.pendingAction.filters,
                updateData: mutation,
                affectedProjects: result.pendingAction.affectedProjects,
                affectedProjectIds: result.pendingAction.affectedProjectIds,
                scopeSource: result.pendingAction.scopeSource,
                fieldsToShow: result.pendingAction.fieldsToShow,
                requestId: result.pendingAction.requestId || result.requestId,
                previewDiff: result.pendingAction.previewDiff,
                confirmationId, // ID unique pour l'idempotency
                expectedUpdatedAtById: result.pendingAction.expectedUpdatedAtById,
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
                  proposedMutation: result.proposedMutation as UpdateData,
                  totalProjectsCount: result.totalProjectsCount,
                },
                // Note: requestId peut être stocké dans un champ séparé si nécessaire
              },
            ]);
          } else {
            // Question généraliste (Groq)
            // 🔒 Tracker dans ConversationMemory (chat uniquement)
            trackChatMessage(sessionIdRef.current, 'user', currentInput);
            trackChatMessage(sessionIdRef.current, 'assistant', result.response);
            debugMemoryState(sessionIdRef.current);

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
