export type ProjectStatus = 'EN_COURS' | 'TERMINE' | 'ANNULE' | 'A_REWORK' | 'GHOST_PRODUCTION';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'EN_COURS', label: 'En cours', color: 'blue' },
  { value: 'TERMINE', label: 'Terminé', color: 'green' },
  { value: 'ANNULE', label: 'Annulé', color: 'red' },
  { value: 'A_REWORK', label: 'A Rework', color: 'orange' },
  { value: 'GHOST_PRODUCTION', label: 'Ghost Prod', color: 'purple' },
];

export type LabelStatus = 'ACCEPTE' | 'EN_COURS' | 'REFUSE';

export const LABEL_OPTIONS: { value: LabelStatus; label: string; color: string }[] = [
  { value: 'ACCEPTE', label: 'Accepté', color: 'green' },
  { value: 'EN_COURS', label: 'En cours', color: 'blue' },
  { value: 'REFUSE', label: 'Refusé', color: 'red' },
];

export interface Project {
  id: string;
  userId: string;
  order: number;
  name: string;
  style: string | null;
  status: ProjectStatus;
  collab: string | null;
  label: string | null;
  labelFinal: string | null;
  releaseDate: string | null;
  externalLink: string | null;
  streamsJ7: number | null;
  streamsJ14: number | null;
  streamsJ21: number | null;
  streamsJ28: number | null;
  streamsJ56: number | null;
  streamsJ84: number | null;
  createdAt: string;
  updatedAt: string;
  User?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export type EditableField =
  | 'name'
  | 'style'
  | 'status'
  | 'collab'
  | 'label'
  | 'labelFinal'
  | 'releaseDate'
  | 'externalLink'
  | 'streamsJ7'
  | 'streamsJ14'
  | 'streamsJ21'
  | 'streamsJ28'
  | 'streamsJ56'
  | 'streamsJ84';

export type CellType = 'text' | 'select' | 'date' | 'number' | 'link';
