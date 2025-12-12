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
function cleanMainContent(content: string, tasks: string[]): string {
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
 * Détermine si une note est "simple" (courte, sans structure complexe)
 * Une note simple ne nécessite pas de template complet
 */
function isSimpleNote(content: string, tasks: string[]): boolean {
  // Si on a des tâches, ce n'est pas une note simple
  if (tasks.length > 0) {
    return false;
  }

  // Si le contenu est très court (moins de 50 caractères), c'est probablement simple
  const cleanedContent = cleanMainContent(content, tasks);
  if (cleanedContent.length < 50) {
    return true;
  }

  // Si le contenu contient des sauts de ligne multiples, ce n'est pas simple
  if (cleanedContent.split('\n').length > 2) {
    return false;
  }

  // Si le contenu contient des structures markdown (listes, titres), ce n'est pas simple
  if (/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s/m.test(cleanedContent)) {
    return false;
  }

  return true;
}

/**
 * Génère une note formatée
 * - Pour les notes simples : format minimal avec juste la date et l'heure
 * - Pour les notes complexes : template "Évolution" complet avec sections
 */
export function generateNoteFromContent(content: string): string {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR');
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateTime = `${date} à ${time}`;

  // Extraire les tâches du contenu
  const tasks = extractTasks(content);

  // Nettoyer le contenu principal
  const mainContent = cleanMainContent(content, tasks);

  // Détecter si c'est une note simple
  const isSimple = isSimpleNote(content, tasks);

  if (isSimple) {
    // Format minimal : juste la date/heure et le contenu
    return `## ${dateTime}\n\n${mainContent}`;
  }

  // Format complet avec template Évolution
  let note = `## ${dateTime}\n\n### Évolution\n\n${mainContent}`;

  // Ajouter les prochaines étapes si on a des tâches
  if (tasks.length > 0) {
    note += '\n\n### Prochaines étapes\n';
    for (const task of tasks) {
      note += `- ${task}\n`;
    }
  } else {
    // Si pas de tâches détectées mais note complexe, ajouter une section vide
    note += '\n\n### Prochaines étapes\n- \n- \n';
  }

  return note;
}
