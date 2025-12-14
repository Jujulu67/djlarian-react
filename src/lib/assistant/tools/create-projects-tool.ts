import { tool } from 'ai';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

interface CreateProjectsToolParams {
  getTargetUserId: () => Promise<string | null>;
  normalizedInput: string;
  isTestMode?: boolean;
}

export const createCreateProjectsTool = ({
  getTargetUserId,
  normalizedInput,
  isTestMode = false,
}: CreateProjectsToolParams) => {
  // Définir le schéma directement dans la fonction (comme les autres outils)
  const parameters = z.object({
    name: z.string().describe('Le nom du projet (obligatoire). Clé JSON: "name".'),
    style: z
      .enum(['Techno', 'House', 'DNB', 'Dubstep', 'Trance'])
      .optional()
      .describe(
        'Le style musical. Valeurs possibles: Techno, House, DNB, Dubstep, Trance. Peut être omis.'
      ),
    collab: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Collaborateur (String ou Array). Peut être omis.'),
    status: z
      .enum(['EN_COURS', 'TERMINE', 'ANNULE', 'A_REWORK', 'GHOST_PRODUCTION', 'ARCHIVE'])
      .optional()
      .describe(
        'Statut initial. Valeurs possibles: EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE. Par défaut: EN_COURS.'
      ),
    deadline: z
      .string()
      .optional()
      .describe('Date butoir au format ISO YYYY-MM-DD. Peut être omis.'),
    label: z.string().optional().describe('Label. Peut être omis.'),
  });

  return tool({
    // IMPORTANT: Instructions très explicites pour éviter les erreurs de validation
    // Le modèle 8B a tendance à halluctiner des clés (nom au lieu de name) ou des types (array au lieu de string)
    // CRITIQUE: Utilisez UNIQUEMENT le format JSON fourni par le SDK, JAMAIS de format XML
    description: `Crée un nouveau projet musical.
        ⚠️ FORMAT D'APPEL CRITIQUE:
        - Utilisez UNIQUEMENT le format JSON fourni par le système, JAMAIS de format XML
        - ❌ INCORRECT: <function=createProjects>{"name": "toto"}</function>
        - ✅ CORRECT: Utilisez directement l'outil avec les paramètres JSON
        
        RÈGLES STRICTES JSON:
        - Utilisez la clé "name" (et non "nom").
        - "collab" doit être une STRING (ex: "Martin"), PAS un tableau.
        - "style" doit être une des valeurs exactes ou null.
        - Ne pas inventer de clés (pas de descriptions, pas de sentiment).`,
    parameters,
    // @ts-expect-error - SDK AI v5 type inference issue
    execute: async ({
      name,
      style,
      collab,
      status,
      deadline,
      label,
    }: z.infer<typeof parameters>) => {
      try {
        // Validation manuelle supplémentaire pour sécuriser les inputs "créatifs" de l'IA
        if (!name) throw new Error('Le nom est obligatoire.');

        // Normalisation des inputs
        let finalCollab: string | null = null;
        if (Array.isArray(collab)) {
          finalCollab = collab.join(', ');
        } else if (collab) {
          finalCollab = collab;
        }

        let finalStyle: string | null = null;
        if (style) {
          // Vérifier que le style est valide
          const validStyles = ['Techno', 'House', 'DNB', 'Dubstep', 'Trance'];
          if (validStyles.includes(style)) {
            finalStyle = style;
          }
        }

        let finalStatus = 'EN_COURS'; // Default
        if (
          status &&
          ['EN_COURS', 'TERMINE', 'ANNULE', 'A_REWORK', 'GHOST_PRODUCTION', 'ARCHIVE'].includes(
            status
          )
        ) {
          finalStatus = status;
        }
        const targetUserId = await getTargetUserId();
        if (!targetUserId) {
          return { message: "Impossible de déterminer l'utilisateur cible." };
        }

        if (isTestMode) {
          return {
            message: `[TEST MODE] Projet "${name}" créé avec succès (Style: ${style || 'N/A'}, Collab: ${collab || 'N/A'}).`,
            project: { name, style, collab, status, deadline, label },
          };
        }

        // Calculer l'ordre
        const maxOrderProject = await prisma.project.findFirst({
          where: { userId: targetUserId },
          orderBy: { order: 'desc' },
          select: { order: true },
        });
        const newOrder = (maxOrderProject?.order ?? -1) + 1;

        // Créer le projet
        const newProject = await prisma.project.create({
          data: {
            userId: targetUserId,
            name: name,
            style: finalStyle || null,
            collab: finalCollab || null,
            status: finalStatus,
            deadline: deadline ? new Date(deadline) : null,
            label: label || null,
            order: newOrder,
          },
        });

        revalidatePath('/projects');

        return {
          message: `C'est fait ! Le projet "${newProject.name}" a été créé.${finalStyle ? ` Style: ${finalStyle}.` : ''}`,
          project: newProject,
        };
      } catch (error) {
        console.error('[CreateProjectsTool] Error:', error);
        return { message: 'Une erreur est survenue lors de la création du projet.' };
      }
    },
  });
};
