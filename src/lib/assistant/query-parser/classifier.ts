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
  // UPDATE - Tolérer les verbes tronqués courants (fautes de frappe)
  // IMPORTANT: Ne pas confondre "combie" (faute de "combien") avec "modifie"
  // On vérifie que ce n'est pas "combie" avant de détecter comme update
  const hasCombieTypo = /^combie|combie\s+de/i.test(lowerQuery);
  const isUpdate =
    !hasCombieTypo &&
    /(?:modifie|modifier|modifi|modif|modifiez|change|changer|chang|chg|changes|changez|mets|met|mt|mett|mettez|mettre|passe|passer|pass|pas[sz]|passes|passez|met\s+à\s+jour|mettre\s+à\s+jour|update|updat|set|déplace|déplacer|deplac|pousse|pousser|recul|reculer|retarde|retarder|décal|décaler|marque|marquer|marqu|mrq|marques|marquez|supprime|supprimer|supprim|retire|retirer|remove|delete|enlève|enlever|enleve|prévoit|prévoir|avance|avancer|^deadline\s+(?:à|a|pour)|(?:en\s+)?(?:collab|collaborateur)\s+avec\s+[A-Za-z0-9_\s]+\s+[àa])/i.test(
      lowerQuery
    );
  const isCreate =
    /(?:ajoute|ajouter|ajout|créer|créé|creer|nouveau\s+projet|add|create|new\s+project)/i.test(
      lowerQuery
    );
  // Comptage - tolérant aux fautes de frappe courantes
  const isCount =
    /combien|cb|cbn|combiens?|combie|combin|cobien|conbien|nombre|nombres?|compte|compter|total|how\s*many|count|howmany/i.test(
      lowerQuery
    );
  // Détecter "liste" mais être plus strict avec "quels/quelle" - seulement si suivi de "projets" ou autre contexte
  // AUSSI: Détecter les questions implicites comme "et les terminés?", "et les ghost prod?" qui sont des questions de liste
  // Tolérer les verbes tronqués courants (fautes de frappe)
  const hasExplicitListVerb =
    /liste|listes?|lister?|list|montre|montres?|montrer?|montr|affiche|affiches?|afficher?|affic|donne|donnes?|donner?|donn|lesquels|show|display/i.test(
      lowerQuery
    );
  const hasQuestionWord =
    /(?:quels?|quelle|which|what)\s+(?:sont|sont\s+les?|are|are\s+the|projets?|projects?|mes|nos|tes|vos)/i.test(
      lowerQuery
    );
  // Inclure les variations de "ghost prod" avec fautes d'orthographe
  const hasImplicitListPattern =
    /(?:^|\s)(?:et\s+)?(?:les?|des?)\s+(?:terminés?|termines?|fini|finis|finit|ghost\s*prod(?:uction)?|ghostprod|gost\s*prod|ghosprod|gausprod|goastprod|ghosp\s*rod|goes\s*prod|gosht\s*prod|gauspraud|gausteprauds|annulés?|annules?|anul|archivés?|archives?|arkiv|rework|rwork|en\s*cours|encours|ancours)\s*[?]?$/i.test(
      lowerQuery.trim()
    );

  // Détecter les phrases courtes avec statut/filtre mais sans verbe d'action explicite
  // Exemples: "projets terminés", "projets en cours", "ghost production"
  // Mais PAS: "et nos projets alors?" (début conversationnel)
  const hasProjectMentionForList = /projets?|projects?|projts?|projs?/i.test(lowerQuery);
  // Inclure les variations de "ghost prod" avec fautes d'orthographe étendues
  const hasStatusOrFilter =
    /(?:terminés?|termines?|fini|finis|finit|treminer|termi|ghost\s*prod(?:uction)?|ghostprod|gost\s*prod|ghosprod|gausprod|goastprod|ghosp\s*rod|goes\s*prod|gosht\s*prod|gauspraud|gausteprauds|annulés?|annules?|anul|archivés?|archives?|arkiv|rework|rwork|en\s*cours|en\s*courrs|encours|ancours|emcours|sous\s*les?\s*\d+|avec|collab)/i.test(
      lowerQuery
    );
  const isShortListRequest =
    hasProjectMentionForList &&
    hasStatusOrFilter &&
    !hasExplicitListVerb &&
    !hasQuestionWord &&
    query.length < 50;
  // Ne pas détecter comme liste si c'est clairement conversationnel (début par "et", "alors", etc. sans verbe d'action)
  const isConversationalStart =
    /^(?:et|alors|ok|ouais|oui|bah|ben|hein|dis|écoute|regarde|tiens|voilà|bon|bien|d'accord|daccord|okay|oké|okey)\s+(?:nos|mes|les|des|concernant|pour|sur|à\s+propos\s+de)\s+(?:projets?|projects?)/i.test(
      lowerQuery.trim()
    );
  const isShortListButConversational = isShortListRequest && isConversationalStart;

  const isList =
    hasExplicitListVerb ||
    hasQuestionWord ||
    hasImplicitListPattern ||
    (isShortListRequest && !isShortListButConversational);

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

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/38d751ea-33eb-440f-a5ab-c54c1d798768', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'classifier.ts:40-58',
        message: 'Détection patterns de base',
        data: {
          query: query.substring(0, 100),
          isUpdate,
          isCreate,
          isCount,
          isList,
          hasFilters: Object.keys(filters).length > 0,
          hasProjectMentionRaw,
          hasActionVerb,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
  }
  // #endregion
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
    // Tolérer les fautes d'orthographe: "geres", "géres", "geres" (sans accent)
    /(?:tu|vous|you)\s+(?:as|a|gères?|gères|geres|géres|fais|fait|gère|manage|manages|have|has)\s+(?:des?\s+)?(?:projets?|projects?)/i.test(
      lowerQuery
    ) ||
    // "projets" + "tu as" / "tu gères" / "you have" (avec mots entre)
    /(?:projets?|projects?)[^?]*\s+(?:tu|vous|you)\s+(?:as|a|gères?|gères|geres|géres|fais|fait|gère|manage|manages|have|has)/i.test(
      lowerQuery
    ) ||
    // "les projets que tu gères" / "projects that you manage" / "quels sont les projets que tu gères"
    /(?:les?\s+)?(?:projets?|projects?)\s+(?:que|that|which)\s+(?:tu|vous|you)\s+(?:gères?|geres|géres|manage|manages)/i.test(
      lowerQuery
    ) ||
    // "quels sont les projets que tu..." (variante avec "quels sont")
    /(?:quels?|which|what)\s+(?:sont|are)\s+(?:les?\s+)?(?:projets?|projects?)\s+(?:que|that|which)\s+(?:tu|vous|you)\s+(?:gères?|geres|géres|manage|manages)/i.test(
      lowerQuery
    ) ||
    // "quels projets tu gères" / "which projects you manage"
    /(?:quels?|which|what)\s+(?:projets?|projects?)\s+(?:tu|vous|you)\s+(?:gères?|geres|géres|manage|manages|as|a|have|has)/i.test(
      lowerQuery
    );

  if (isQuestionAboutAssistantProjects) {
    console.log("[Parse Query API] Question sur les projets de l'assistant détectée pour:", query);
  }

  // Détecter les messages très longs qui sont clairement conversationnels
  // Si le message fait plus de 200 caractères, ne mentionne pas "projet" dans un contexte musical,
  // et contient des informations personnelles (âge, salaire, lieu, etc.), c'est conversationnel
  const hasPersonalInfo =
    /j['']?ai\s+\d+\s+ans|j['']?ai\s+\d+\s+années|i\s+am\s+\d+|i\s+have\s+\d+\s+years/i.test(
      lowerQuery
    ) ||
    /je\s+vis\s+à|i\s+live\s+in|j['']?habite/i.test(lowerQuery) ||
    /je\s+travaille|i\s+work|mon\s+travail|my\s+job/i.test(lowerQuery) ||
    /je\s+gagne|i\s+earn|salaire|salary|€|\$/i.test(lowerQuery) ||
    /objectif|goal|but|souhaite|wish|want/i.test(lowerQuery) ||
    /contraintes?|constraints?|constraintes?/i.test(lowerQuery) ||
    /profil\s+personnel|personal\s+profile/i.test(lowerQuery) ||
    /informations?\s+personnelles?|personal\s+information/i.test(lowerQuery);

  // Un message long avec infos personnelles est TOUJOURS conversationnel,
  // même s'il contient des verbes d'action (comme "fais", "dis") qui ne sont pas des commandes projet
  const isLongPersonalMessage = query.length > 200 && !hasProjectMention && hasPersonalInfo;

  // Debug pour les messages longs
  if (query.length > 200) {
    console.log('[Parse Query API] 🔍 Détection message long:', {
      length: query.length,
      hasProjectMention,
      hasActionVerb,
      hasPersonalInfo,
      isLongPersonalMessage,
    });
  }

  // Patterns qui indiquent une conversation plutôt qu'une commande
  const isConversationalQuestion =
    // Si c'est un long message personnel, c'est conversationnel
    isLongPersonalMessage ||
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
  // - On a des filtres spécifiques (même si conversationnel, les filtres indiquent une vraie intention) SAUF si c'est une question sur l'assistant OU un message personnel long OU
  // - C'est une vraie commande (count/list/create/update) ET ce n'est PAS conversationnel OU
  // - On mentionne "projet" MAIS ce n'est PAS une question conversationnelle
  // IMPORTANT: Si c'est une question sur les projets de l'assistant ou un message personnel long, c'est TOUJOURS conversationnel
  const understood =
    (!isQuestionAboutAssistantProjects &&
      !isLongPersonalMessage &&
      Object.keys(filters).length > 0) ||
    ((isCount || isList || isCreate || isUpdate) && !isConversationalQuestion) ||
    (hasProjectMention && !isConversationalQuestion);

  // #region agent log
  if (typeof fetch !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/38d751ea-33eb-440f-a5ab-c54c1d798768', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'classifier.ts:214-219',
        message: 'Calcul final understood',
        data: {
          query: query.substring(0, 100),
          understood,
          isQuestionAboutAssistantProjects,
          isLongPersonalMessage,
          hasFilters: Object.keys(filters).length > 0,
          isCount,
          isList,
          isCreate,
          isUpdate,
          isConversationalQuestion,
          hasProjectMention,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'initial',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
  }
  // #endregion

  if (isQuestionAboutAssistantProjects || isLongPersonalMessage) {
    console.log('[Parse Query API] 🔍 Détection conversationnelle:', {
      isQuestionAboutAssistantProjects,
      isLongPersonalMessage,
      isConversationalQuestion,
      understood,
      isList,
      hasProjectMention,
      hasActionVerb,
      queryLength: query.length,
    });
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
