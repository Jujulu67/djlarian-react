/**
 * Classification des requêtes utilisateur
 * Détermine le type de requête (update, create, count, list, conversational)
 */

export interface QueryClassification {
  isMetaQuestion: boolean;
  isUpdate: boolean;
  isCreate: boolean;
  isCount: boolean;
  isList: boolean;
  lang: 'fr' | 'en';
  hasActionVerb: boolean;
  hasProjectMention: boolean;
  isProjectInNonMusicalContext: boolean;
  hasProjectRelatedFilters: boolean;
  isActionVerbButNotProjectRelated: boolean;
  isQuestionAboutAssistantProjects: boolean;
  isConversationalQuestion: boolean;
  understood: boolean;
}

/**
 * Classifie une requête utilisateur
 */
export function classifyQuery(
  query: string,
  lowerQuery: string,
  filters: Record<string, any>
): QueryClassification {
  // Détecter si c'est une question sur l'assistant lui-même (pas sur les projets)
  const isMetaQuestion =
    /(tu sais faire|tes capacit|tes possibilit|tes fonctionnalit|que peux[- ]?tu|what can you|qui es[- ]?tu|tu t['']?appelles|who are you|aide[- ]?moi|help me|comment [çc]a marche|how does it work)/i.test(
      lowerQuery
    );

  // Détecter type de requête (FR + EN) - UPDATE et CREATE doivent être détectés AVANT count/list
  // Inclure aussi les patterns simples comme "deadline à X" qui sont des mises à jour
  // Inclure aussi "en collab avec X à Y" qui est une mise à jour
  const isUpdate =
    /(?:modifie|modifier|change|changer|mets|met|passe|passer|met\s+à\s+jour|mettre\s+à\s+jour|update|set|déplace|déplacer|pousse|pousser|recul|reculer|retarde|retarder|décal|décaler|marque|marquer|supprime|supprimer|retire|retirer|remove|delete|enlève|enlever|enleve|prévoit|prévoir|avance|avancer|^deadline\s+(?:à|pour)|(?:en\s+)?(?:collab|collaborateur)\s+avec\s+[A-Za-z0-9_\s]+\s+à)/i.test(
      lowerQuery
    );
  const isCreate = /(?:ajoute|ajouter|créer|créé|nouveau\s+projet|add|create|new\s+project)/i.test(
    lowerQuery
  );
  const isCount = /combien|cb|nombre|compte|total|how\s*many|count/i.test(lowerQuery);
  // Détecter "liste" mais être plus strict avec "quels/quelle" - seulement si suivi de "projets" ou autre contexte
  const isList =
    /liste|montre|affiche|donne|lesquels|list|show|display/i.test(lowerQuery) ||
    /(?:quels?|quelle|which|what)\s+(?:sont|sont\s+les?|are|are\s+the|projets?|projects?|mes|nos|tes|vos)/i.test(
      lowerQuery
    );

  // Détecter la langue de la requête
  const isEnglish =
    /\b(how|many|project|under|list|show|which|what|with|no\s*progress|in\s*the\s*works|finished|completed|cancelled)\b/i.test(
      lowerQuery
    );
  const lang = isEnglish ? 'en' : 'fr';

  // Détecter si c'est une question conversationnelle (pas une vraie commande)
  // IMPORTANT: Si on a un verbe d'action clair (liste, montre, combien, etc.), ce n'est PAS conversationnel
  // même si ça commence par "et" ou "alors", SAUF si la requête n'est pas liée aux projets
  const hasActionVerb = isList || isCount || isCreate || isUpdate;

  // Détecter mention de "projet" mais exclure les contextes non musicaux
  // Exemples à exclure : "projet de macron", "projet de loi", "projet politique", etc.
  const hasProjectMentionRaw = /projet|project/i.test(lowerQuery);
  const isProjectInNonMusicalContext =
    /projet\s+(?:de|du|des?|politique|loi|réforme|société|économique|social|éducatif|culturel|scientifique|recherche|construction|bâtiment|immobilier|développement|numérique|informatique|web|site|application|logiciel|software)/i.test(
      lowerQuery
    ) ||
    /(?:politique|loi|réforme|société|économique|social|éducatif|culturel|scientifique|recherche|construction|bâtiment|immobilier|développement|numérique|informatique|web|site|application|logiciel|software)\s+(?:de\s+)?(?:projet|project)/i.test(
      lowerQuery
    );

  // "projet" est pertinent seulement si ce n'est PAS dans un contexte non musical
  const hasProjectMention = hasProjectMentionRaw && !isProjectInNonMusicalContext;
  const hasProjectRelatedFilters = Object.keys(filters).length > 0 || hasProjectMention;

  // Si on a un verbe d'action mais que la requête n'est pas liée aux projets, c'est conversationnel
  const isActionVerbButNotProjectRelated = hasActionVerb && !hasProjectRelatedFilters;

  // Détecter les questions sur les projets de l'assistant (possessif 2e personne) - c'est conversationnel
  const isQuestionAboutAssistantProjects =
    /(?:tes|vos|ton|votre|your)\s+(?:projets?|projects?)/i.test(lowerQuery) ||
    /(?:projets?|projects?)\s+(?:de\s+)?(?:toi|vous|you)/i.test(lowerQuery) ||
    // "tu as", "tu gères", "tu fais" + "projets" (avant ou après)
    /(?:tu|vous|you)\s+(?:as|a|gères?|gères|fais|fait|gère|manage|manages|have|has)\s+(?:des?\s+)?(?:projets?|projects?)/i.test(
      lowerQuery
    ) ||
    // "projets" + "tu as" / "tu gères" / "you have" (avec mots entre)
    /(?:projets?|projects?)[^?]*\s+(?:tu|vous|you)\s+(?:as|a|gères?|gères|fais|fait|gère|manage|manages|have|has)/i.test(
      lowerQuery
    ) ||
    // "les projets que tu gères" / "projects that you manage" / "quels sont les projets que tu gères"
    /(?:les?\s+)?(?:projets?|projects?)\s+(?:que|that|which)\s+(?:tu|vous|you)\s+(?:gères?|manage|manages)/i.test(
      lowerQuery
    ) ||
    // "quels sont les projets que tu..." (variante avec "quels sont")
    /(?:quels?|which|what)\s+(?:sont|are)\s+(?:les?\s+)?(?:projets?|projects?)\s+(?:que|that|which)\s+(?:tu|vous|you)\s+(?:gères?|manage|manages)/i.test(
      lowerQuery
    ) ||
    // "quels projets tu gères" / "which projects you manage"
    /(?:quels?|which|what)\s+(?:projets?|projects?)\s+(?:tu|vous|you)\s+(?:gères?|manage|manages|as|a|have|has)/i.test(
      lowerQuery
    );

  if (isQuestionAboutAssistantProjects) {
    console.log("[Parse Query API] Question sur les projets de l'assistant détectée pour:", query);
  }

  // Patterns qui indiquent une conversation plutôt qu'une commande
  const isConversationalQuestion =
    // Si on demande les projets de l'assistant (pas de l'utilisateur), c'est TOUJOURS conversationnel
    // même si on a un verbe d'action (liste, montre, etc.)
    isQuestionAboutAssistantProjects ||
    // Si on a un verbe d'action mais que ce n'est pas lié aux projets, c'est conversationnel
    isActionVerbButNotProjectRelated ||
    // Si on a un verbe d'action clair ET que c'est lié aux projets, ce n'est PAS conversationnel
    (!hasActionVerb &&
      // Débuts conversationnels
      (/^(?:ok|alors|et|ouais|oui|bah|ben|eh|ah|oh|hein|dis|écoute|regarde|tiens|voilà|voici|bon|bien|d'accord|daccord|okay|oké|okey)/i.test(
        lowerQuery.trim()
      ) ||
        // "ok et..." ou "alors et..." au début
        /^(?:ok|alors)\s+et/i.test(lowerQuery.trim()) ||
        // Patterns conversationnels + mention projets (sans verbe d'action)
        /(?:^|\s)(?:et|alors|ok|ouais|oui|bah|ben|hein|dis|écoute|regarde|tiens|voilà|bon|bien|d'accord|daccord|okay|oké|okey)\s+(?:concernant|pour|sur|à\s+propos\s+de|nos|mes|les|des)\s+(?:projets?|projects?)/i.test(
          lowerQuery
        ) ||
        // "et nos projets" / "et mes projets" / "alors nos projets" (sans verbe d'action après)
        /^(?:et|alors)\s+(?:nos|mes|les|des)\s+(?:projets?|projects?)(?:\s+(?:alors|hein|non|quoi))?\s*[?]?$/i.test(
          lowerQuery.trim()
        ) ||
        // "alors pour nos projets?" / "et concernant nos projets?"
        /^(?:alors|et)\s+(?:pour|concernant|sur|à\s+propos\s+de)\s+(?:nos|mes|les|des)\s+(?:projets?|projects?)\s*[?]?$/i.test(
          lowerQuery.trim()
        ) ||
        // "(concernant|pour|sur|à propos de) nos projets?" (sans verbe d'action)
        /(?:concernant|pour|sur|à\s+propos\s+de)\s+(?:nos|mes|les|des)\s+(?:projets?|projects?)\s*[?]?$/i.test(
          lowerQuery
        ) ||
        // Questions d'opinion : "t'en penses quoi?", "qu'est-ce que tu en penses?", "what do you think?"
        /(?:t['']?en|tu\s+en|vous\s+en)\s+penses?\s+quoi/i.test(lowerQuery) ||
        /(?:qu['']?est[- ]?ce\s+que\s+tu\s+en\s+penses?|what\s+do\s+you\s+think)/i.test(
          lowerQuery
        ) ||
        /(?:tu\s+penses?\s+quoi|you\s+think\s+what)/i.test(lowerQuery) ||
        // Commentaires/observations : "ça fait...", "c'est...", "that's..."
        /^(?:ça\s+fait|c['']?est|that['']?s|it['']?s)\s+/i.test(lowerQuery.trim()) ||
        // "ça fait [adjectif] de projets" (commentaire, pas commande)
        /ça\s+fait\s+[^?]*\s+(?:de\s+)?(?:projets?|projects?)/i.test(lowerQuery) ||
        // Questions qui se terminent par "non?", "hein?", "tu trouves pas?", "tu trouves pas?"
        /(?:non|hein|tu\s+trouves?\s+pas|you\s+think|n['']?est[- ]?ce\s+pas)\s*[?]?$/i.test(
          lowerQuery.trim()
        ) ||
        // Questions rhétoriques ou conversationnelles même avec mots-clés
        (/(?:t['']?en\s+penses?\s+quoi|qu['']?est[- ]?ce\s+que\s+tu\s+en\s+penses?|what\s+do\s+you\s+think|tu\s+penses?\s+quoi)\s*[?]?$/i.test(
          lowerQuery
        ) &&
          !isCount &&
          Object.keys(filters).length === 0) ||
        // Questions ouvertes sans verbe d'action clair
        (/^(?:qu['']?est[- ]?ce|que|quoi|comment|pourquoi|où|quand|qui)/i.test(lowerQuery.trim()) &&
          !isCount &&
          !isList &&
          Object.keys(filters).length === 0)));

  // Comprendre les expressions liées aux projets (FR + EN)
  // Ne considérer comme "understood" que si :
  // - On a des filtres spécifiques (même si conversationnel, les filtres indiquent une vraie intention) SAUF si c'est une question sur l'assistant OU
  // - C'est une vraie commande (count/list/create/update) ET ce n'est PAS conversationnel OU
  // - On mentionne "projet" MAIS ce n'est PAS une question conversationnelle
  // IMPORTANT: Si c'est une question sur les projets de l'assistant, c'est TOUJOURS conversationnel
  const understood =
    (!isQuestionAboutAssistantProjects && Object.keys(filters).length > 0) ||
    ((isCount || isList || isCreate || isUpdate) && !isConversationalQuestion) ||
    (hasProjectMention && !isConversationalQuestion);

  if (isQuestionAboutAssistantProjects) {
    console.log(
      '[Parse Query API] isConversationalQuestion:',
      isConversationalQuestion,
      'understood:',
      understood,
      'isList:',
      isList,
      'hasProjectMention:',
      hasProjectMention
    );
  }

  return {
    isMetaQuestion,
    isUpdate,
    isCreate,
    isCount,
    isList,
    lang,
    hasActionVerb,
    hasProjectMention,
    isProjectInNonMusicalContext,
    hasProjectRelatedFilters,
    isActionVerbButNotProjectRelated,
    isQuestionAboutAssistantProjects,
    isConversationalQuestion,
    understood,
  };
}
