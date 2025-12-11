'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, X, Loader2, Trash2 } from 'lucide-react';
import type { Project } from '@/components/projects/types';

// Tooltip simple et rapide
const SimpleTooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
  return (
    <div className="group/tooltip relative flex items-center min-w-0">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block z-50 whitespace-nowrap px-2 py-1 bg-gray-900/95 backdrop-blur border border-white/10 rounded text-[10px] text-white shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
      </div>
    </div>
  );
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: {
    projects: Project[];
    type: 'count' | 'list' | 'search' | 'create' | 'update';
    fieldsToShow: string[];
  };
  updateConfirmation?: {
    filters: QueryFilters;
    updateData: {
      newProgress?: number;
      newStatus?: string;
      newDeadline?: string;
      pushDeadlineBy?: {
        days?: number;
        weeks?: number;
        months?: number;
      };
      newCollab?: string;
      newStyle?: string;
      newLabel?: string;
      newLabelFinal?: string;
    };
    affectedProjects: Project[];
  };
}

interface ProjectAssistantProps {
  projects: Project[];
}

// Type pour les filtres de requête extraits par l'IA
interface QueryFilters {
  status?: string;
  minProgress?: number;
  maxProgress?: number;
  collab?: string;
  style?: string;
  label?: string;
  hasDeadline?: boolean;
  name?: string;
  noProgress?: boolean; // Filtre pour les projets sans progression renseignée
}

interface ParsedQuery {
  filters: QueryFilters;
  type: 'count' | 'list' | 'search' | 'create' | 'update';
  understood: boolean;
  clarification?: string;
  fieldsToShow?: string[];
  isConversational?: boolean; // Added for conversational responses
  createData?: {
    name: string;
    collab?: string;
    deadline?: string; // ISO date string
    progress?: number;
    status?: string;
    style?: string;
  };
  updateData?: {
    minProgress?: number;
    maxProgress?: number;
    status?: string;
    hasDeadline?: boolean;
    deadlineDate?: string;
    noProgress?: boolean;
    newProgress?: number;
    newStatus?: string;
    newDeadline?: string;
    pushDeadlineBy?: {
      days?: number;
      weeks?: number;
      months?: number;
    };
    newCollab?: string;
    newStyle?: string;
    newLabel?: string;
    newLabelFinal?: string;
  };
  lang?: string;
}

// Composant pour l'affichage riche des résultats
function ProjectResultsView({
  projects,
  fieldsToShow,
}: {
  projects: Project[];
  fieldsToShow: string[];
}) {
  if (!projects.length) return null;

  // Mode ultra-compact si on affiche beaucoup de projets (plus de 5)
  const isCompact = projects.length > 5;

  // Champs à afficher (garantir un fallback)
  const columns = fieldsToShow.length > 0 ? fieldsToShow : ['progress'];

  // Largeurs fixes pour l'alignement type tableau
  const getColWidth = (field: string) => {
    switch (field) {
      case 'releaseDate':
        return 'w-[85px]';
      case 'deadline':
        return 'w-[85px]';
      case 'progress':
        return 'w-[45px]';
      case 'collab':
        return 'w-[100px]'; // Un peu plus large pour les noms
      case 'style':
        return 'w-[80px]';
      case 'status':
        return 'w-[70px]';
      default:
        return 'w-auto';
    }
  };

  return (
    <div className={`mt-3 w-full ${isCompact ? 'grid grid-cols-1 gap-1.5' : 'space-y-2'}`}>
      {projects.slice(0, 50).map((project) => {
        // Couleur de statut
        const statusColor =
          project.status === 'TERMINE'
            ? 'bg-green-500'
            : project.status === 'EN_COURS'
              ? 'bg-blue-500'
              : project.status === 'ANNULE'
                ? 'bg-red-500'
                : project.status === 'GHOST_PRODUCTION'
                  ? 'bg-purple-500'
                  : 'bg-slate-500';

        const statusBorder =
          project.status === 'TERMINE'
            ? 'border-l-green-500'
            : project.status === 'EN_COURS'
              ? 'border-l-blue-500'
              : project.status === 'ANNULE'
                ? 'border-l-red-500'
                : project.status === 'GHOST_PRODUCTION'
                  ? 'border-l-purple-500'
                  : 'border-l-slate-500';

        return (
          <div
            key={project.id}
            className={`
              group relative rounded-md bg-white/5 border border-white/10 border-l-[3px]
              ${statusBorder}
              hover:bg-white/10 transition-all duration-200 
              ${isCompact ? 'py-2 px-3' : 'p-3'}
            `}
          >
            {/* Barre de progression subtile en fond (bas de carte) */}
            {(project.progress || 0) > 0 && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-white/10 w-full rounded-b-md overflow-hidden">
                <div
                  className={`h-full ${statusColor} opacity-50`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3 relative z-10">
              {/* Nom */}
              <div className="flex items-center gap-2 min-w-[200px] flex-1">
                <SimpleTooltip content={project.name}>
                  <span className="font-medium text-white text-xs truncate group-hover:text-purple-200 transition-colors cursor-default">
                    {project.name}
                  </span>
                </SimpleTooltip>
              </div>

              {/* Colonnes alignées */}
              <div className="flex items-center gap-2 text-[10px] sm:text-xs shrink-0">
                {columns.map((field) => {
                  const widthClass = getColWidth(field);

                  // Rendu du contenu de la cellule
                  const renderCell = () => {
                    switch (field) {
                      case 'releaseDate':
                        if (!project.releaseDate) return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip
                            content={`Sortie : ${new Date(project.releaseDate).toLocaleDateString()}`}
                          >
                            <div className="flex items-center gap-1 text-purple-300 cursor-default">
                              <span>🚀</span>
                              <span className="truncate">
                                {new Date(project.releaseDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })}
                              </span>
                            </div>
                          </SimpleTooltip>
                        );
                      case 'deadline':
                        if (!project.deadline) return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip
                            content={`Deadline : ${new Date(project.deadline).toLocaleDateString()}`}
                          >
                            <div className="flex items-center gap-1 text-orange-300 cursor-default">
                              <span>📅</span>
                              <span className="truncate">
                                {new Date(project.deadline).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                })}
                              </span>
                            </div>
                          </SimpleTooltip>
                        );
                      case 'progress':
                        if (project.progress === null || project.progress === undefined)
                          return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip content={`${project.progress}% complété`}>
                            <div className="font-mono font-medium text-slate-300 bg-black/20 px-1 py-0.5 rounded text-center w-full cursor-default">
                              {project.progress}%
                            </div>
                          </SimpleTooltip>
                        );
                      case 'collab':
                        if (!project.collab) return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip content={`Collab : ${project.collab}`}>
                            <div className="flex items-center gap-1 text-blue-300 truncate cursor-default">
                              <span>🤝</span>
                              <span className="truncate">{project.collab}</span>
                            </div>
                          </SimpleTooltip>
                        );
                      case 'style':
                        if (!project.style) return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip content={`Style : ${project.style}`}>
                            <div className="text-pink-300 truncate px-1 cursor-default">
                              {project.style}
                            </div>
                          </SimpleTooltip>
                        );
                      case 'status':
                        if (!project.status) return <span className="text-slate-600">-</span>;
                        return (
                          <SimpleTooltip content={project.status}>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold truncate cursor-default">
                              {project.status === 'TERMINE'
                                ? 'Fini'
                                : project.status.replace('_', ' ')}
                            </span>
                          </SimpleTooltip>
                        );
                      default:
                        return null;
                    }
                  };

                  return (
                    <div
                      key={field}
                      className={`${widthClass} flex items-center justify-center sm:justify-start px-1`}
                    >
                      {renderCell()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {projects.length > 50 && (
        <p className="text-[10px] text-center text-slate-500 italic mt-1">
          + {projects.length - 50} autres...
        </p>
      )}
    </div>
  );
}

// Appel à l'API pour parser la requête avec l'IA
async function parseQueryWithAI(
  query: string,
  availableCollabs: string[],
  availableStyles: string[],
  projectCount: number
): Promise<ParsedQuery> {
  try {
    const response = await fetch('/api/assistant/parse-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context: {
          availableCollabs,
          availableStyles,
          projectCount,
          availableStatuses: [
            'EN_COURS',
            'TERMINE',
            'ANNULE',
            'A_REWORK',
            'GHOST_PRODUCTION',
            'ARCHIVE',
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse query');
    }

    return await response.json();
  } catch (error) {
    console.error('[Assistant] Erreur parsing IA:', error);
    // Fallback basique si l'API échoue
    return {
      filters: {},
      type: 'list',
      understood: false,
      clarification: "Désolé, je n'ai pas compris ta demande. Peux-tu reformuler ?",
    };
  }
}

// Filtrer les projets selon les critères
function filterProjects(
  projects: Project[],
  filters: QueryFilters
): {
  filtered: Project[];
  nullProgressCount: number;
  hasProgressFilter: boolean;
} {
  const hasProgressFilter = filters.minProgress !== undefined || filters.maxProgress !== undefined;
  let nullProgressCount = 0;

  const filtered = projects.filter((project) => {
    // Filtre par statut
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    // Filtre spécial : projets SANS progression renseignée (exclusif - ignore les autres filtres de progression)
    if (filters.noProgress) {
      // Vérifier que le projet n'a pas de progression renseignée
      const hasNoProgress = project.progress === null || project.progress === undefined;
      // Si on cherche des projets sans avancement, on retourne directement le résultat
      // (les autres filtres comme statut, collab, etc. sont déjà vérifiés avant)
      if (!hasNoProgress) {
        console.log(
          '[Filter Projects] ❌ Projet exclu (a une progression):',
          project.name,
          project.progress
        );
      }
      return hasNoProgress;
    }

    // Filtre par progression - exclure les null si on filtre par progression
    if (hasProgressFilter) {
      if (project.progress === null || project.progress === undefined) {
        nullProgressCount++;
        return false; // Exclure les projets sans progression renseignée
      }

      // Cas spécial : filtre exact (minProgress === maxProgress)
      if (
        filters.minProgress !== undefined &&
        filters.maxProgress !== undefined &&
        filters.minProgress === filters.maxProgress
      ) {
        // Filtre exact : le projet doit avoir exactement cette valeur
        if (project.progress !== filters.minProgress) {
          return false;
        }
      } else {
        // Filtre par progression min (strictement supérieur)
        if (filters.minProgress !== undefined && project.progress <= filters.minProgress) {
          return false;
        }

        // Filtre par progression max (strictement inférieur)
        if (filters.maxProgress !== undefined && project.progress >= filters.maxProgress) {
          return false;
        }
      }
    }

    // Filtre par collaborateur
    if (filters.collab) {
      if (!project.collab || !project.collab.toLowerCase().includes(filters.collab.toLowerCase())) {
        return false;
      }
    }

    // Filtre par style
    if (filters.style) {
      if (!project.style || !project.style.toLowerCase().includes(filters.style.toLowerCase())) {
        return false;
      }
    }

    // Filtre par nom
    if (filters.name) {
      if (!project.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
    }

    // Filtre par deadline
    if (filters.hasDeadline !== undefined) {
      const hasDeadline = !!project.deadline;
      if (filters.hasDeadline !== hasDeadline) {
        return false;
      }
    }

    return true;
  });

  return { filtered, nullProgressCount, hasProgressFilter };
}

export function ProjectAssistant({ projects }: ProjectAssistantProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Contexte de conversation pour les questions de suivi
  const [lastFilters, setLastFilters] = useState<QueryFilters | null>(null);
  const [lastResults, setLastResults] = useState<Project[]>([]);

  // Historique de la conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // État local des projets pour avoir les données à jour après modifications
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);

  // Ref pour stocker la version la plus récente des projets (pour éviter les problèmes de timing avec les mises à jour asynchrones)
  const localProjectsRef = useRef<Project[]>(projects);

  // Synchroniser avec les props quand elles changent
  useEffect(() => {
    setLocalProjects(projects);
    localProjectsRef.current = projects;
  }, [projects]);

  // Synchroniser le ref avec l'état local quand il change
  useEffect(() => {
    localProjectsRef.current = localProjects;
  }, [localProjects]);

  // Auto-scroll vers le bas lors de nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Extraire les collabs et styles uniques pour le contexte IA
  const uniqueCollabs = useMemo(
    () => [...new Set(localProjectsRef.current.filter((p) => p.collab).map((p) => p.collab!))],
    [localProjects]
  );

  const uniqueStyles = useMemo(
    () => [...new Set(localProjectsRef.current.filter((p) => p.style).map((p) => p.style!))],
    [localProjects]
  );

  const handleReset = () => {
    setMessages([]);
    setLastFilters(null);
    setLastResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);

    // Ajouter le message de l'utilisateur
    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      console.log('[Assistant] 📝 Question reçue:', currentInput);

      const cleanInput = currentInput.trim().toLowerCase();

      // Détecter les questions de suivi (références aux résultats précédents)
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

      // On considère comme follow-up si ça commence par un pattern OU si ça contient un mot clé de champ,
      // MAIS on exclut si ça ressemble à une NOUVELLE recherche (ex: "projets terminés", "projets avec X")
      const isFollowUp =
        followUpPatterns.some((p) => p.test(cleanInput)) &&
        lastResults.length > 0 &&
        !/projets?\s+(termin|en\s*cours|annul|archiv|avec|cont|sous|plus)/i.test(cleanInput);

      if (isFollowUp && lastResults.length > 0) {
        console.log('[Assistant] 🔄 Question de suivi détectée');

        // Détecter les champs demandés dans la question de suivi
        const newFieldsToShow: Set<string> = new Set();

        // "Tout" / "Infos"
        if (/tou(?:tes?|s)|infos?|détails?|all|everything/i.test(cleanInput)) {
          ['status', 'progress', 'collab', 'releaseDate', 'deadline', 'style'].forEach((f) =>
            newFieldsToShow.add(f)
          );
        } else {
          // Champs spécifiques
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
        return;
      }

      // L'IA parse la requête
      const parsed = await parseQueryWithAI(
        currentInput,
        uniqueCollabs,
        uniqueStyles,
        localProjectsRef.current.length
      );
      console.log('[Assistant] 🤖 IA a compris:', parsed);

      // Si c'est une réponse conversationnelle (pas sur les projets)
      if (parsed.isConversational && parsed.clarification) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: parsed.clarification || 'Je ne suis pas sûr de comprendre.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      if (!parsed.understood) {
        // Si pas compris mais on a des résultats précédents, proposer de les afficher
        let responseContent = parsed.clarification || "Je n'ai pas compris ta demande.";
        if (lastResults.length > 0) {
          responseContent = `Je n'ai pas compris. Tu veux revoir les ${lastResults.length} projets précédents ?`;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Si c'est une commande de création, créer le projet
      if (parsed.type === 'create' && parsed.createData) {
        const { createData } = parsed;

        // Valider que le nom est présent
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
          return;
        }

        try {
          // Créer le projet via l'API POST
          const createPayload: Record<string, any> = {
            name: createData.name,
            status: createData.status || 'EN_COURS',
          };

          if (createData.collab) {
            createPayload.collab = createData.collab;
          }

          if (createData.style) {
            createPayload.style = createData.style;
            console.log('[Assistant] Style ajouté au payload:', createData.style);
          } else {
            console.log('[Assistant] Aucun style dans createData:', createData);
          }

          console.log('[Assistant] Payload de création:', createPayload);

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

          // Si deadline ou progress sont fournis, mettre à jour le projet avec PATCH
          if (createData.deadline || createData.progress !== undefined) {
            const updatePayload: Record<string, any> = {};

            if (createData.deadline) {
              updatePayload.deadline = createData.deadline;
            }

            if (createData.progress !== undefined) {
              updatePayload.progress = createData.progress;
            }

            const updateResponse = await fetch(`/api/projects/${newProject.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatePayload),
            });

            if (!updateResponse.ok) {
              console.warn(
                '[Assistant] Erreur lors de la mise à jour du projet:',
                await updateResponse.json()
              );
            } else {
              // Mettre à jour le projet avec les nouvelles données
              const updatedResult = await updateResponse.json();
              Object.assign(newProject, updatedResult.data || updatedResult);
            }
          }

          // Message de succès
          const successMessage =
            parsed.lang === 'en'
              ? `Project "${createData.name}" created successfully!`
              : `Projet "${createData.name}" créé avec succès !`;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: successMessage,
              timestamp: new Date(),
            },
          ]);

          // Déclencher un événement personnalisé pour que ProjectsClient puisse gérer le scroll et l'animation
          // Envoyer les données du projet pour qu'il soit ajouté immédiatement à la liste
          const projectCreatedEvent = new CustomEvent('projectCreatedFromAssistant', {
            detail: { projectId: newProject.id, project: newProject },
          });
          window.dispatchEvent(projectCreatedEvent);

          // Rafraîchir les données serveur après un court délai pour laisser le temps à l'animation de démarrer
          setTimeout(() => {
            router.refresh();
          }, 100);
        } catch (error) {
          console.error('[Assistant] Erreur lors de la création:', error);
          const errorMessage =
            parsed.lang === 'en'
              ? `Sorry, I couldn't create the project: ${error instanceof Error ? error.message : 'Unknown error'}`
              : `Désolé, je n'ai pas pu créer le projet : ${error instanceof Error ? error.message : 'Erreur inconnue'}`;

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: errorMessage,
              timestamp: new Date(),
            },
          ]);
        }
        return;
      }

      // Si c'est une commande de modification, récupérer les projets affectés et demander confirmation
      if (parsed.type === 'update' && parsed.updateData) {
        const { updateData } = parsed;

        // Construire les filtres pour identifier les projets à modifier
        const updateFilters: QueryFilters = {};
        if (updateData.minProgress !== undefined) {
          updateFilters.minProgress = updateData.minProgress;
        }
        if (updateData.maxProgress !== undefined) {
          updateFilters.maxProgress = updateData.maxProgress;
        }
        if (updateData.status) {
          updateFilters.status = updateData.status;
        }
        if (updateData.hasDeadline !== undefined) {
          updateFilters.hasDeadline = updateData.hasDeadline;
        }
        if (updateData.noProgress) {
          updateFilters.noProgress = true;
        }

        // Filtrer les projets qui seront affectés
        // Utiliser le ref pour obtenir la valeur la plus récente (même si l'état n'est pas encore mis à jour)
        console.log('[Assistant] 🔍 Filtres de modification:', updateFilters);
        console.log(
          '[Assistant] 📊 Nombre de projets disponibles:',
          localProjectsRef.current.length
        );

        // Créer une copie profonde des projets pour éviter les problèmes de référence
        const currentProjects = localProjectsRef.current.map((p) => ({ ...p }));
        const { filtered: affectedProjects } = filterProjects(currentProjects, updateFilters);

        console.log('[Assistant] ✅ Projets filtrés côté client:', affectedProjects.length);
        console.log(
          '[Assistant] 📋 IDs des projets filtrés:',
          affectedProjects.map((p) => p.id)
        );
        console.log(
          '[Assistant] 📅 Deadlines des projets filtrés:',
          affectedProjects.map((p) => ({ id: p.id, name: p.name, deadline: p.deadline }))
        );
        console.log(
          '[Assistant] 🔍 Échantillon de localProjectsRef.current:',
          localProjectsRef.current
            .filter((p) => affectedProjects.some((ap) => ap.id === p.id))
            .slice(0, 3)
            .map((p) => ({ id: p.id, name: p.name, deadline: p.deadline }))
        );

        if (affectedProjects.length === 0) {
          const noProjectsMessage =
            parsed.lang === 'en'
              ? "I didn't find any projects matching the criteria."
              : "Je n'ai trouvé aucun projet correspondant aux critères.";
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: noProjectsMessage,
              timestamp: new Date(),
            },
          ]);
          return;
        }

        // Construire le message de description de la modification
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
          let pushText = '';
          const isNegative = (weeks && weeks < 0) || (days && days < 0) || (months && months < 0);

          if (weeks) {
            const absWeeks = Math.abs(weeks);
            pushText =
              parsed.lang === 'en'
                ? `${absWeeks} week${absWeeks > 1 ? 's' : ''}`
                : `${absWeeks} semaine${absWeeks > 1 ? 's' : ''}`;
          } else if (days) {
            const absDays = Math.abs(days);
            pushText =
              parsed.lang === 'en'
                ? `${absDays} day${absDays > 1 ? 's' : ''}`
                : `${absDays} jour${absDays > 1 ? 's' : ''}`;
          } else if (months) {
            const absMonths = Math.abs(months);
            pushText =
              parsed.lang === 'en'
                ? `${absMonths} month${absMonths > 1 ? 's' : ''}`
                : `${absMonths} mois`;
          }

          if (isNegative) {
            modifications.push(
              parsed.lang === 'en'
                ? `deadlines moved back by ${pushText}`
                : `deadlines reculées de ${pushText}`
            );
          } else {
            modifications.push(
              parsed.lang === 'en'
                ? `deadlines pushed by ${pushText}`
                : `deadlines décalées de ${pushText}`
            );
          }
        }
        if (updateData.newCollab) {
          modifications.push(
            parsed.lang === 'en'
              ? `collaborator to ${updateData.newCollab}`
              : `collaborateur à ${updateData.newCollab}`
          );
        }
        if (updateData.newStyle) {
          modifications.push(
            parsed.lang === 'en'
              ? `style to ${updateData.newStyle}`
              : `style à ${updateData.newStyle}`
          );
        }
        if (updateData.newLabel) {
          modifications.push(
            parsed.lang === 'en'
              ? `label to ${updateData.newLabel}`
              : `label à ${updateData.newLabel}`
          );
        }
        if (updateData.newLabelFinal) {
          modifications.push(
            parsed.lang === 'en'
              ? `final label to ${updateData.newLabelFinal}`
              : `label final à ${updateData.newLabelFinal}`
          );
        }

        const modificationText = modifications.join(parsed.lang === 'en' ? ' and ' : ' et ');

        // Message court de confirmation
        const confirmationMessage =
          parsed.lang === 'en'
            ? `I found ${affectedProjects.length} project(s) that will be modified.\n\nModification: ${modificationText}\n\nDo you want to proceed?`
            : `J'ai trouvé ${affectedProjects.length} projet(s) qui seront modifiés.\n\nModification : ${modificationText}\n\nVoulez-vous continuer ?`;

        // Afficher tous les détails comme pour "full détail"
        const fieldsToShow: string[] = [
          'status',
          'progress',
          'collab',
          'releaseDate',
          'deadline',
          'style',
        ];

        console.log('[Assistant] 📋 Confirmation update - Projets:', affectedProjects.length);
        console.log('[Assistant] 📋 Champs à afficher:', fieldsToShow);

        // Afficher le message de confirmation avec les projets
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date(),
            data: {
              projects: affectedProjects,
              type: 'update',
              fieldsToShow,
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
        return;
      }

      const { filters, type, fieldsToShow = [] } = parsed;
      console.log('[Assistant] 🔍 Filtres extraits:', { type, filters, fieldsToShow });

      const {
        filtered: filteredProjects,
        nullProgressCount,
        hasProgressFilter,
      } = filterProjects(localProjectsRef.current, filters);
      console.log(
        '[Assistant] 📊 Projets filtrés:',
        filteredProjects.length,
        '/',
        projects.length,
        hasProgressFilter ? `(${nullProgressCount} sans progression)` : '',
        filters.noProgress ? '(filtre noProgress activé)' : ''
      );

      // Construire le message texte sommaire
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

      // Sauvegarder le contexte pour les questions de suivi
      setLastFilters(filters);
      setLastResults(filteredProjects);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: textResponse,
          timestamp: new Date(),
          data:
            count > 0 && type !== 'count'
              ? {
                  projects: filteredProjects,
                  type,
                  fieldsToShow,
                }
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
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 glass-modern text-white rounded-full shadow-lg flex items-center justify-center glass-modern-hover glow-purple border border-purple-500/30 z-50"
        aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} className="text-purple-400" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[900px] max-w-[calc(100vw-3rem)] z-50 animate-in slide-in-from-bottom-5 fade-in duration-150 glass-modern bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[70vh] max-h-[800px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-slate-900/50 p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Sparkles size={18} className="text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm tracking-wide truncate">
                Assistant Projets IA
              </h3>
              <span className="text-xs text-purple-300 flex items-center gap-1 truncate">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                En ligne • {localProjects.length} projets
              </span>
            </div>

            <div className="flex items-center gap-1 ml-auto shrink-0">
              <SimpleTooltip content="Effacer la conversation">
                <button
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </SimpleTooltip>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Response Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                  <Sparkles size={32} className="text-purple-400" />
                </div>
                <h4 className="text-white font-medium mb-2">Comment puis-je t'aider ?</h4>
                <p className="text-sm text-slate-500 mb-6">
                  Pose-moi des questions sur tes {localProjects.length} projets en langage naturel.
                </p>

                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  <button
                    onClick={() => setInput('Combien de projets en cours ?')}
                    className="text-xs text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-purple-200"
                  >
                    "Combien de projets en cours ?"
                  </button>
                  {uniqueCollabs.length > 0 && (
                    <button
                      onClick={() => setInput(`Mes collabs avec ${uniqueCollabs[0]}`)}
                      className="text-xs text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-purple-200"
                    >
                      "Mes collabs avec {uniqueCollabs[0]}"
                    </button>
                  )}
                  <button
                    onClick={() => setInput('Projets qui sont presque finis')}
                    className="text-xs text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-purple-200"
                  >
                    "Projets qui sont presque finis"
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {/* Bulle de texte */}
                      <div
                        className={`
                            px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-sm'
                                : 'glass-modern bg-white/5 text-slate-200 rounded-tl-sm border border-white/10'
                            }
                          `}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {/* Contenu Riche (Cartes/Tableau) */}
                      {msg.data && msg.data.projects && msg.data.projects.length > 0 && (
                        <ProjectResultsView
                          projects={msg.data.projects}
                          fieldsToShow={msg.data.fieldsToShow || []}
                        />
                      )}

                      {/* Boutons de confirmation pour les modifications */}
                      {msg.updateConfirmation && (
                        <div className="mt-3 flex flex-col gap-2 w-full">
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setIsLoading(true);
                                try {
                                  const { filters, updateData } = msg.updateConfirmation!;
                                  const payload: any = {};

                                  // Ajouter les filtres
                                  if (filters.minProgress !== undefined) {
                                    payload.minProgress = filters.minProgress;
                                  }
                                  if (filters.maxProgress !== undefined) {
                                    payload.maxProgress = filters.maxProgress;
                                  }
                                  if (filters.status) {
                                    payload.status = filters.status;
                                  }
                                  if (filters.hasDeadline !== undefined) {
                                    payload.hasDeadline = filters.hasDeadline;
                                  }
                                  if (filters.noProgress) {
                                    payload.noProgress = true;
                                  }

                                  // Ajouter les nouvelles valeurs
                                  if (updateData.newProgress !== undefined) {
                                    payload.newProgress = updateData.newProgress;
                                  }
                                  if (updateData.newStatus) {
                                    payload.newStatus = updateData.newStatus;
                                  }
                                  if (updateData.newDeadline !== undefined) {
                                    // null est une valeur valide (indique la suppression)
                                    payload.newDeadline = updateData.newDeadline;
                                  }
                                  if (updateData.pushDeadlineBy) {
                                    payload.pushDeadlineBy = updateData.pushDeadlineBy;
                                  }
                                  if (updateData.newCollab) {
                                    payload.newCollab = updateData.newCollab;
                                  }
                                  if (updateData.newStyle) {
                                    payload.newStyle = updateData.newStyle;
                                  }
                                  if (updateData.newLabel) {
                                    payload.newLabel = updateData.newLabel;
                                  }
                                  if (updateData.newLabelFinal) {
                                    payload.newLabelFinal = updateData.newLabelFinal;
                                  }

                                  console.log(
                                    '[Assistant] 📤 Payload envoyé au serveur:',
                                    JSON.stringify(payload, null, 2)
                                  );
                                  console.log(
                                    '[Assistant] 📊 Nombre de projets attendus côté client:',
                                    msg.updateConfirmation!.affectedProjects.length
                                  );

                                  const response = await fetch('/api/projects/batch-update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload),
                                  });

                                  if (!response.ok) {
                                    const error = await response.json();
                                    throw new Error(
                                      error.error || 'Erreur lors de la modification'
                                    );
                                  }

                                  const result = await response.json();
                                  console.log(
                                    '[Assistant] 📥 Réponse du serveur:',
                                    JSON.stringify(result, null, 2)
                                  );
                                  const modifiedCount = result.data?.count || 0;
                                  const expectedCount =
                                    msg.updateConfirmation!.affectedProjects.length;
                                  console.log('[Assistant] 🔢 Comparaison:', {
                                    attendus: expectedCount,
                                    modifiés: modifiedCount,
                                    différence: modifiedCount - expectedCount,
                                  });

                                  // Avertir si le nombre ne correspond pas (peut arriver si les données côté client ne sont pas à jour)
                                  let successMessage = '';
                                  if (modifiedCount > 0) {
                                    if (modifiedCount !== expectedCount) {
                                      successMessage = `✅ ${modifiedCount} projet(s) modifié(s) avec succès ! (${expectedCount} projet(s) détecté(s) côté client, ${modifiedCount} modifié(s) côté serveur)`;
                                    } else {
                                      successMessage = `✅ ${modifiedCount} projet(s) modifié(s) avec succès !`;
                                    }
                                  } else {
                                    successMessage = "Aucun projet n'a été modifié.";
                                  }

                                  // Appliquer les nouvelles valeurs aux projets pour l'affichage immédiat
                                  // Utiliser le ref pour avoir les deadlines à jour (si une modification précédente a été faite)
                                  console.log(
                                    '[Assistant] 🔍 État du ref avant calcul updatedProjects:',
                                    localProjectsRef.current
                                      .filter((lp) =>
                                        msg.updateConfirmation!.affectedProjects.some(
                                          (ap) => ap.id === lp.id
                                        )
                                      )
                                      .slice(0, 3)
                                      .map((lp) => ({
                                        id: lp.id,
                                        name: lp.name,
                                        deadline: lp.deadline,
                                      }))
                                  );
                                  const updatedProjects =
                                    msg.updateConfirmation!.affectedProjects.map((p) => {
                                      // Chercher le projet dans localProjectsRef pour avoir sa deadline actuelle (peut avoir été modifiée précédemment)
                                      const currentProject =
                                        localProjectsRef.current.find((lp) => lp.id === p.id) || p;

                                      console.log('[Assistant] 🔍 Projet avant modification:', {
                                        id: p.id,
                                        name: p.name,
                                        deadlineOriginal: p.deadline,
                                        deadlineCurrent: currentProject.deadline,
                                        pushDeadlineBy: updateData.pushDeadlineBy,
                                      });

                                      let newDeadline = currentProject.deadline;

                                      // Si on décale les deadlines, calculer la nouvelle date à partir de la deadline actuelle
                                      // Les valeurs peuvent être négatives (pour reculer les deadlines)
                                      if (updateData.pushDeadlineBy && currentProject.deadline) {
                                        const currentDeadline = new Date(currentProject.deadline);
                                        const updatedDeadline = new Date(currentDeadline);

                                        if (updateData.pushDeadlineBy.days !== undefined) {
                                          updatedDeadline.setDate(
                                            updatedDeadline.getDate() +
                                              updateData.pushDeadlineBy.days
                                          );
                                        }
                                        if (updateData.pushDeadlineBy.weeks !== undefined) {
                                          updatedDeadline.setDate(
                                            updatedDeadline.getDate() +
                                              updateData.pushDeadlineBy.weeks * 7
                                          );
                                        }
                                        if (updateData.pushDeadlineBy.months !== undefined) {
                                          updatedDeadline.setMonth(
                                            updatedDeadline.getMonth() +
                                              updateData.pushDeadlineBy.months
                                          );
                                        }

                                        newDeadline = updatedDeadline.toISOString().split('T')[0];

                                        console.log('[Assistant] 📅 Calcul nouvelle deadline:', {
                                          id: p.id,
                                          name: p.name,
                                          deadlineAvant: currentProject.deadline,
                                          deadlineApres: newDeadline,
                                          decalage: updateData.pushDeadlineBy,
                                        });
                                      } else if (updateData.newDeadline !== undefined) {
                                        newDeadline = updateData.newDeadline || null;
                                      }

                                      const updatedProject = {
                                        ...currentProject,
                                        progress:
                                          updateData.newProgress !== undefined
                                            ? updateData.newProgress
                                            : currentProject.progress,
                                        status: updateData.newStatus || currentProject.status,
                                        deadline: newDeadline,
                                        collab: updateData.newCollab || currentProject.collab,
                                        style: updateData.newStyle || currentProject.style,
                                        label: updateData.newLabel || currentProject.label,
                                        labelFinal:
                                          updateData.newLabelFinal || currentProject.labelFinal,
                                      };

                                      console.log('[Assistant] ✅ Projet mis à jour:', {
                                        id: updatedProject.id,
                                        name: updatedProject.name,
                                        deadline: updatedProject.deadline,
                                      });

                                      return updatedProject;
                                    });

                                  console.log(
                                    '[Assistant] 📋 updatedProjects final:',
                                    updatedProjects.slice(0, 3).map((p) => ({
                                      id: p.id,
                                      name: p.name,
                                      deadline: p.deadline,
                                    }))
                                  );

                                  // Mettre à jour l'état local des projets avec les nouvelles valeurs
                                  // Utiliser un callback pour avoir accès à l'état le plus récent
                                  setLocalProjects((prevProjects) => {
                                    // Créer un map des projets mis à jour par ID pour un accès rapide
                                    const updatedProjectsMap = new Map(
                                      updatedProjects.map((up) => [up.id, up])
                                    );

                                    // Créer un set des IDs des projets affectés pour vérification rapide
                                    const affectedProjectIds = new Set(
                                      msg.updateConfirmation!.affectedProjects.map((p) => p.id)
                                    );

                                    const newProjects = prevProjects.map((project) => {
                                      // Si le projet est dans updatedProjects, utiliser la version mise à jour
                                      const updatedProject = updatedProjectsMap.get(project.id);
                                      if (updatedProject) {
                                        return updatedProject;
                                      }

                                      // Si le projet était affecté mais n'est pas dans updatedProjects,
                                      // appliquer les modifications manuellement
                                      if (affectedProjectIds.has(project.id)) {
                                        let newDeadline = project.deadline;

                                        // Si on décale les deadlines, calculer à partir de la deadline actuelle du projet
                                        // Les valeurs peuvent être négatives (pour reculer les deadlines)
                                        if (updateData.pushDeadlineBy && project.deadline) {
                                          const currentDeadline = new Date(project.deadline);
                                          const updatedDeadline = new Date(currentDeadline);

                                          if (updateData.pushDeadlineBy.days !== undefined) {
                                            updatedDeadline.setDate(
                                              updatedDeadline.getDate() +
                                                updateData.pushDeadlineBy.days
                                            );
                                          }
                                          if (updateData.pushDeadlineBy.weeks !== undefined) {
                                            updatedDeadline.setDate(
                                              updatedDeadline.getDate() +
                                                updateData.pushDeadlineBy.weeks * 7
                                            );
                                          }
                                          if (updateData.pushDeadlineBy.months !== undefined) {
                                            updatedDeadline.setMonth(
                                              updatedDeadline.getMonth() +
                                                updateData.pushDeadlineBy.months
                                            );
                                          }

                                          newDeadline = updatedDeadline.toISOString().split('T')[0];
                                        } else if (updateData.newDeadline !== undefined) {
                                          newDeadline = updateData.newDeadline || null;
                                        }

                                        return {
                                          ...project,
                                          progress:
                                            updateData.newProgress !== undefined
                                              ? updateData.newProgress
                                              : project.progress,
                                          status: updateData.newStatus || project.status,
                                          deadline: newDeadline,
                                          collab: updateData.newCollab || project.collab,
                                          style: updateData.newStyle || project.style,
                                          label: updateData.newLabel || project.label,
                                          labelFinal:
                                            updateData.newLabelFinal || project.labelFinal,
                                        };
                                      }

                                      return project;
                                    });

                                    // Mettre à jour le ref AVANT de retourner (pour que ce soit synchrone)
                                    localProjectsRef.current = newProjects;

                                    console.log(
                                      '[Assistant] 🔄 Ref mis à jour avec',
                                      newProjects.length,
                                      'projets. Échantillon:',
                                      newProjects
                                        .filter((p) => affectedProjectIds.has(p.id))
                                        .slice(0, 3)
                                        .map((p) => ({
                                          id: p.id,
                                          name: p.name,
                                          deadline: p.deadline,
                                        }))
                                    );

                                    return newProjects;
                                  });

                                  // Remplacer le message de confirmation par le message de succès avec les projets mis à jour
                                  setMessages((prev) =>
                                    prev.map((m, i) =>
                                      i === idx
                                        ? {
                                            ...m,
                                            content: successMessage,
                                            data: {
                                              projects: updatedProjects,
                                              type: 'update',
                                              fieldsToShow: [
                                                'status',
                                                'progress',
                                                'collab',
                                                'releaseDate',
                                                'deadline',
                                                'style',
                                              ],
                                            },
                                            updateConfirmation: undefined,
                                          }
                                        : m
                                    )
                                  );

                                  // Déclencher un événement personnalisé pour que ProjectsClient puisse mettre à jour la liste
                                  const projectIds = msg.updateConfirmation!.affectedProjects.map(
                                    (p) => p.id
                                  );
                                  const projectsUpdatedEvent = new CustomEvent(
                                    'projectsUpdatedFromAssistant',
                                    {
                                      detail: {
                                        projectIds,
                                        updates: {
                                          progress: updateData.newProgress,
                                          status: updateData.newStatus,
                                          deadline: updateData.newDeadline,
                                          pushDeadlineBy: updateData.pushDeadlineBy,
                                          collab: updateData.newCollab,
                                          style: updateData.newStyle,
                                          label: updateData.newLabel,
                                          labelFinal: updateData.newLabelFinal,
                                        },
                                      },
                                    }
                                  );
                                  window.dispatchEvent(projectsUpdatedEvent);

                                  // Rafraîchir les données serveur après un court délai pour laisser le temps à l'animation de démarrer
                                  setTimeout(() => {
                                    router.refresh();
                                  }, 500);
                                } catch (error) {
                                  console.error(
                                    '[Assistant] Erreur lors de la modification:',
                                    error
                                  );
                                  const errorMessage = `❌ Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
                                  setMessages((prev) =>
                                    prev.map((m, i) =>
                                      i === idx
                                        ? {
                                            ...m,
                                            content: `${m.content}\n\n${errorMessage}`,
                                          }
                                        : m
                                    )
                                  );
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => {
                                setMessages((prev) =>
                                  prev.map((m, i) =>
                                    i === idx
                                      ? {
                                          ...m,
                                          content: `${m.content}\n\n❌ Modification annulée.`,
                                          updateConfirmation: undefined,
                                        }
                                      : m
                                  )
                                );
                              }}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] opacity-40 mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start w-full">
                    <div className="glass-modern bg-white/5 p-4 rounded-2xl rounded-tl-sm border border-white/10 flex items-center gap-2">
                      {/* Loading dots animation */}
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-slate-400 ml-2">Analyse en cours...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md"
          >
            <div className="relative flex items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pose ta question..."
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-sm"
                autoFocus
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white opacity-90 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/20"
                aria-label="Envoyer"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
