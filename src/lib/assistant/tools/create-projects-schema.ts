import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().describe('Le nom du projet (obligatoire). Clé JSON: "name".'),
  // Style musical - accepter les valeurs enum ou string vide (sera normalisé dans execute)
  style: z
    .enum(['Techno', 'House', 'DNB', 'Dubstep', 'Trance'])
    .nullable()
    .optional()
    .describe(
      'Le style musical. Valeurs possibles: Techno, House, DNB, Dubstep, Trance. Peut être null ou omis.'
    ),
  // Accepter string ou array de string pour collab (l'IA envoie souvent un array)
  collab: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional()
    .describe('Collaborateur (String ou Array). Peut être null ou omis.'),
  status: z
    .enum(['EN_COURS', 'TERMINE', 'ANNULE', 'A_REWORK', 'GHOST_PRODUCTION', 'ARCHIVE'])
    .nullable()
    .optional()
    .describe(
      'Statut initial. Valeurs possibles: EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE. Par défaut: EN_COURS.'
    ),
  // Accepter string YYYY-MM-DD ou objet (fix pour hallucination IA)
  deadline: z
    .union([
      z.string(),
      z.object({
        date: z.string(),
      }),
    ])
    .nullable()
    .optional()
    .transform((val) => {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && 'date' in val) {
        return val.date;
      }
      return null;
    })
    .describe('Date butoir au format ISO YYYY-MM-DD. Peut être null ou omis.'),
  label: z.string().nullable().optional().describe('Label. Peut être null ou omis.'),
});
