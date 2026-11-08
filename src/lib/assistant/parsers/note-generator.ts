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
    const match = pattern.exec(content);
    if (match?.[1]) {
      // Séparer par virgule, "et", ou "puis"
      const taskText = match[1].trim();
      // Espaces unifiés d'abord : le découpage n'a plus que des séparateurs fixes (Sonar S8786)
      const splitTasks = taskText
        .replace(/\s+/g, ' ')
        .split(/[,;]| et | puis /i)
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      tasks.push(...splitTasks);
      break; // Prendre le premier pattern qui match
    }
  }

  return tasks;
}

/**
 * Comme `text.replace(/libellé[:\s]+.+$/i, '')`, en temps linéaire (Sonar S8786) :
 * coupe au premier libellé suivi d'au moins un caractère, sans retour à la ligne après.
 */
export function cutTaskTail(text: string, label: RegExp): string {
  label.lastIndex = 0;
  for (let m = label.exec(text); m; m = label.exec(text)) {
    // [:\s]+ peut traverser des retours à la ligne, .+$ non : la suite non vide doit
    // venir après le dernier retour à la ligne, précédé seulement de séparateurs
    const rest = text.slice(m.index + m[0].length);
    const lastNewline = rest.lastIndexOf('\n');
    const matches =
      lastNewline < 0
        ? rest.length > 0
        : rest.length > lastNewline + 1 && /^[:\s]*$/.test(rest.slice(0, lastNewline + 1));
    if (matches) return text.slice(0, m.index);
  }
  return text;
}

/**
 * Nettoie le contenu principal en enlevant les parties de tâches
 */
function cleanMainContent(content: string, _tasks: string[]): string {
  let cleaned = content;

  // Enlever les parties de tâches : « libellé[:\s]+suite » jusqu'à la fin du texte
  const taskLabels = [
    /reste\s+à\s+faire[:\s]/gi,
    /à\s+faire[:\s]/gi,
    /reste[:\s]/gi,
    /prochaines?\s+étapes?[:\s]/gi,
    /todo[:\s]/gi,
  ];

  for (const label of taskLabels) {
    cleaned = cutTaskTail(cleaned, label).trim();
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
