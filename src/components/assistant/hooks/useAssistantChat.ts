'use client';

/**
 * Hook managing all ProjectAssistant state and logic
 * Extracted from ProjectAssistant.tsx for better maintainability
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/components/projects/types';
import { findProjectCandidates } from '@/lib/utils/findProjectCandidates';
import { generateNoteFromContent } from '@/lib/assistant/parsers/note-generator';

import type { Message, QueryFilters } from '../types';
import { formatAssistantMessage } from '../utils/formatMessage';
import { parseQueryWithAI } from '../utils/parseQueryWithAI';
import { filterProjects } from '../utils/filterProjects';

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
  const [lastFilters, setLastFilters] = useState<QueryFilters | null>(null);
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
        const cleanInput = currentInput.trim().toLowerCase();

        // Follow-up detection patterns (for showing fields only, NOT updates)
        const followUpPatterns = [
          /^"?donne/i,
          /^"?montre/i,
          /^"?liste/i,
          /^"?affiche/i,
          /^"?quels?\s/i,
          /^"?quelles?\s/i,
          /^"?lesquels/i,
          /les\s*noms/i,
          /leurs?\s*noms/i,
          /c['']?est\s*(quoi|lesquels|qui)/i,
          /^"?et\s*(eux|ceux)/i,
          /^qui\s*sont/i,
          /^quel\s*est/i,
          /^quelle\s*est/i,
          /date/i,
          /quand/i,
          /statut/i,
          /avancement/i,
          /collab/i,
          /infos?/i,
          /détails?/i,
          /tout/i,
        ];

        // Exclude update commands from follow-up detection
        const isUpdateCommand =
          /(?:passe|met|mets|change|modif|marque|set|update|pousse|augmente|diminue|cahnge|chnage|chang|pase|pass|modifi|modifie|mets?)\s+(?:(?:les?|la|le|l'|leurs?|son|sa|ses|mes|mon|ma|nos|notre|vos|votre)\s+)?(?:collab|status|statut|progress|avancement|deadline|style|projets?)/i.test(
            cleanInput
          ) ||
          /(?:collab|status|statut|progress|avancement|deadline|style)\s+(?:à|a|en)\s+/i.test(
            cleanInput
          );

        const isFollowUp =
          !isUpdateCommand &&
          followUpPatterns.some((p) => p.test(cleanInput)) &&
          lastResults.length > 0 &&
          // Si la requête contient des filtres explicites (statuts, collab, etc), ce n'est pas un simple follow-up d'affichage
          !/(?:termin|en\s*cours|annul|archiv|ghost|avec\s+|sous\s+|plus\s+de|sans\s*avancement|projets?\s+)/i.test(
            cleanInput
          );

        // Handle follow-up questions
        if (isFollowUp && lastResults.length > 0) {
          console.log('[Assistant] 🔄 Question de suivi détectée');

          const newFieldsToShow: Set<string> = new Set();
          if (/tou(?:tes?|s)|infos?|détails?|all|everything/i.test(cleanInput)) {
            ['status', 'progress', 'collab', 'releaseDate', 'deadline', 'style'].forEach((f) =>
              newFieldsToShow.add(f)
            );
          } else {
            if (/date|sortie|release|quand/i.test(cleanInput)) newFieldsToShow.add('releaseDate');
            if (/deadline/i.test(cleanInput)) newFieldsToShow.add('deadline');
            if (/collab/i.test(cleanInput)) newFieldsToShow.add('collab');
            if (/statut|status/i.test(cleanInput)) newFieldsToShow.add('status');
            if (/avancement|progress/i.test(cleanInput)) newFieldsToShow.add('progress');
            if (/style|genre/i.test(cleanInput)) newFieldsToShow.add('style');
          }

          const fieldsArray = Array.from(newFieldsToShow);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Voici les ${fieldsArray.length > 2 ? 'détails complets' : 'infos'} pour ces ${lastResults.length} projets :`,
              timestamp: new Date(),
              data: {
                projects: lastResults,
                type: 'list',
                fieldsToShow: fieldsArray.length > 0 ? fieldsArray : ['status', 'progress'],
              },
            },
          ]);
          setIsLoading(false);
          return;
        }

        // Parse with AI
        const parsed = await parseQueryWithAI(
          currentInput,
          uniqueCollabs,
          uniqueStyles,
          localProjectsRef.current.length,
          conversationHistory,
          lastFilters ?? undefined
        );
        console.log('[Assistant] 🤖 IA a compris:', parsed);

        // Conversational response
        if (parsed.isConversational && parsed.clarification) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: formatAssistantMessage(
              parsed.clarification || 'Je ne suis pas sûr de comprendre.'
            ),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', content: currentInput, timestamp: new Date() },
            { role: 'assistant', content: assistantMessage.content, timestamp: new Date() },
          ]);
          setIsLoading(false);
          return;
        }

        // Not understood
        if (!parsed.understood) {
          let responseContent = parsed.clarification || "Je n'ai pas compris ta demande.";
          if (lastResults.length > 0) {
            responseContent = `Je n'ai pas compris. Tu veux revoir les ${lastResults.length} projets précédents ?`;
          }
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: formatAssistantMessage(responseContent),
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
          return;
        }

        // CREATE command
        if (parsed.type === 'create' && parsed.createData) {
          const { createData } = parsed;
          if (!createData.name || createData.name.trim() === '') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content:
                  parsed.lang === 'en'
                    ? 'I need a project name to create it. Please provide a name.'
                    : "J'ai besoin d'un nom de projet pour le créer. Peux-tu me donner un nom ?",
                timestamp: new Date(),
              },
            ]);
            setIsLoading(false);
            return;
          }

          try {
            const createPayload: Record<string, unknown> = {
              name: createData.name,
              status: createData.status || 'EN_COURS',
            };
            if (createData.collab) createPayload.collab = createData.collab;
            if (createData.style) createPayload.style = createData.style;

            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(createPayload),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Erreur lors de la création');
            }

            const result = await response.json();
            const newProject = result.data || result;

            if (createData.deadline || createData.progress !== undefined) {
              const updatePayload: Record<string, unknown> = {};
              if (createData.deadline) updatePayload.deadline = createData.deadline;
              if (createData.progress !== undefined) updatePayload.progress = createData.progress;

              const updateResponse = await fetch(`/api/projects/${newProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
              });

              if (updateResponse.ok) {
                const updatedResult = await updateResponse.json();
                Object.assign(newProject, updatedResult.data || updatedResult);
              }
            }

            const successMessage =
              parsed.lang === 'en'
                ? `Project "${createData.name}" created successfully!`
                : `Projet "${createData.name}" créé avec succès !`;

            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: successMessage, timestamp: new Date() },
            ]);

            window.dispatchEvent(
              new CustomEvent('projectCreatedFromAssistant', {
                detail: { projectId: newProject.id, project: newProject },
              })
            );

            setTimeout(() => router.refresh(), 100);
          } catch (error) {
            const errorMessage =
              parsed.lang === 'en'
                ? `Sorry, I couldn't create the project: ${error instanceof Error ? error.message : 'Unknown error'}`
                : `Désolé, je n'ai pas pu créer le projet : ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: errorMessage, timestamp: new Date() },
            ]);
          }
          setIsLoading(false);
          return;
        }

        // UPDATE command
        if (parsed.type === 'update' && parsed.updateData) {
          const { updateData } = parsed;

          // Special case: add note to specific project
          if (updateData.projectName && updateData.newNote) {
            const currentProjects = localProjectsRef.current.map((p) => ({ ...p }));
            const candidates = findProjectCandidates(updateData.projectName, currentProjects, 5);
            const validCandidates = candidates.filter((c) => c.score >= 80);

            if (validCandidates.length === 0) {
              const suggestions = currentProjects
                .slice(0, 5)
                .map((p) => p.name)
                .join(', ');
              const noProjectMessage =
                parsed.lang === 'en'
                  ? `No project found matching "${updateData.projectName}".${suggestions ? ` Available projects: ${suggestions}` : ''}`
                  : `Aucun projet trouvé correspondant à "${updateData.projectName}".${suggestions ? ` Projets disponibles : ${suggestions}` : ''}`;
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: noProjectMessage, timestamp: new Date() },
              ]);
              setIsLoading(false);
              return;
            }

            const targetProject = validCandidates[0].project;
            const generatedNote = generateNoteFromContent(updateData.newNote);
            const confirmationMessage =
              parsed.lang === 'en'
                ? `I will add a note to the project "${targetProject.name}".\n\nPreview of the note that will be added:\n\n${generatedNote}\n\nDo you want to proceed?`
                : `Je vais ajouter une note au projet "${targetProject.name}".\n\nAperçu de la note qui sera ajoutée :\n\n${generatedNote}\n\nVoulez-vous continuer ?`;

            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: confirmationMessage,
                timestamp: new Date(),
                data: { projects: [targetProject], type: 'update', fieldsToShow: ['note'] },
                updateConfirmation: {
                  filters: {},
                  updateData: { projectName: updateData.projectName, newNote: updateData.newNote },
                  affectedProjects: [targetProject],
                },
              },
            ]);
            setIsLoading(false);
            return;
          }

          // Normal case: bulk update by criteria
          const updateFilters: QueryFilters = { ...parsed.filters };
          if (updateData.minProgress !== undefined)
            updateFilters.minProgress = updateData.minProgress;
          if (updateData.maxProgress !== undefined)
            updateFilters.maxProgress = updateData.maxProgress;
          if (updateData.status) updateFilters.status = updateData.status;
          if (updateData.hasDeadline !== undefined)
            updateFilters.hasDeadline = updateData.hasDeadline;
          if (updateData.noProgress) updateFilters.noProgress = true;

          // CLEANUP SAFETY: Si un filtre est identique à la nouvelle valeur de l'update, on le supprime.
          // Cela évite de filtrer par la cible de la modification (ex: "met en TERMINE", filtre=TERMINE, newStatus=TERMINE -> on ne veut pas filtrer par TERMINE)
          if (updateData.newStatus && updateFilters.status === updateData.newStatus) {
            delete updateFilters.status;
          }
          if (
            updateData.newCollab &&
            updateFilters.collab &&
            updateFilters.collab.toLowerCase() === updateData.newCollab.toLowerCase()
          ) {
            delete updateFilters.collab;
          }
          if (
            updateData.newStyle &&
            updateFilters.style &&
            updateFilters.style.toLowerCase() === updateData.newStyle.toLowerCase()
          ) {
            delete updateFilters.style;
          }
          if (
            updateData.newLabel &&
            updateFilters.label &&
            updateFilters.label.toLowerCase() === updateData.newLabel.toLowerCase()
          ) {
            delete updateFilters.label;
          }
          // Pour la progression, c'est déjà géré par extractNewProgress qui évite de setter le filtre si c'est une update,
          // mais on peut ajouter une sécurité supplémentaire
          if (updateData.newProgress !== undefined) {
            if (
              updateFilters.minProgress === updateData.newProgress &&
              updateFilters.maxProgress === updateData.newProgress
            ) {
              delete updateFilters.minProgress;
              delete updateFilters.maxProgress;
            }
          }

          const currentProjects = localProjectsRef.current.map((p) => ({ ...p }));
          const hasNoSpecificFilters = Object.keys(updateFilters).length === 0;
          const hasLastResults = lastResults.length > 0;
          const isImplicitReference =
            /(?:les|leur|leurs|les\s+projets|passe|met|change|modifie|pousse|augmente|diminue|cahnge|chnage|chang|pase|pass|modifi|modifie|mets?)/i.test(
              currentInput
            );

          let affectedProjects: Project[];
          if (hasNoSpecificFilters && hasLastResults && isImplicitReference) {
            const lastResultIds = new Set(lastResults.map((p) => p.id));
            affectedProjects = currentProjects.filter((p) => lastResultIds.has(p.id));
          } else {
            const { filtered } = filterProjects(currentProjects, updateFilters);
            affectedProjects = filtered;
          }

          if (affectedProjects.length === 0) {
            const noProjectsMessage =
              parsed.lang === 'en'
                ? "I didn't find any projects matching the criteria."
                : "Je n'ai trouvé aucun projet correspondant aux critères.";
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: noProjectsMessage, timestamp: new Date() },
            ]);
            setIsLoading(false);
            return;
          }

          // Build modification description
          const modifications: string[] = [];
          if (updateData.newProgress !== undefined) {
            modifications.push(
              parsed.lang === 'en'
                ? `progress to ${updateData.newProgress}%`
                : `progression à ${updateData.newProgress}%`
            );
          }
          if (updateData.newStatus) {
            modifications.push(
              parsed.lang === 'en'
                ? `status to ${updateData.newStatus}`
                : `statut à ${updateData.newStatus}`
            );
          }
          if (updateData.newDeadline) {
            modifications.push(
              parsed.lang === 'en'
                ? `deadline to ${updateData.newDeadline}`
                : `deadline à ${updateData.newDeadline}`
            );
          }
          if (updateData.pushDeadlineBy) {
            const { days, weeks, months } = updateData.pushDeadlineBy;
            const isNegative = (weeks && weeks < 0) || (days && days < 0) || (months && months < 0);
            let pushText = '';
            if (weeks) pushText = `${Math.abs(weeks)} semaine${Math.abs(weeks) > 1 ? 's' : ''}`;
            else if (days) pushText = `${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
            else if (months) pushText = `${Math.abs(months)} mois`;
            modifications.push(
              isNegative ? `deadlines reculées de ${pushText}` : `deadlines décalées de ${pushText}`
            );
          }
          if (updateData.newCollab) modifications.push(`collaborateur à ${updateData.newCollab}`);
          if (updateData.newStyle) modifications.push(`style à ${updateData.newStyle}`);
          if (updateData.newLabel) modifications.push(`label à ${updateData.newLabel}`);
          if (updateData.newLabelFinal)
            modifications.push(`label final à ${updateData.newLabelFinal}`);

          const modificationText = modifications.join(parsed.lang === 'en' ? ' and ' : ' et ');
          const confirmationMessage =
            parsed.lang === 'en'
              ? `I found ${affectedProjects.length} project(s) that will be modified.\n\nModification: ${modificationText}\n\nDo you want to proceed?`
              : `J'ai trouvé ${affectedProjects.length} projet(s) qui seront modifiés.\n\nModification : ${modificationText}\n\nVoulez-vous continuer ?`;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: confirmationMessage,
              timestamp: new Date(),
              data: {
                projects: affectedProjects,
                type: 'update',
                fieldsToShow: ['status', 'progress', 'collab', 'releaseDate', 'deadline', 'style'],
              },
              updateConfirmation: {
                filters: updateFilters,
                updateData: {
                  newProgress: updateData.newProgress,
                  newStatus: updateData.newStatus,
                  newDeadline: updateData.newDeadline,
                  pushDeadlineBy: updateData.pushDeadlineBy,
                  newCollab: updateData.newCollab,
                  newStyle: updateData.newStyle,
                  newLabel: updateData.newLabel,
                  newLabelFinal: updateData.newLabelFinal,
                },
                affectedProjects,
              },
            },
          ]);
          setIsLoading(false);
          return;
        }

        // LIST / COUNT / SEARCH
        const { filters, type, fieldsToShow = [] } = parsed;
        const {
          filtered: filteredProjects,
          nullProgressCount,
          hasProgressFilter,
        } = filterProjects(localProjectsRef.current, filters);

        const count = filteredProjects.length;
        let textResponse = '';

        if (count === 0) {
          textResponse = "Je n'ai trouvé aucun projet correspondant à ta recherche.";
        } else if (type === 'count') {
          textResponse = `Tu as ${count} projet${count > 1 ? 's' : ''} correspondant.`;
        } else {
          textResponse = `J'ai trouvé ${count} projet${count > 1 ? 's' : ''} :`;
        }

        if (nullProgressCount > 0 && filters.minProgress !== undefined) {
          textResponse += `\n(⚠️ ${nullProgressCount} sans progression ignorés)`;
        }

        setLastFilters(filters);
        setLastResults(filteredProjects);

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: formatAssistantMessage(textResponse),
            timestamp: new Date(),
            data:
              count > 0 && type !== 'count'
                ? { projects: filteredProjects, type, fieldsToShow }
                : undefined,
          },
        ]);
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
    [
      input,
      isLoading,
      lastResults,
      lastFilters,
      uniqueCollabs,
      uniqueStyles,
      conversationHistory,
      router,
    ]
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
