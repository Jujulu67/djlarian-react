/**
 * Types partagés pour l'assistant
 */

export interface ParseQueryResult {
  filters: Record<string, any>;
  type: string;
  understood: boolean;
  clarification: string | null;
  lang?: string;
  isConversational?: boolean;
  fieldsToShow?: string[];
  createData?: {
    name: string;
    collab?: string;
    deadline?: string;
    progress?: number;
    status?: string;
    style?: string;
  };
  updateData?: {
    // Filtres pour identifier les projets à modifier
    minProgress?: number;
    maxProgress?: number;
    status?: string;
    hasDeadline?: boolean;
    deadlineDate?: string;
    noProgress?: boolean;
    // Nouvelles valeurs à appliquer
    newProgress?: number;
    newStatus?: string;
    newDeadline?: string | null;
    pushDeadlineBy?: {
      days?: number;
      weeks?: number;
      months?: number;
    };
    newCollab?: string;
    newStyle?: string;
    newLabel?: string;
    newLabelFinal?: string;
    // Ajout de notes
    projectName?: string;
    newNote?: string;
  };
}
