/**
 * Query filters for project filtering
 *
 * This is the canonical source of truth for query filter types.
 */

// Type pour les filtres de requête extraits par l'IA
export interface QueryFilters {
  status?: string;
  minProgress?: number;
  maxProgress?: number;
  collab?: string;
  style?: string;
  label?: string;
  labelFinal?: string;
  hasDeadline?: boolean;
  name?: string;
  noProgress?: boolean;
}
