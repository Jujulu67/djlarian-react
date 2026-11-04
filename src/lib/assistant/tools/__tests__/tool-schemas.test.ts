import { z } from 'zod';

import { createCreateProjectsTool } from '../create-projects-tool';
import { createGetProjectsTool } from '../get-projects-tool';
import { createUpdateProjectsTool } from '../update-projects-tool';

// `ai` est uniquement ESM : on remplace `tool()` par l'identité pour inspecter la définition
jest.mock('ai', () => ({
  generateText: jest.fn(),
  tool: (definition: unknown) => definition,
}));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

type ToolDefinition = { inputSchema?: unknown; parameters?: unknown };

const getTargetUserId = async () => 'user-test';

/**
 * Le SDK ai lit le schéma d'un outil dans `inputSchema`. Avec l'ancienne clé `parameters`,
 * le modèle recevait un schéma vide et inventait les arguments.
 */
describe('Schémas des outils de l’assistant', () => {
  const tools: Record<string, ToolDefinition> = {
    getProjects: createGetProjectsTool({
      getTargetUserId,
      normalizedInput: '',
      isTestMode: true,
    }) as ToolDefinition,
    createProjects: createCreateProjectsTool({
      getTargetUserId,
      isTestMode: true,
    }) as ToolDefinition,
    updateProjects: createUpdateProjectsTool({
      getTargetUserId,
      normalizedInput: '',
      isTestMode: true,
    }) as ToolDefinition,
  };

  it.each(Object.entries(tools))('%s passe son schéma dans inputSchema', (_name, tool) => {
    expect(tool.parameters).toBeUndefined();
    expect(tool.inputSchema).toBeInstanceOf(z.ZodObject);
    expect(Object.keys((tool.inputSchema as z.ZodObject).shape).length).toBeGreaterThan(0);
  });

  it('createProjects exige le nom du projet', () => {
    const schema = tools.createProjects.inputSchema as z.ZodObject;
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ name: 'Nouveau morceau' }).success).toBe(true);
  });
});
