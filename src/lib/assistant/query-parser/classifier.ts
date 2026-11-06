import { logger } from '@/lib/logger';
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
  isComplex: boolean;
  /** Détection d'une demande de vue détails (ex: "affiche tous les détails") */
  isDetailsViewRequested: boolean;
  /** Détection d'une demande explicite de tous les projets (ex: "tous les projets", "global", "sans filtre") */
  isAllProjectsRequested: boolean;
}

/**
 * Classifie une requête utilisateur
 */
export function classifyQuery(
  query: string,
  lowerQuery: string,
  filters: Record<string, unknown>
): QueryClassification {
  // ... (keeping lines 34-341 as is in the file, we are just fixing the interface and the end)

  // Détecter si c'est une question sur l'assistant lui-même (pas sur les projets)
  const isMetaQuestion =
    /(tu sais faire|tes capacit|tes possibilit|tes fonctionnalit|que peux[- ]?tu|what can you|qui es[- ]?tu|tu t['’]?appelles|who are you|aide[- ]?moi|help me|comment [çc]a marche|how does it work)/i.test(
      lowerQuery
    );

  // Détecter type de requête (FR + EN) - UPDATE et CREATE doivent être détectés AVANT count/list
  // Inclure aussi les patterns simples comme "deadline à X" qui sont des mises à jour
  // Inclure aussi "en collab avec X à Y" qui est une mise à jour
  // UPDATE - Tolérer les verbes tronqués courants (fautes de frappe)
  // IMPORTANT: Ne pas confondre "combie" (faute de "combien") avec "modifie"
  // On vérifie que ce n'est pas "combie" avant de détecter comme update
  // IMPORTANT: Exclure "ajoute le projet" / "ajouter un projet" du pattern isUpdate (c'est une création)
  const hasCombieTypo = /(?:^combie)|(?:combie\s+de)/i.test(lowerQuery);
  const isProjectCreation =
    /(?:ajoute|ajouter|ajout|créer|créé|creer|créa)\s+(?:le\s+)?(?:projet|project|un\s+projet|a\s+project)/i.test(
      lowerQuery
    );
  let isUpdate =
    !hasCombieTypo &&
    !isProjectCreation &&
    /(?:modifie|modifier|modifi|modif|modifs|modifiez|change|changer|chang|chg|changes|changez|mets|met|mt|mett|mettez|mettre|passe|passer|pass|pas[sz]|passes|passez|met\s+à\s+jour|mettre\s+à\s+jour|update|updat|set|déplace|déplacer|deplac|pousse|pousser|recul|reculer|retarde|retarder|décal|décaler|marque|marquer|marqu|mrq|marques|marquez|supprime|supprimer|supprim|retire|retirer|remove|delete|enlève|enlever|enleve|prévoit|prévoir|avance|avancer|^deadline\s+(?:à|a|pour)|(?:en\s+)?(?:collab|collaborateur)\s+avec\s+[a-z0-9_\s]+\s+[àa]|ajoute\s+(?:une\s+)?note|ajouter\s+(?:une\s+)?note|note\s+pour|session\s+.*du\s+jour|^note\s+)/i.test(
      lowerQuery
    );
  let isCreate =
    /(?:ajoute|ajouter|ajout|créer|créé|creer|créa|nouveau\s+projet|add|create|new\s+project)/i.test(
      lowerQuery
    );

  // CONFLICT RESOLUTION:
  // If both isCreate and isUpdate are true, we need to decide.
  // "Ajoute une note" -> Should be isUpdate (Parser handles notes)
  // "Ajoute un projet" -> Should be isCreate (LLM handles creation)
  if (isCreate && isUpdate) {
    const isNoteAddition = /(?:note|session)/i.test(lowerQuery);
    if (isNoteAddition) {
      isCreate = false; // Force it to be treated as an Update
    } else {
      isUpdate = false; // Force it to be treated as a Creation
    }
  }
  // Comptage - tolérant aux fautes de frappe courantes
  // IMPORTANT: Ne détecter "combien" que s'il est suivi de mots liés aux projets
  // pour éviter de détecter des questions conversationnelles comme "combien de temps", "combien ça coûte"
  const hasCountWord =
    /combien|cb|cbn|combiens?|combie|combin|cobien|conbien|nombre|nombres?|compte|compter|total|how\s*many|count|howmany/i.test(
      lowerQuery
    );
  // Vérifier que "combien" (ou ses variantes cb, cbn, count, etc.) est suivi de mots liés aux projets
  // IMPORTANT: Inclure toutes les variantes de "combien" utilisées dans hasCountWord
  const hasProjectContextAfterCount =
    /(?:combien|cb|cbn|combiens?|combie|combin|cobien|conbien|conbin|count|how\s*many).*(?:projets?|projects?|en\s+cours|encours|terminés?|termines?|annulés?|annules?|ghost|collab|collaborations?|styles?|labels?|sous\s+les?\s+\d+%|avec|sans)/i.test(
      lowerQuery
    );
  // Ou si c'est "nombre de projets" / "total projets" / "compte projets"
  const hasExplicitProjectCount = /(?:nombre|total|compte).*(?:projets?|projects?)/i.test(
    lowerQuery
  );

  const isCount = hasCountWord && (hasProjectContextAfterCount || hasExplicitProjectCount);
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

  // Détecter les demandes de détails (avec ou sans verbe explicite)
  // IMPORTANT: "tous les détails" ne signifie PAS "tous les projets", c'est juste "tous les champs"
  const hasDetailsRequest =
    /(?:avec|donne|montre|affiche)\s+(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)/i.test(
      lowerQuery
    ) ||
    /^(?:tous\s+les?\s+)?(?:les?\s+)?(?:détails?|details?|infos?|informations?)(?:\s+sur)?\s*$/i.test(
      lowerQuery.trim()
    ) ||
    /(?:détails?|details?)\s+complets?|toutes?\s+les?\s+infos?|tout\s+afficher|affiche\s+tout/i.test(
      lowerQuery
    );

  // Détecter une demande explicite de "tous les projets" / "global" / "sans filtre"
  // IMPORTANT: Distinguer "tous les détails" (champs) de "tous les projets" (scope)
  const isAllProjectsRequested =
    /(?:tous\s+les?\s+projets?|toutes?\s+les?\s+projets?|l['’]?ensemble\s+des?\s+projets?|global|sans\s+filtre|aucun\s+filtre)/i.test(
      lowerQuery
    ) ||
    // "affiche tous les détails de tous les projets" -> isAllProjectsRequested = true
    /(?:détails?|details?|infos?)\s+(?:de|des?|sur)\s+(?:tous\s+les?\s+projets?|toutes?\s+les?\s+projets?|l['’]?ensemble)/i.test(
      lowerQuery
    );

  // Détecter une demande de vue détails (sans mention explicite de "tous les projets")
  // Si "tous les détails" est présent MAIS PAS "tous les projets", c'est une vue détails
  const isDetailsViewRequested = hasDetailsRequest && !isAllProjectsRequested;

  // PRIORITÉ : Si c'est un ajout de note, forcer isUpdate et désactiver isList
  // pour éviter que les patterns d'ajout de note soient interceptés par la détection de filtres
  const isNoteAdditionPattern =
    /(?:ajoute|ajouter)\s+(?:une\s+)?note|note\s+(?:pour|à)|session\s+.*du\s+jour/i.test(
      lowerQuery
    );

  const isList =
    !isNoteAdditionPattern && // Ne pas détecter comme liste si c'est un ajout de note
    (hasExplicitListVerb ||
      hasQuestionWord ||
      hasImplicitListPattern ||
      hasDetailsRequest ||
      (isShortListRequest && !isShortListButConversational));

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

  // Debug log (utilise le système de debug existant)
  // Removed hardcoded fetch to localhost endpoint - use debugLog instead
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
    logger.warn("[Parse Query API] Question sur les projets de l'assistant détectée pour:", query);
  }

  // Détecter les messages très longs qui sont clairement conversationnels
  // Si le message fait plus de 200 caractères, ne mentionne pas "projet" dans un contexte musical,
  // et contient des informations personnelles (âge, salaire, lieu, etc.), c'est conversationnel
  const hasPersonalInfo =
    /j['’]?ai\s+\d+\s+ans|j['’]?ai\s+\d+\s+années|i\s+am\s+\d+|i\s+have\s+\d+\s+years/i.test(
      lowerQuery
    ) ||
    /je\s+vis\s+à|i\s+live\s+in|j['’]?habite/i.test(lowerQuery) ||
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
    logger.warn('[Parse Query API] 🔍 Détection message long:', {
      length: query.length,
      hasProjectMention,
      hasActionVerb,
      hasPersonalInfo,
      isLongPersonalMessage,
    });
  }

  // Patterns qui indiquent une conversation plutôt qu'une commande
  // IMPORTANT: Si on demande les projets de l'assistant, c'est TOUJOURS conversationnel
  // même si on a un verbe d'action (liste, montre, etc.)
  // Si on a un verbe d'action clair ET que c'est lié aux projets de l'utilisateur, ce n'est PAS conversationnel
  // même si ça commence par "et" ou "alors"
  const hasActionVerbWithProjects = hasActionVerb && hasProjectMention;

  const isConversationalQuestion =
    // Si on demande les projets de l'assistant (pas de l'utilisateur), c'est TOUJOURS conversationnel
    // même si on a un verbe d'action (liste, montre, etc.) - PRIORITÉ ABSOLUE
    isQuestionAboutAssistantProjects ||
    // Si c'est un long message personnel, c'est conversationnel
    isLongPersonalMessage ||
    // Si on a un verbe d'action mais que ce n'est pas lié aux projets, c'est conversationnel
    isActionVerbButNotProjectRelated ||
    // Si on a un verbe d'action ET que c'est lié aux projets de l'utilisateur, ce n'est PAS conversationnel
    // (cette vérification doit être après isQuestionAboutAssistantProjects pour éviter les faux positifs)
    (!hasActionVerbWithProjects &&
      // Si on n'a PAS de verbe d'action, vérifier les patterns conversationnels
      !hasActionVerb &&
      // Débuts conversationnels
      (/^(?:salut|bonjour|bonsoir|coucou|hello|hi|yo|hey|ça\s+va|ok|alors|et|ouais|oui|bah|ben|eh|ah|oh|hein|dis|écoute|regarde|tiens|voilà|voici|bon|bien|d'accord|daccord|okay|oké|okey)/i.test(
        lowerQuery.trim()
      ) ||
        // Déclarations personnelles (j'aime, je pense...) sans verbe d'action projet
        /^(?:j['’]?aime|je\s+déteste|je\s+préfère|je\s+pense|je\s+crois|je\s+trouve|i\s+like|i\s+love|i\s+think)\s+/i.test(
          lowerQuery.trim()
        ) ||
        // Demandes de résumé/synthèse de conversation
        /^(?:resume|résume|récapitule|recapitule|summary|summarize)(?:\s+|$)/i.test(
          lowerQuery.trim()
        ) ||
        // "ok et..." ou "alors et..." au début
        /^(?:ok|alors)\s+et/i.test(lowerQuery.trim()) ||
        // Patterns conversationnels + mention projets (sans verbe d'action explicite AVANT "projets")
        // Exclure les cas où il y a un verbe d'action (liste, montre, modifie, etc.) AVANT "projets"
        (!hasExplicitListVerb &&
          !isUpdate &&
          !isCreate &&
          !isCount &&
          /(?:^|\s)(?:et|alors|ok|ouais|oui|bah|ben|hein|dis|écoute|regarde|tiens|voilà|bon|bien|d'accord|daccord|okay|oké|okey)\s+(?:concernant|pour|sur|à\s+propos\s+de|nos|mes|les|des)\s+(?:projets?|projects?)/i.test(
            lowerQuery
          )) ||
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
        /(?:t['’]?en|tu\s+en|vous\s+en)\s+penses?\s+quoi/i.test(lowerQuery) ||
        /(?:qu['’]?est[- ]?ce\s+que\s+tu\s+en\s+penses?|what\s+do\s+you\s+think)/i.test(
          lowerQuery
        ) ||
        /(?:tu\s+penses?\s+quoi|you\s+think\s+what)/i.test(lowerQuery) ||
        // Commentaires/observations : "ça fait...", "c'est...", "that's..."
        /^(?:ça\s+fait|c['’]?est|that['’]?s|it['’]?s)\s+/i.test(lowerQuery.trim()) ||
        // "ça fait [adjectif] de projets" (commentaire, pas commande)
        /ça\s+fait\s+[^?]*\s+(?:de\s+)?(?:projets?|projects?)/i.test(lowerQuery) ||
        // Questions qui se terminent par "non?", "hein?", "tu trouves pas?", "tu trouves pas?"
        /(?:non|hein|tu\s+trouves?\s+pas|you\s+think|n['’]?est[- ]?ce\s+pas)\s*[?]?$/i.test(
          lowerQuery.trim()
        ) ||
        // Questions rhétoriques ou conversationnelles même avec mots-clés
        (/(?:t['’]?en\s+penses?\s+quoi|qu['’]?est[- ]?ce\s+que\s+tu\s+en\s+penses?|what\s+do\s+you\s+think|tu\s+penses?\s+quoi)\s*[?]?$/i.test(
          lowerQuery
        ) &&
          !isCount &&
          Object.keys(filters).length === 0) ||
        // Questions ouvertes sans verbe d'action clair
        (/^(?:qu['’]?est[- ]?ce|que|quoi|comment|pourquoi|où|quand|qui)/i.test(lowerQuery.trim()) &&
          !isCount &&
          !isList &&
          Object.keys(filters).length === 0) ||
        // Questions avec "combien" qui ne sont PAS liées aux projets
        // Exemples: "combien de temps", "combien ça coûte", "combien pour cuire une pizza"
        (/^combien/i.test(lowerQuery.trim()) &&
          !isCount && // Pas détecté comme isCount (donc pas lié aux projets)
          !hasProjectMention && // Pas de mention de projet
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

  // Debug log (utilise le système de debug existant)
  // Removed hardcoded fetch to localhost endpoint - use debugLog instead

  if (isQuestionAboutAssistantProjects || isLongPersonalMessage) {
    logger.warn('[Parse Query API] 🔍 Détection conversationnelle:', {
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

  // Détection de complexité pour le choix du modèle (8B vs 70B)
  const isStrongReasoning =
    /(?:analyse|détaille|detail|resume|résume|récapitule|summary|summarize|explique|explain)/i.test(
      lowerQuery
    );
  const isContextualReasoning =
    /(?:pourquoi|comment|explain|why|how|avis|opinion|penses?|think)/i.test(lowerQuery) &&
    query.length > 50;

  const isComplex =
    !isMetaQuestion &&
    // 1. Longueur : Si > 100 caractères, on suppose que ça nécessite plus de capacité
    (query.length > 100 ||
      // 2. Mots-clés de raisonnement
      isStrongReasoning ||
      isContextualReasoning ||
      // 3. Si ce n'est pas compris/classifié ET pas conversationnel (donc une commande bizarre ou technique)
      (!understood && !isConversationalQuestion));

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
    isComplex,
    isDetailsViewRequested,
    isAllProjectsRequested,
  };
}
