export type DialogStep = 'paste' | 'preview' | 'result';

export interface ImportResult {
  success: boolean;
  created: number;
  failed: number;
  errors?: Array<{ index: number; error: string }>;
  duplicatesExcluded?: number;
}
