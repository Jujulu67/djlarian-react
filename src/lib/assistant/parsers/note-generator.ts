/**
 * Générateur de notes pour les projets
 * Utilise les templates disponibles dans ProjectNoteEditor
 */

/**
 * Extrait les tâches mentionnées dans le contenu
 * Détecte les patterns comme "reste à faire X, Y, Z" ou "à faire: X, Y"
 */
function extractTasks(content: string): string[] {
  const tasks: string[] = [];

  // Patterns pour détecter les tâches
  const taskPatterns = [
    // "reste à faire X, Y, Z"
    /reste\s+à\s+faire[:\s]+(.+)/i,
    // "à faire: X, Y, Z"
    /à\s+faire[:\s]+(.+)/i,
    // "reste: X, Y, Z"
    /reste[:\s]+(.+)/i,
    // "prochaines étapes: X, Y, Z"
    /prochaines?\s+étapes?[:\s]+(.+)/i,
    // "todo: X, Y, Z"
    /todo[:\s]+(.+)/i,
  ];

  for (const pattern of taskPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Séparer par virgule, "et", ou "puis"
      const taskText = match[1].trim();
      const splitTasks = taskText
        .split(/[,;]|\s+et\s+|\s+puis\s+/i)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      tasks.push(...splitTasks);
      break; // Prendre le premier pattern qui match
    }
  }

  return tasks;
}

/**
 * Nettoie le contenu principal en enlevant les parties de tâches
 */
function cleanMainContent(content: string, _tasks: string[]): string {
  let cleaned = content;

  // Enlever les patterns de tâches
  const taskPatterns = [
    /reste\s+à\s+faire[:\s]+.+$/i,
    /à\s+faire[:\s]+.+$/i,
    /reste[:\s]+.+$/i,
    /prochaines?\s+étapes?[:\s]+.+$/i,
    /todo[:\s]+.+$/i,
  ];

  for (const pattern of taskPatterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  // Enlever les virgules en fin de phrase
  cleaned = cleaned.replace(/,\s*$/, '').trim();

  return cleaned;
}

/**
 * Génère une note formatée avec le template Évolution
 * Inclut toujours les sections Évolution et Prochaines étapes
 */
export function generateNoteFromContent(content: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR');

  // Extraire les tâches du contenu
  const tasks = extractTasks(content);

  // Nettoyer le contenu principal
  const mainContent = cleanMainContent(content, tasks);

  // Format complet avec template Évolution
  let note = `## ${date}

### Évolution

${mainContent}

### Prochaines étapes
`;

  // Ajouter les tâches ou des placeholders vides
  if (tasks.length > 0) {
    for (const task of tasks) {
      note += `- ${task}\n`;
    }
  } else {
    note += '- \n- \n';
  }

  return note;
}
