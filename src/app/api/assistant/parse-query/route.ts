import { NextRequest, NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Configuration Groq pour les questions générales
const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { availableCollabs = [], availableStyles = [], projectCount = 0 } = context || {};
    const result = parseQuery(query, availableCollabs, availableStyles);

    console.log('[Parse Query API] Requête:', query);
    console.log('[Parse Query API] Résultat:', result);
    if (result.isConversational !== undefined) {
      console.log('[Parse Query API] isConversational:', result.isConversational);
    }
    // Debug pour les questions qui ne devraient pas parser
    if (result.understood && !/projet|project/i.test(query.toLowerCase())) {
      console.log(
        '[Parse Query API] ⚠️ Question non liée aux projets mais understood=true:',
        query
      );
    }

    // Si pas compris -> c'est une question générale, appeler Groq
    if (!result.understood) {
      let contextResponse: string;

      if (process.env.GROQ_API_KEY) {
        console.log('[Parse Query API] Question générale détectée, appel à Groq...');
        contextResponse = await getConversationalResponse(query, {
          projectCount,
          collabCount: availableCollabs.length,
          styleCount: availableStyles.length,
        });
      } else {
        // Fallback si pas de clé API
        contextResponse = `Salut ! 🎵 Je suis l'assistant de tes projets musicaux. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
      }

      console.log('[Parse Query API] Réponse Groq:', contextResponse);

      return NextResponse.json({
        ...result,
        understood: true,
        isConversational: true,
        clarification: contextResponse,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Parse Query API] Erreur:', error);
    return NextResponse.json({
      filters: {},
      type: 'list',
      understood: false,
      clarification: "Je n'ai pas compris. Reformule ?",
    });
  }
}

// Réponse conversationnelle avec Groq
async function getConversationalResponse(
  query: string,
  context: { projectCount: number; collabCount: number; styleCount: number }
): Promise<string> {
  try {
    const fullPrompt = `[INSTRUCTION] You are the LARIAN assistant for music production management.

CONTEXT:
- You are "The LARIAN assistant"
- User has ${context.projectCount} music projects
- ${context.collabCount} collaborators
- ${context.styleCount} music styles

CRITICAL RULES:
1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages
3. Be informal, friendly, and natural
4. 2-3 sentences MAX, 1-2 emojis
5. ONLY mention projects/music if the question is related to them - if it's a general question (greetings, random topics), respond naturally without forcing the music context
6. If the question is NOT about music/projects, just answer naturally and optionally mention you can help with projects at the end (but don't force it)
7. If the question IS about music/projects, then mention the ${context.projectCount} projects and suggest 1-2 example queries (in the detected language)

QUESTION: "${query}"

ANSWER (ONLY in the question's language, no translations):`;

    console.log('[Groq] Envoi prompt...');

    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: fullPrompt,
    });

    console.log('[Groq] Réponse:', result.text);
    return result.text.trim();
  } catch (error) {
    console.error('[Groq] Erreur:', error);
    return `Salut ! 🎵 Je suis l'assistant LARIAN, là pour t'aider avec tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}

// Mapping des styles musicaux avec leurs variations et alias
const STYLE_VARIATIONS: Record<string, string[]> = {
  'Drum and Bass': [
    'dnb',
    'drum and bass',
    'drum&bass',
    'drum n bass',
    'jungle',
    'liquid',
    'neurofunk',
    'neuro',
    'techstep',
  ],
  'Happy Hardcore': ['happy hardcore', 'happycore', 'uk hardcore', 'hardcore', 'hcore'],
  Hardstyle: ['hardstyle', 'rawstyle', 'raw hardstyle', 'euphoric hardstyle'],
  Hardcore: ['hardcore', 'frenchcore', 'uptempo', 'terror', 'speedcore', 'extratone'],
  House: ['house', 'deep house', 'tech house', 'progressive house', 'future house', 'bass house'],
  Techno: ['techno', 'minimal techno', 'acid techno', 'industrial techno', 'melodic techno'],
  Trance: ['trance', 'uplifting trance', 'psytrance', 'progressive trance', 'vocal trance'],
  Dubstep: ['dubstep', 'brostep', 'riddim', 'melodic dubstep'],
  Trap: ['trap', 'future bass', 'hybrid trap'],
  Bass: ['bass', 'bass music', 'bassline'],
  Electronic: ['electronic', 'edm', 'electronica'],
  Progressive: ['progressive', 'prog'],
  Ambient: ['ambient', 'chillout', 'downtempo'],
  Breaks: ['breaks', 'breakbeat', 'big beat'],
  Garage: ['garage', 'uk garage', '2-step', 'speed garage'],
  Dance: ['dance', 'eurodance', 'hands up'],
  'Hard Dance': ['hard dance', 'harddance'],
  Psytrance: ['psytrance', 'psy', 'goa', 'full on'],
  'Big Room': ['big room', 'festival house'],
  'Future House': ['future house', 'bounce'],
  Moombahton: ['moombahton', 'moombah'],
  Electro: ['electro', 'electro house'],
  Synthwave: ['synthwave', 'retrowave', 'outrun'],
  'Lo-Fi': ['lo-fi', 'lofi', 'lo fi'],
  Chill: ['chill', 'chillout', 'chillstep'],
};

// Fonction pour trouver un style à partir d'une chaîne
function findStyleFromString(
  text: string,
  availableStyles: string[]
): { style: string; matchedText: string } | null {
  const lowerText = text.toLowerCase();

  // PRIORITÉ 1: Chercher d'abord les variations (plus spécifiques et précises)
  // Cela permet de détecter "drum and bass" même si "Drum and Bass" n'est pas encore dans availableStyles
  for (const [canonicalStyle, variations] of Object.entries(STYLE_VARIATIONS)) {
    // Trier les variations par longueur (les plus longues en premier) pour prioriser les matches exacts
    const sortedVariations = [...variations].sort((a, b) => b.length - a.length);

    for (const variation of sortedVariations) {
      if (lowerText.includes(variation)) {
        // Si on trouve une variation, chercher le style correspondant dans availableStyles
        // D'abord, chercher le style canonique exact
        const exactMatch = availableStyles.find(
          (s) => s.toLowerCase() === canonicalStyle.toLowerCase()
        );
        if (exactMatch) {
          return { style: exactMatch, matchedText: variation };
        }

        // Sinon, chercher un style qui contient le nom canonique ou vice versa
        const partialMatch = availableStyles.find(
          (s) =>
            s.toLowerCase().includes(canonicalStyle.toLowerCase()) ||
            canonicalStyle.toLowerCase().includes(s.toLowerCase())
        );
        if (partialMatch) {
          return { style: partialMatch, matchedText: variation };
        }

        // Si aucun match dans availableStyles, retourner quand même le style canonique
        // (il sera peut-être créé ou sera ignoré si non valide)
        return { style: canonicalStyle, matchedText: variation };
      }
    }
  }

  // PRIORITÉ 2: Vérifier les styles disponibles directement (fallback)
  for (const style of availableStyles) {
    const styleLower = style.toLowerCase();
    if (lowerText.includes(styleLower)) {
      return { style, matchedText: styleLower };
    }
  }

  return null;
}

// Fonction utilitaire pour convertir les dates relatives en ISO
// Utilise le fuseau horaire local pour éviter les décalages UTC
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseRelativeDate(dateStr: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lowerDateStr = dateStr.toLowerCase().trim();

  if (lowerDateStr === "aujourd'hui" || lowerDateStr === 'today') {
    return formatLocalDate(today);
  }

  if (lowerDateStr === 'demain' || lowerDateStr === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatLocalDate(tomorrow);
  }

  if (lowerDateStr === 'après-demain' || lowerDateStr === 'day after tomorrow') {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatLocalDate(dayAfter);
  }

  // "semaine pro", "semaine prochaine", "next week"
  // Interpréter comme "dans 7 jours" (plus simple et prévisible)
  if (
    lowerDateStr.includes('semaine pro') ||
    lowerDateStr.includes('semaine prochaine') ||
    lowerDateStr.includes('next week')
  ) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatLocalDate(nextWeek);
  }

  // "mois prochain", "au mois prochain", "next month"
  if (lowerDateStr.includes('mois prochain') || lowerDateStr.includes('next month')) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return formatLocalDate(nextMonth);
  }

  // "dans X mois" / "in X months" / "dans X month"
  const dansMoisMatch = lowerDateStr.match(/dans\s+(\d+)\s+mois|in\s+(\d+)\s+months?/i);
  if (dansMoisMatch) {
    const months = parseInt(dansMoisMatch[1] || dansMoisMatch[2], 10);
    if (!isNaN(months) && months > 0) {
      const futureDate = new Date(today);
      futureDate.setMonth(futureDate.getMonth() + months);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X jours" / "in X days" / "dans X day"
  const dansJoursMatch = lowerDateStr.match(/dans\s+(\d+)\s+jours?|in\s+(\d+)\s+days?/i);
  if (dansJoursMatch) {
    const days = parseInt(dansJoursMatch[1] || dansJoursMatch[2], 10);
    if (!isNaN(days) && days > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      return formatLocalDate(futureDate);
    }
  }

  // "dans X semaines" / "in X weeks" / "dans X week"
  const dansSemainesMatch = lowerDateStr.match(/dans\s+(\d+)\s+semaines?|in\s+(\d+)\s+weeks?/i);
  if (dansSemainesMatch) {
    const weeks = parseInt(dansSemainesMatch[1] || dansSemainesMatch[2], 10);
    if (!isNaN(weeks) && weeks > 0) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + weeks * 7);
      return formatLocalDate(futureDate);
    }
  }

  // Si c'est déjà une date ISO, la retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

// Parser intelligent qui comprend le langage naturel FR + EN
export function parseQuery(
  query: string,
  availableCollabs: string[],
  availableStyles: string[]
): {
  filters: Record<string, any>;
  type: string;
  understood: boolean;
  clarification: string | null;
  lang?: string;
  isConversational?: boolean;
  fieldsToShow?: string[];
  createData?: {
    name: string;
    collab?: string;
    deadline?: string;
    progress?: number;
    status?: string;
    style?: string;
  };
  updateData?: {
    // Filtres pour identifier les projets à modifier
    minProgress?: number;
    maxProgress?: number;
    status?: string;
    hasDeadline?: boolean;
    deadlineDate?: string;
    noProgress?: boolean;
    // Nouvelles valeurs à appliquer
    newProgress?: number;
    newStatus?: string;
    newDeadline?: string | null;
    pushDeadlineBy?: {
      days?: number;
      weeks?: number;
      months?: number;
    };
    newCollab?: string;
    newStyle?: string;
    newLabel?: string;
    newLabelFinal?: string;
  };
} {
  const lowerQuery = query.toLowerCase();
  const filters: Record<string, any> = {};
  const fieldsToShow: string[] = [];

  // Détecter "sans avancement" / "no progress" / "not set"
  if (
    /sans\s*(?:avancement|progression)|pas\s*(?:de\s*)?(?:avancement|progression)|non\s*renseign[ée]|no\s*(?:progress|percentage|percent)|not\s*set|null|vide/i.test(
      lowerQuery
    )
  ) {
    filters.noProgress = true;
    console.log('[Parse Query API] Filtre noProgress détecté pour:', query);
  }

  // Détecter demande de champs spécifiques à afficher

  // "Tout" / "Détails" / "Infos" -> on affiche tout
  if (/tou(?:tes?|s)|infos?|détails?|all|everything|complet/i.test(lowerQuery)) {
    fieldsToShow.push('status', 'progress', 'collab', 'releaseDate', 'deadline', 'style');
  } else {
    // Champs individuels seulement si on n'a pas demandé "tout"
    // Date de sortie
    if (/date|sortie|release|quand|when/i.test(lowerQuery) && !/deadline/i.test(lowerQuery)) {
      fieldsToShow.push('releaseDate');
    }
    // Deadline
    if (/deadline|date\s*limite|due/i.test(lowerQuery)) {
      fieldsToShow.push('deadline');
    }
    // Avancement / Progression
    if (/avancement|progress|%|pourcent|niveau/i.test(lowerQuery)) {
      fieldsToShow.push('progress');
    }
    // Statut
    if (/statut|status|[ée]tat|state/i.test(lowerQuery)) {
      fieldsToShow.push('status');
    }
    // Collaborateur
    if (/collab|avec\s*qui|feat|partenaire/i.test(lowerQuery)) {
      fieldsToShow.push('collab');
    }
    // Style
    if (/style|genre/i.test(lowerQuery)) {
      fieldsToShow.push('style');
    }
  }

  // Détecter "à X% d'avancement" ou "à X%" comme filtre exact (min = max = X)
  // Patterns: "projets à 7%", "à 7% d'avancement", "modifie les projets à 7% et mets les à 10"
  // Note: "a" (sans accent) est aussi accepté pour tolérer les fautes de frappe
  const exactProgressPatterns = [
    /(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:d['']?avancement|de\s+progress|de\s+progression)/i,
    // "projets à 7%" suivi de "et", "," (avec ou sans espace), ou fin de phrase
    // Accepte aussi "tous les projets a 15%," avec "tous les" avant
    /(?:tous\s+les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%(?:\s*(?:et|,)|$)/i,
    // "des projets à 15%" - pattern pour "des projets à X%"
    /(?:des?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%/i,
    // "modifie les projets à 7% et" - pattern spécifique pour ce cas
    /(?:modifie|modifier|change|changer|mets?|met|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|a|en)\s+(\d+)\s*%\s*(?:et|,)/i,
  ];

  for (let i = 0; i < exactProgressPatterns.length; i++) {
    const pattern = exactProgressPatterns[i];
    const exactMatch = query.match(pattern);
    console.log(`[Parse Query API] 🔍 Test pattern ${i + 1}:`, pattern, '→ match:', exactMatch);
    if (exactMatch) {
      const exactValue = parseInt(exactMatch[1], 10);
      if (!isNaN(exactValue) && exactValue >= 0 && exactValue <= 100) {
        const matchIndex = exactMatch.index || 0;
        const matchedText = exactMatch[0];
        const textAfter = query
          .substring(matchIndex + matchedText.length)
          .toLowerCase()
          .trim();

        // Vérifier si le match se termine par "et" (le pattern l'a inclus, c'est un filtre)
        const matchEndsWithEt =
          /\s+(?:et|,)\s*$/i.test(matchedText) ||
          matchedText.trim().endsWith('et') ||
          matchedText.trim().endsWith(',');

        // Si c'est suivi de "et" puis d'un verbe, c'est un filtre (ex: "à 7% et mets")
        // Si c'est suivi directement d'un verbe sans "et", c'est probablement une nouvelle valeur
        const isFollowedByUpdateVerbDirectly =
          /^(?:mets?|met|passe|passer|change|changer|modifie|modifier)/i.test(textAfter);

        // Si c'est suivi de "et", c'est un filtre
        const isFollowedByEt = /^\s*et/i.test(textAfter);

        // Si c'est suivi d'une date/deadline (ex: "au mois prochain", "demain"), c'est un filtre
        // car "à 15% au mois prochain" signifie "les projets à 15%"
        const isFollowedByDate =
          /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['']hui|today)/i.test(
            textAfter
          );

        console.log(`[Parse Query API] 🔍 Pattern ${i + 1} matché:`, {
          value: exactValue,
          matchedText,
          textAfter,
          matchEndsWithEt,
          isFollowedByEt,
          isFollowedByUpdateVerbDirectly,
          isFollowedByDate,
          willUse:
            matchEndsWithEt ||
            isFollowedByEt ||
            isFollowedByDate ||
            !isFollowedByUpdateVerbDirectly,
        });

        // Si le match se termine par "et" ou est suivi de "et", d'une date, ou pas d'un verbe de modification, c'est un filtre
        if (
          matchEndsWithEt ||
          isFollowedByEt ||
          isFollowedByDate ||
          !isFollowedByUpdateVerbDirectly
        ) {
          filters.minProgress = exactValue;
          filters.maxProgress = exactValue;
          console.log('[Parse Query API] ✅ Filtre progression exacte détecté:', exactValue);
          break;
        }
      }
    }
  }

  // Détecter progression max (sous les X%, under X%, less than X%)
  const maxPatterns = [
    /(?:sous\s*(?:les?)?|moins\s*de|inf[ée]rieur[es]?\s*[àa]|<)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(?:under|below|less\s*than)\s*(\d+)\s*%?/i,
    /(\d+)\s*(?:%|pourcent)\s*(?:max|maximum)/i,
  ];
  for (const pattern of maxPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.maxProgress = parseInt(match[1], 10);
      break;
    }
  }

  // Détecter progression min (plus de X%, supérieur à X%, > X%)
  const minPatternsCorrect = [
    /(?:plus\s*de|sup[ée]rieur[es]?\s*[àa]|>|au\s*dessus\s*de)\s*(\d+)\s*(?:%|pourcent)?/i,
    /(\d+)\s*(?:%|pourcent)\s*(?:min|minimum)/i,
  ];

  for (const pattern of minPatternsCorrect) {
    const match = lowerQuery.match(pattern);
    if (match) {
      filters.minProgress = parseInt(match[1], 10);
      break;
    }
  }

  // Détecter "entre X et Y%"
  const entreMatch = lowerQuery.match(/entre\s*(\d+)\s*(?:et|à)\s*(\d+)\s*%?/i);
  if (entreMatch) {
    filters.minProgress = parseInt(entreMatch[1], 10);
    filters.maxProgress = parseInt(entreMatch[2], 10);
  }

  // Détecter statuts avec variations FR + EN
  const statusPatterns: { pattern: RegExp; status: string }[] = [
    { pattern: /ghost\s*prod(?:uction)?|ghostprod|gost\s*prod/i, status: 'GHOST_PRODUCTION' },
    {
      pattern: /termin[ée]s?|finis?|complet[ée]?s?|finished|completed|done|100\s*%|TERMINE/i,
      status: 'TERMINE',
    },
    { pattern: /annul[ée]s?|cancel(?:led)?|abandonn[ée]s?|dropped/i, status: 'ANNULE' },
    {
      pattern:
        /en\s*cours|ongoing|actifs?|in\s*(?:progress|the\s*works)|current|active|wip|EN\s*COURS|EN_COURS/i,
      status: 'EN_COURS',
    },
    {
      pattern: /en\s*attente|pending|waiting|on\s*hold|pause|EN\s*ATTENTE|EN_ATTENTE/i,
      status: 'EN_ATTENTE',
    },
    { pattern: /archiv[ée]s?|archived/i, status: 'ARCHIVE' },
    { pattern: /rework|[àa]\s*refaire|retravailler|needs?\s*work/i, status: 'A_REWORK' },
  ];

  for (const { pattern, status } of statusPatterns) {
    if (pattern.test(lowerQuery)) {
      filters.status = status;
      break;
    }
  }

  // Détecter collaborateurs
  const collabPatterns = [
    /collab(?:oration)?s?\s+(?:avec\s+)?([A-Za-z0-9_]+)/i, // "collab avec X" ou "collab X"
    /(?:avec|feat\.?|ft\.?)\s+([A-Za-z0-9_]+)/i, // "avec X", "feat X"
    /([A-Za-z0-9_]+)\s+collab/i, // "X collab"
  ];
  for (const pattern of collabPatterns) {
    const match = query.match(pattern); // Garder la casse originale
    if (match && match[1]) {
      const collabName = match[1].trim();
      // Vérifier si c'est un vrai collab (pas un mot clé)
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'de',
        'en',
        'le',
        'la',
        'avec',
        'quelles',
        'quels',
        'ai',
        'j',
      ];
      if (!ignoredWords.includes(collabName.toLowerCase())) {
        // Chercher le collab le plus proche dans la liste
        const matchedCollab = availableCollabs.find(
          (c) =>
            c.toLowerCase().includes(collabName.toLowerCase()) ||
            collabName.toLowerCase().includes(c.toLowerCase())
        );
        filters.collab = matchedCollab || collabName;
        break;
      }
    }
  }

  // Détecter styles avec variations et alias
  const styleMatch = findStyleFromString(query, availableStyles);
  if (styleMatch) {
    filters.style = styleMatch.style;
  }

  // Détecter label (label ciblé)
  const labelPatterns = [
    /(?:label|label\s+cibl[ée])\s+(?:à|en|pour|est|de)?\s*([A-Za-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+([A-Za-z0-9_\s]+)/i,
  ];
  for (const pattern of labelPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelName = match[1].trim();
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'de',
        'en',
        'le',
        'la',
        'des',
        'ciblé',
        'ciblée',
        'est',
      ];
      if (!ignoredWords.includes(labelName.toLowerCase()) && labelName.length > 1) {
        filters.label = labelName;
        break;
      }
    }
  }

  // Détecter label final (si signé)
  const labelFinalPatterns = [
    /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour|est|de)?\s*([A-Za-z0-9_\s]+)/i,
    /(?:projets?\s+)?(?:avec\s+)?label\s+final\s+([A-Za-z0-9_\s]+)/i,
    /sign[ée]\s+chez\s+([A-Za-z0-9_\s]+)/i,
  ];
  for (const pattern of labelFinalPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const labelFinalName = match[1].trim();
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'de',
        'en',
        'le',
        'la',
        'des',
        'final',
      ];
      if (!ignoredWords.includes(labelFinalName.toLowerCase()) && labelFinalName.length > 1) {
        filters.labelFinal = labelFinalName;
        break;
      }
    }
  }

  // Détecter deadline
  if (/avec\s*deadline|deadline\s*pr[ée]vue/i.test(lowerQuery)) {
    filters.hasDeadline = true;
  } else if (/sans\s*deadline|pas\s*de\s*deadline/i.test(lowerQuery)) {
    filters.hasDeadline = false;
  }

  // Détecter si c'est une question sur l'assistant lui-même (pas sur les projets)
  const isMetaQuestion =
    /(tu sais faire|tes capacit|tes possibilit|tes fonctionnalit|que peux[- ]?tu|what can you|qui es[- ]?tu|tu t['']?appelles|who are you|aide[- ]?moi|help me|comment [çc]a marche|how does it work)/i.test(
      lowerQuery
    );

  if (isMetaQuestion) {
    return {
      filters: {},
      type: 'search',
      understood: false, // Force l'appel à Groq
      clarification: null,
    };
  }

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
    console.log('[Parse Query API] Patterns qui matchent:', {
      pattern1: /(?:tes|vos|ton|votre|your)\s+(?:projets?|projects?)/i.test(lowerQuery),
      pattern2: /(?:projets?|projects?)\s+(?:de\s+)?(?:toi|vous|you)/i.test(lowerQuery),
      pattern3:
        /(?:tu|vous|you)\s+(?:as|a|gères?|gères|fais|fait|gère|manage|manages|have|has)\s+(?:des?\s+)?(?:projets?|projects?)/i.test(
          lowerQuery
        ),
      pattern4:
        /(?:projets?|projects?)[^?]*\s+(?:tu|vous|you)\s+(?:as|a|gères?|gères|fais|fait|gère|manage|manages|have|has)/i.test(
          lowerQuery
        ),
      pattern5:
        /(?:les?\s+)?(?:projets?|projects?)\s+(?:que|that|which)\s+(?:tu|vous|you)\s+(?:gères?|manage|manages)/i.test(
          lowerQuery
        ),
      pattern6:
        /(?:quels?|which|what)\s+(?:projets?|projects?)\s+(?:tu|vous|you)\s+(?:gères?|manage|manages|as|a|have|has)/i.test(
          lowerQuery
        ),
    });
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

  // Si c'est une commande de création, extraire les données du projet (après avoir défini tous les patterns)
  if (isCreate) {
    const createData: {
      name: string;
      collab?: string;
      deadline?: string;
      progress?: number;
      status?: string;
      style?: string;
    } = { name: '' };

    // Mots-clés qui indiquent la fin du nom du projet
    const stopWords = [
      'en collab',
      'collab',
      'avec',
      'deadline',
      'avancé',
      'avance',
      'progress',
      'progression',
      'il est',
      "c'est",
      'it is',
      "it's",
      'status',
      'statut',
    ];

    // Fonction pour extraire le nom en s'arrêtant aux mots-clés
    const extractNameWithStopWords = (text: string, startPattern: RegExp): string | null => {
      const match = text.match(startPattern);
      if (!match) return null;

      const startIndex = match.index! + match[0].length;
      let nameEndIndex = text.length;

      // Trouver le premier mot-clé d'arrêt après le début
      for (const stopWord of stopWords) {
        const stopIndex = text.toLowerCase().indexOf(stopWord.toLowerCase(), startIndex);
        if (stopIndex !== -1 && stopIndex < nameEndIndex) {
          nameEndIndex = stopIndex;
        }
      }

      const extracted = text.substring(startIndex, nameEndIndex).trim();
      if (!extracted) return null;

      // Vérifier que ce n'est pas un mot-clé ignoré
      const ignoredWords = ['le', 'la', 'les', 'un', 'une', 'projet', 'project', 'nouveau', 'new'];
      if (ignoredWords.includes(extracted.toLowerCase())) return null;

      return extracted;
    };

    // Essayer différents patterns pour trouver le nom
    const namePatterns = [
      /(?:projet|project)\s+/i,
      /(?:ajoute|ajouter|créer|créé|add|create)\s+(?:le\s+)?(?:projet\s+)?/i,
      /nouveau\s+projet\s+/i,
      /new\s+project\s+/i,
    ];

    for (const pattern of namePatterns) {
      const name = extractNameWithStopWords(query, pattern);
      if (name) {
        createData.name = name;
        break;
      }
    }

    // Si pas de nom trouvé, essayer un pattern simple (un seul mot)
    if (!createData.name) {
      const simplePattern =
        /(?:ajoute|ajouter|créer|créé|add|create)\s+(?:le\s+)?(?:projet\s+)?([A-Za-z0-9_]+)(?:\s|$)/i;
      const match = query.match(simplePattern);
      if (match && match[1]) {
        const potentialName = match[1].trim();
        const ignoredWords = [
          'le',
          'la',
          'les',
          'un',
          'une',
          'projet',
          'project',
          'nouveau',
          'new',
        ];
        if (!ignoredWords.includes(potentialName.toLowerCase())) {
          createData.name = potentialName;
        }
      }
    }

    // Extraire collab (réutiliser la logique existante avec collabPatterns défini plus haut)
    for (const pattern of collabPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const collabName = match[1].trim();
        const ignoredWords = [
          'projets',
          'projet',
          'les',
          'mes',
          'de',
          'en',
          'le',
          'la',
          'avec',
          'quelles',
          'quels',
          'ai',
          'j',
        ];
        if (!ignoredWords.includes(collabName.toLowerCase())) {
          const matchedCollab = availableCollabs.find(
            (c) =>
              c.toLowerCase().includes(collabName.toLowerCase()) ||
              collabName.toLowerCase().includes(c.toLowerCase())
          );
          createData.collab = matchedCollab || collabName;
          break;
        }
      }
    }

    // Extraire deadline
    const deadlinePatterns = [
      /deadline\s+(?:pour\s+)?(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      /(?:avec\s+)?deadline\s+(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      /(?:pour|à)\s+(?:le\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
      // Pattern spécifique pour "met une deadline à dans X mois"
      /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
    ];

    for (const pattern of deadlinePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1].trim();
        const parsedDate = parseRelativeDate(dateStr);
        if (parsedDate) {
          createData.deadline = parsedDate;
          break;
        }
      }
    }

    // Extraire progress (e.g., "70%", "avancé à 70%")
    const progressPatterns = [
      /(?:avancé|avance|progress|progression)\s*(?:à|de|à\s+)?(\d+)\s*%/i,
      /(\d+)\s*%\s*(?:d['']?avancement|de\s+progress|de\s+progression)?/i,
      /(?:à|à\s+)?(\d+)\s*%/i,
    ];

    for (const pattern of progressPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const progressValue = parseInt(match[1], 10);
        if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
          createData.progress = progressValue;
          break;
        }
      }
    }

    // Extraire status si mentionné (sinon default à EN_COURS) - utiliser statusPatterns défini plus haut
    for (const { pattern, status } of statusPatterns) {
      if (pattern.test(lowerQuery)) {
        createData.status = status;
        break;
      }
    }

    // Si pas de status spécifié, default à EN_COURS
    if (!createData.status) {
      createData.status = 'EN_COURS';
    }

    // Extraire style avec détection améliorée (variations, alias, et dans le nom)
    // Le style est détecté mais on garde le nom tel quel (ex: "epic dnb" reste "epic dnb")
    const styleMatch = findStyleFromString(query, availableStyles);
    if (styleMatch) {
      createData.style = styleMatch.style;
      console.log('[Parse Query API] Style détecté:', {
        matchedText: styleMatch.matchedText,
        style: styleMatch.style,
        availableStyles: availableStyles,
      });
      // Le nom reste inchangé, même s'il contient le style
    } else {
      console.log('[Parse Query API] Aucun style détecté pour:', query);
    }

    // Si on a au moins un nom, c'est une commande de création valide
    if (createData.name) {
      console.log('[Parse Query API] createData final:', createData);
      return {
        filters: {},
        type: 'create',
        understood: true,
        lang,
        createData,
        clarification: null,
      };
    }
  }

  // Si c'est une commande de modification, extraire les données de modification
  if (isUpdate) {
    const updateData: {
      minProgress?: number;
      maxProgress?: number;
      status?: string;
      hasDeadline?: boolean;
      deadlineDate?: string;
      noProgress?: boolean;
      collab?: string;
      style?: string;
      label?: string;
      labelFinal?: string;
      newProgress?: number;
      newStatus?: string;
      newDeadline?: string | null;
      pushDeadlineBy?: {
        days?: number;
        weeks?: number;
        months?: number;
      };
      newCollab?: string;
      newStyle?: string;
      newLabel?: string;
      newLabelFinal?: string;
    } = {};

    // Détecter "de X% à Y" comme pattern spécial (filtre X%, nouvelle valeur Y)
    // Exemple: "passe les projets de 10% à 15"
    const deXaYPattern = /(?:de|depuis)\s+(\d+)\s*%\s+à\s+(\d+)(?:\s*%|$)/i;
    const deXaYMatch = query.match(deXaYPattern);
    if (deXaYMatch) {
      const filterValue = parseInt(deXaYMatch[1], 10);
      const newValue = parseInt(deXaYMatch[2], 10);
      if (
        !isNaN(filterValue) &&
        filterValue >= 0 &&
        filterValue <= 100 &&
        !isNaN(newValue) &&
        newValue >= 0 &&
        newValue <= 100
      ) {
        filters.minProgress = filterValue;
        filters.maxProgress = filterValue;
        updateData.newProgress = newValue;
        console.log(
          '[Parse Query API] ✅ Pattern "de X% à Y" détecté:',
          `filtre=${filterValue}%, nouvelle valeur=${newValue}%`
        );
      }
    }

    // Extraire les filtres de progression (pour identifier les projets à modifier)
    // Ces filtres sont déjà dans l'objet filters, on les réutilise
    if (filters.minProgress !== undefined) {
      updateData.minProgress = filters.minProgress;
    }
    if (filters.maxProgress !== undefined) {
      updateData.maxProgress = filters.maxProgress;
    }
    if (filters.noProgress) {
      updateData.noProgress = true;
    }

    // Extraire le statut de filtre (pour identifier les projets)
    if (filters.status) {
      updateData.status = filters.status;
    }

    // Extraire hasDeadline
    if (filters.hasDeadline !== undefined) {
      updateData.hasDeadline = filters.hasDeadline;
    }

    // Extraire collab (filtre)
    if (filters.collab) {
      updateData.collab = filters.collab;
    }

    // Extraire style (filtre)
    if (filters.style) {
      updateData.style = filters.style;
    }

    // Extraire label (filtre)
    if (filters.label) {
      updateData.label = filters.label;
    }

    // Extraire labelFinal (filtre)
    if (filters.labelFinal) {
      updateData.labelFinal = filters.labelFinal;
    }

    // Extraire la nouvelle progression à appliquer
    // On cherche la nouvelle valeur APRÈS les filtres
    // Patterns pour détecter la nouvelle valeur (doit être après "à" ou "en" et après les filtres)
    // Exemples: "met à jour les projets à 5% à 7%" -> newProgress: 7
    //           "passe les projets sans avancement à 0%" -> newProgress: 0
    //           "modifie les projets à 100% en TERMINE" -> pas de newProgress (juste statut)
    //           "passe les projets de 10% à 15" -> newProgress: 15 (déjà détecté par pattern "de X% à Y")

    // Si on a déjà détecté une nouvelle valeur avec le pattern "de X% à Y", on skip les autres détections
    const skipNewProgressDetection = updateData.newProgress !== undefined;

    // Si on a déjà détecté une nouvelle valeur avec le pattern "de X% à Y", on skip les autres détections
    if (!skipNewProgressDetection) {
      // Chercher d'abord les patterns explicites de nouvelle valeur
      const explicitNewProgressPatterns = [
        // "à X%" à la fin de la phrase (probablement la nouvelle valeur)
        /(?:à|en)\s+(\d+)\s*%\s*$/i,
        // "mets à X%" ou "passe à X%" (nouvelle valeur explicite) - doit être après "projets" ou directement après le verbe
        /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)\s*%?/i,
        // "en X%" après un verbe de modification
        /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?[^à]*\s+(?:à|en)\s+(\d+)\s*%?/i,
        // Pattern spécifique pour "passe les projets à X%" quand X% n'est pas utilisé comme filtre
        /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?projets?\s+(?:à|en)\s+(\d+)\s*%?/i,
      ];

      // Chercher toutes les occurrences de pourcentages dans la requête
      const allPercentMatches = Array.from(query.matchAll(/(\d+)\s*%/gi));

      // Chercher aussi les nombres sans % qui pourraient être la nouvelle valeur
      // Patterns: "mets à 10", "passe à 10", "change à 10", "mets les à 10", etc.
      // On cherche après tous les filtres pour trouver la nouvelle valeur
      const numberWithoutPercentPatterns = [
        // "mets les à 10" ou "mets à 10" (après "les projets à X%")
        /(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)(?:\s|$)/i,
        // "à 10" à la fin de la phrase
        /(?:à|en)\s+(\d+)\s*$/i,
        // "à 10" après "et" (ex: "projets à 7% et mets les à 10")
        /et\s+(?:mets?|met|passe|passer|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:à|en)\s+(\d+)/i,
      ];

      let newProgressFromNumber = undefined;
      for (const pattern of numberWithoutPercentPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const value = parseInt(match[1], 10);
          if (!isNaN(value) && value >= 0 && value <= 100) {
            // Vérifier que ce n'est pas déjà utilisé comme filtre
            const isUsedAsFilter =
              (filters.minProgress !== undefined && filters.minProgress === value) ||
              (filters.maxProgress !== undefined && filters.maxProgress === value);
            if (!isUsedAsFilter) {
              newProgressFromNumber = value;
              console.log(
                '[Parse Query API] ✅ Nouvelle progression détectée (nombre sans %):',
                value
              );
              break;
            }
          }
        }
      }

      if (allPercentMatches.length > 0) {
        console.log(
          '[Parse Query API] 🔍 Tous les pourcentages trouvés:',
          allPercentMatches.map((m) => ({
            value: m[1],
            index: m.index,
            text: m[0],
          }))
        );

        // Si on a plusieurs pourcentages, le dernier est probablement la nouvelle valeur
        // Sauf si c'est clairement un filtre (ex: "à 5% d'avancement")
        const lastPercentMatch = allPercentMatches[allPercentMatches.length - 1];
        const lastPercentValue = parseInt(lastPercentMatch[1], 10);
        const lastPercentIndex = lastPercentMatch.index || 0;
        const textAfterLastPercent = query
          .substring(lastPercentIndex + lastPercentMatch[0].length)
          .toLowerCase();

        console.log('[Parse Query API] 🔍 Dernier pourcentage:', {
          value: lastPercentValue,
          textAfter: textAfterLastPercent,
          isUsedAsFilter:
            (filters.minProgress !== undefined && filters.minProgress === lastPercentValue) ||
            (filters.maxProgress !== undefined && filters.maxProgress === lastPercentValue),
        });

        // Si le dernier pourcentage est suivi de rien ou de peu de texte, c'est probablement la nouvelle valeur
        // Si c'est suivi de "d'avancement" ou "de progress", c'est un filtre
        const isFollowedByProgressKeyword = /d['']?avancement|de\s+progress|de\s+progression/i.test(
          textAfterLastPercent
        );

        // Vérifier si c'est suivi d'une date/deadline (ex: "au mois prochain", "demain", etc.)
        const isFollowedByDate =
          /\b(?:au|à\s+le|pour|pour\s+le)\s+(?:le\s+)?(?:mois\s+prochain|semaine\s+pro|semaine\s+prochaine|next\s+month|next\s+week|demain|tomorrow|aujourd['']hui|today)/i.test(
            textAfterLastPercent
          );

        if (
          !isFollowedByProgressKeyword &&
          (!textAfterLastPercent.trim() ||
            textAfterLastPercent.trim().length < 10 ||
            isFollowedByDate)
        ) {
          // Vérifier que ce n'est pas déjà utilisé comme filtre
          const isUsedAsFilter =
            (filters.minProgress !== undefined && filters.minProgress === lastPercentValue) ||
            (filters.maxProgress !== undefined && filters.maxProgress === lastPercentValue);

          if (
            !isUsedAsFilter &&
            !isNaN(lastPercentValue) &&
            lastPercentValue >= 0 &&
            lastPercentValue <= 100
          ) {
            // Si on a déjà trouvé une nouvelle valeur sans %, prioriser celle avec %
            if (newProgressFromNumber === undefined) {
              updateData.newProgress = lastPercentValue;
              console.log(
                '[Parse Query API] ✅ Nouvelle progression détectée (dernier %):',
                lastPercentValue,
                isFollowedByDate ? "(suivi d'une date)" : ''
              );
            }
          }
        } else {
          console.log(
            '[Parse Query API] ⚠️ Dernier pourcentage ignoré (filtre ou suivi de mot-clé)'
          );
        }
      }

      // Si on a trouvé une nouvelle valeur sans %, l'utiliser (priorité sur les %)
      if (newProgressFromNumber !== undefined) {
        updateData.newProgress = newProgressFromNumber;
      }

      // Si on n'a pas trouvé avec la méthode précédente, essayer les patterns explicites
      if (updateData.newProgress === undefined) {
        for (const pattern of explicitNewProgressPatterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            const progressValue = parseInt(match[1], 10);
            if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
              // Vérifier que ce n'est pas déjà utilisé comme filtre
              const isUsedAsFilter =
                (filters.minProgress !== undefined && filters.minProgress === progressValue) ||
                (filters.maxProgress !== undefined && filters.maxProgress === progressValue);

              // Si c'est utilisé comme filtre ET qu'on a un verbe de modification,
              // c'est probablement aussi la nouvelle valeur (ex: "passe les projets à 15%" = filtre 15% ET newProgress 15%)
              const hasUpdateVerb =
                /(?:passe|met|mets?|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?|deadlines?)/i.test(
                  query
                );

              // Si c'est un filtre mais qu'on a un verbe de modification, c'est aussi la nouvelle valeur
              // Sauf si on a déjà détecté une autre nouvelle valeur
              if (!isUsedAsFilter || (isUsedAsFilter && hasUpdateVerb)) {
                updateData.newProgress = progressValue;
                console.log(
                  '[Parse Query API] ✅ Nouvelle progression détectée (pattern explicite):',
                  progressValue,
                  isUsedAsFilter ? '(également utilisé comme filtre)' : ''
                );
                break;
              }
            }
          }
        }
      }
    }

    // Détecter "sans avancement" ou "null" comme nouvelle valeur (0%)
    // Si on n'a pas déjà détecté une nouvelle valeur et qu'on trouve "sans avancement" après un verbe de modification
    if (
      updateData.newProgress === undefined &&
      /(?:passe|mets?|met|change|changer|modifie|modifier)\s+(?:les?\s+)?(?:projets?\s+)?(?:sans\s*avancement|sans\s*progression|pas\s*d['']?avancement|no\s*progress|null)/i.test(
        lowerQuery
      )
    ) {
      updateData.newProgress = 0;
    }

    // Extraire le nouveau statut à appliquer
    // Patterns pour détecter "en TERMINE", "à TERMINE", "marque TERMINE", "à EN COURS", etc.
    // Supporte les statuts en majuscules (EN COURS, EN ATTENTE, TERMINE)
    for (const { pattern, status } of statusPatterns) {
      // Chercher si le statut apparaît après un verbe de modification
      // Patterns: "passe en TERMINE", "met à EN COURS", "change en EN ATTENTE", etc.
      const updateVerbPatterns = [
        new RegExp(
          `(?:marque|marquer|mets?|met|change|changer|modifie|modifier|passe|passer)\\s+(?:les?\\s+)?(?:projets?\\s+)?(?:en|à|comme|as)\\s+${pattern.source}`,
          'i'
        ),
        new RegExp(`(?:set|update|change|mark)\\s+(?:to|as)\\s+${pattern.source}`, 'i'),
        // Pattern pour les statuts en majuscules directement après "à" ou "en"
        // Supporte à la fois "EN_COURS" et "EN COURS"
        new RegExp(
          `(?:marque|marquer|mets?|met|change|changer|modifie|modifier|passe|passer)\\s+(?:les?\\s+)?(?:projets?\\s+)?(?:en|à)\\s+(${status.replace(/_/g, '[\\s_]').replace(/\s+/g, '[\\s_]+')})`,
          'i'
        ),
      ];

      for (const updateVerbPattern of updateVerbPatterns) {
        if (updateVerbPattern.test(query)) {
          updateData.newStatus = status;
          console.log('[Parse Query API] ✅ Nouveau statut détecté:', status);
          break;
        }
      }
      if (updateData.newStatus) break;
    }

    // Détecter la suppression de deadlines (AVANT la détection de nouvelle deadline)
    // Tolère les fautes d'orthographe : "dealines", "dead line", "dead-line", etc.
    const removeDeadlinePatterns = [
      // Patterns avec variations exactes
      /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?|dates?\s*limites?)/i,
      /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dead-lines?)\s+(?:des?\s+)?(?:projets?|projects?)/i,
      // Pattern flexible : "dead" ou "deal" (faute) suivi de "line(s)" avec ou sans espace/tiret
      /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?(?:dead|deal|date)[\s-]?lines?/i,
      // Pattern pour "dealines" : "deal" suivi de quelque chose qui ressemble à "lines" (tolère "ines" comme faute)
      /(?:supprime|supprimer|retire|retirer|enlève|enlever|remove|delete)\s+(?:les?\s+)?deal[il]?n?e?s?/i,
    ];

    for (let i = 0; i < removeDeadlinePatterns.length; i++) {
      const pattern = removeDeadlinePatterns[i];
      const matches = pattern.test(lowerQuery);
      console.log(
        `[Parse Query API] 🔍 Test pattern suppression deadline ${i + 1}:`,
        pattern,
        '→ match:',
        matches,
        'pour:',
        lowerQuery
      );
      if (matches) {
        updateData.newDeadline = null; // null indique la suppression
        // Filtrer les projets qui ont des deadlines pour les modifier
        filters.hasDeadline = true;
        updateData.hasDeadline = true;
        console.log('[Parse Query API] ✅ Suppression de deadlines détectée');
        break;
      }
    }

    // Détecter le décalage de deadlines (AVANT la détection de nouvelle deadline fixe)
    // Patterns: "pousse toutes les deadlines d'une semaine", "push deadlines by 1 week", etc.
    // Patterns pour AVANCER (positif) et RECULER (négatif) les deadlines
    const pushDeadlinePatterns = [
      // FR: "pousse (toutes les) deadlines d'une semaine" / "de X semaines" (AVANCER)
      // Match "d'une", "d'une", "de une", "de 1", "de 2 semaines", etc.
      // Utilise [\u2019'] pour matcher les différents types d'apostrophes
      // Le pattern (?:toutes?\s+)?les?\s+ permet "toutes les", "toutes", "les", ou rien
      /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|de\s+(\d+))\s+(semaine|semaines?|week|weeks?)/i,
      // FR: "pousse (toutes les) deadlines de X jours" (AVANCER)
      /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?un|de\s+un|de\s+(\d+))\s+(jour|jours?|day|days?)/i,
      // FR: "pousse (toutes les) deadlines de X mois" (AVANCER)
      /(?:pousse|pousser|déplace|déplacer|retarde|retarder|décal|décaler|prévoit|prévoir|avance|avancer)\s+(?:toutes?\s+)?les?\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+de\s+(\d+)?\s+(mois|month|months?)/i,
      // FR: "avance/prévoit (les) deadlines d'une/de X semaine(s)/jour(s)/mois" (AVANCER)
      // Pattern pour "avance les deadlines d'une semaine" (ordre: verbe + deadlines + quantité)
      /(?:avance|avancer|prévoit|prévoir)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:d[\u2019']?une|de\s+une|d[\u2019']?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
      // FR: "recule (les) deadlines d'une/de X semaine(s)/jour(s)/mois" (RECULER - négatif)
      // Pattern pour "recule les deadlines d'une semaine" (ordre: verbe + deadlines + quantité)
      // DOIT être placé AVANT les patterns "enlève une semaine aux deadlines" pour éviter les conflits
      // Supporte "recule" (conjugué), "recul" (impératif), "reculer" (infinitif)
      /(?:recule|recul|reculer)\s+les\s+deadlines\s+(?:d['\u2019]?une|de\s+une|d['\u2019]?un|de\s+un|de\s+(\d+))\s+(semaine|semaines?|jour|jours?|mois|month|months?)/i,
      // FR: "enlève/enleve/retire (une/X) semaine(s)/jour(s)/mois aux deadlines" (RECULER - négatif)
      // Supporte "enlève" (avec accent) et "enleve" (sans accent)
      /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s+(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)/i,
      // FR: "enlève/enleve/retire (une/X) semaine(s)/jour(s)/mois" (RECULER - négatif, sans "aux deadlines")
      /(?:enlève|enlever|enleve|retire|retirer|recul|reculer)\s+(?:une|un|(\d+))?\s+(semaine|semaines?|jour|jours?|mois|month|months?)\s+(?:aux|à\s+les?|des?)\s*(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)?/i,
      // EN: "push (all) deadlines by X weeks/days/months" (AVANCER)
      /(?:push|delay|postpone|move)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)\s+by\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)/i,
      // EN: "remove/subtract X weeks/days/months from deadlines" (RECULER - négatif)
      /(?:remove|subtract|take\s+off)\s+(\d+)?\s*(week|weeks?|day|days?|month|months?)\s+(?:from|off)\s+(?:all\s+)?(?:deadlines?|dates?\s*limites?)/i,
    ];

    for (let i = 0; i < pushDeadlinePatterns.length; i++) {
      const pattern = pushDeadlinePatterns[i];
      const match = query.match(pattern);
      console.log(
        `[Parse Query API] 🔍 Test pattern push deadline ${i + 1}:`,
        pattern,
        '→ match:',
        match,
        'pour:',
        query
      );
      if (match) {
        // Détecter si c'est un décalage négatif (enlève, enleve, retire, recul, reculer, remove, subtract)
        const isNegative =
          /(?:enlève|enlever|enleve|retire|retirer|recul|reculer|remove|subtract|take\s+off)/i.test(
            match[0]
          );

        // Le nombre peut être dans match[1] (pour les patterns avec nombre explicite)
        // Si pas de nombre explicite mais qu'on a "d'une", "d'un", "une", "un", c'est 1
        let amount = 1; // Par défaut 1
        if (match[1] && !isNaN(parseInt(match[1], 10))) {
          amount = parseInt(match[1], 10);
        } else {
          // Vérifier si le texte matche contient "d'une", "d'un", "une", "un"
          const matchedText = match[0].toLowerCase();
          if (
            matchedText.includes("d'une") ||
            matchedText.includes("d'un") ||
            /(?:^|\s)(?:une|un)(?:\s|$)/.test(matchedText)
          ) {
            amount = 1;
          }
        }

        // Si c'est négatif, rendre le montant négatif
        if (isNegative) {
          amount = -amount;
        }

        // L'unité peut être dans différents groupes selon le pattern
        // Pour "recule les deadlines d'une semaine", l'unité est dans le dernier groupe de capture
        // Pour les patterns avec nombre explicite, l'unité est généralement dans match[2] ou match[3]
        // Pour les patterns sans nombre (d'une, d'un), l'unité est dans match[2]
        // Chercher dans tous les groupes de capture possibles
        let unit = null;
        // Commencer par la fin (dernier groupe de capture)
        for (let i = match.length - 1; i >= 2; i--) {
          if (match[i] && /^(semaine|semaines?|jour|jours?|mois|month|months?)$/i.test(match[i])) {
            unit = match[i].toLowerCase();
            break;
          }
        }

        console.log('[Parse Query API] 🔍 Analyse match:', {
          match: match[0],
          amount,
          unit,
          isNegative,
          matchGroups: match,
        });

        if (!isNaN(amount) && amount !== 0 && unit) {
          // Filtrer les projets qui ont des deadlines pour les modifier
          filters.hasDeadline = true;
          updateData.hasDeadline = true;

          updateData.pushDeadlineBy = {};
          if (unit.includes('semaine') || unit.includes('week')) {
            updateData.pushDeadlineBy.weeks = amount;
          } else if (unit.includes('jour') || unit.includes('day')) {
            updateData.pushDeadlineBy.days = amount;
          } else if (unit.includes('mois') || unit.includes('month')) {
            updateData.pushDeadlineBy.months = amount;
          }

          console.log(
            '[Parse Query API] ✅ Décalage de deadlines détecté:',
            updateData.pushDeadlineBy
          );
          break;
        }
      }
    }

    // Extraire la nouvelle deadline (seulement si pas de suppression ni de décalage détecté)
    if (updateData.newDeadline === undefined && updateData.pushDeadlineBy === undefined) {
      const newDeadlinePatterns = [
        /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?|dead\s*lines?|dates?\s*limites?)\s+(?:des?\s+)?(?:projets?\s+)?(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
        /(?:déplace|déplacer|change|changer|modifie|modifier|mets?|met)\s+(?:la\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
        /(?:deadline|date\s*limite)\s+(?:à|pour|pour\s+le)?\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today|après[- ]?demain|day\s+after\s+tomorrow|dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?)|\d{4}-\d{2}-\d{2})/i,
        // Pattern spécifique pour "met une deadline à dans X mois"
        /(?:met|mets?|définis?|définir)\s+(?:une\s+)?deadline\s+(?:à|pour|pour\s+le)?\s*(dans\s+\d+\s+(?:jours?|semaines?|mois)|in\s+\d+\s+(?:days?|weeks?|months?))/i,
        // Pattern pour détecter "au mois prochain" même après d'autres informations (ex: "à 15% au mois prochain")
        // Cherche "au mois prochain" ou "au le mois prochain" n'importe où dans la requête
        /\b(?:au|à\s+le)\s+(?:le\s+)?(mois\s+prochain|next\s+month)\b/i,
        // Pattern pour "à la semaine prochaine" ou "à semaine prochaine"
        /\b(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)\b/i,
        // Pattern pour "met les deadlines à la semaine prochaine" (avec verbe)
        /(?:met|mets?|déplace|déplacer|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:deadlines?|dealines?)\s+(?:à|pour|pour\s+le)\s+(?:la\s+)?(semaine\s+pro|semaine\s+prochaine|next\s+week)/i,
        // Pattern simple pour "deadline à X" (sans verbe de modification)
        // Doit être détecté comme une commande de mise à jour
        /^deadline\s+(?:à|pour|pour\s+le)\s*(la\s+)?(semaine\s+pro|semaine\s+prochaine|mois\s+prochain|next\s+week|next\s+month|demain|tomorrow|aujourd['']hui|today)/i,
      ];

      console.log('[Parse Query API] 🔍 Test patterns nouvelle deadline pour:', query);
      for (let i = 0; i < newDeadlinePatterns.length; i++) {
        const pattern = newDeadlinePatterns[i];
        const match = query.match(pattern);
        console.log(
          `[Parse Query API] 🔍 Test pattern deadline ${i + 1}:`,
          pattern,
          '→ match:',
          match
        );
        if (match) {
          // Le groupe 1 peut être "la" ou la date, le groupe 2 est la date si "la" est présent
          const dateStr = (match[2] || match[1]).trim();
          console.log('[Parse Query API] 🔍 Date string extraite:', dateStr);
          const parsedDate = parseRelativeDate(dateStr);
          console.log('[Parse Query API] 🔍 Date parsée:', parsedDate);
          if (parsedDate) {
            updateData.newDeadline = parsedDate;
            console.log(
              '[Parse Query API] ✅ Nouvelle deadline détectée:',
              dateStr,
              '->',
              parsedDate
            );
            break;
          }
        }
      }
    }

    // Extraire le nouveau collaborateur
    // D'abord, détecter le pattern spécial "en collab avec X à Y" (filtre X, nouvelle valeur Y)
    // Supporte aussi "collab avec X à Y" (sans "en")
    // Le pattern doit gérer les espaces dans les noms (ex: "Daft Punk")
    // Utiliser des patterns non-greedy avec des limites de mots pour mieux capturer
    const collabFilterToNewPatterns = [
      /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
      /(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
      // Pattern alternatif pour "en collab avec X à Y" avec meilleure gestion des espaces
      /en\s+collab\s+avec\s+([A-Za-z0-9_\s]+?)\s+à\s+([A-Za-z0-9_\s]+?)(?:\s|$)/i,
    ];

    let collabFilterToNewMatch = null;
    for (const pattern of collabFilterToNewPatterns) {
      collabFilterToNewMatch = query.match(pattern);
      if (collabFilterToNewMatch) break;
    }

    if (collabFilterToNewMatch) {
      const filterCollab = collabFilterToNewMatch[1].trim();
      let newCollab = collabFilterToNewMatch[2].trim();
      // Ignorer les mots-clés communs
      const ignoredWords = [
        'projets',
        'projet',
        'les',
        'mes',
        'de',
        'en',
        'le',
        'la',
        'des',
        'avec',
      ];
      // Nettoyer le nom du collaborateur (enlever "avec" au début ou à la fin)
      if (newCollab.toLowerCase().startsWith('avec ')) {
        newCollab = newCollab.substring(5).trim();
      }
      if (newCollab.toLowerCase().endsWith(' avec')) {
        newCollab = newCollab.substring(0, newCollab.length - 5).trim();
      }
      if (!ignoredWords.includes(newCollab.toLowerCase()) && newCollab.length > 0) {
        // Définir le filtre de collaborateur
        filters.collab = filterCollab;
        // Définir la nouvelle valeur
        updateData.newCollab = newCollab;
        console.log(
          '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté:',
          `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
        );
      }
    } else {
      // Patterns: "en mettant en collaborateur X", "en collaborateur X", "avec collaborateur X", "collab X"
      // Pattern amélioré pour "met les projets en collab avec X"
      const newCollabPatterns = [
        /(?:en\s+)?mettant\s+(?:en\s+)?(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
        /(?:en|avec)\s+(?:collaborateur|collab)\s+([A-Za-z0-9_\s]+)/i,
        /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?(?:en|à|avec)\s+(?:collaborateur|collab)\s+(?:avec\s+)?([A-Za-z0-9_\s]+?)(?:\s|$)/i,
      ];

      for (const pattern of newCollabPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          let collabName = match[1].trim();
          // Ignorer les mots-clés communs
          const ignoredWords = ['projets', 'projet', 'les', 'mes', 'de', 'en', 'le', 'la', 'avec'];
          // Si le nom commence par "avec ", l'enlever
          if (collabName.toLowerCase().startsWith('avec ')) {
            collabName = collabName.substring(5).trim();
          }
          // Si le nom se termine par " avec", l'enlever aussi
          if (collabName.toLowerCase().endsWith(' avec')) {
            collabName = collabName.substring(0, collabName.length - 5).trim();
          }
          if (!ignoredWords.includes(collabName.toLowerCase()) && collabName.length > 0) {
            updateData.newCollab = collabName;
            console.log('[Parse Query API] ✅ Nouveau collaborateur détecté:', collabName);
            break;
          }
        }
      }

      // Si on n'a pas trouvé de nouvelle valeur, chercher "à X" après "collab avec Y"
      if (updateData.newCollab === undefined) {
        const collabWithPattern = /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+([A-Za-z0-9_\s]+)/i;
        const collabWithMatch = query.match(collabWithPattern);
        if (collabWithMatch) {
          const filterCollab = collabWithMatch[1].trim();
          filters.collab = filterCollab;
          // Chercher "à X" après
          const aPattern =
            /(?:en\s+)?(?:collab|collaborateur)\s+avec\s+[A-Za-z0-9_\s]+\s+à\s+([A-Za-z0-9_\s]+)/i;
          const aMatch = query.match(aPattern);
          if (aMatch && aMatch[1]) {
            let newCollab = aMatch[1].trim();
            const ignoredWords = [
              'projets',
              'projet',
              'les',
              'mes',
              'de',
              'en',
              'le',
              'la',
              'avec',
            ];
            if (!ignoredWords.includes(newCollab.toLowerCase())) {
              updateData.newCollab = newCollab;
              console.log(
                '[Parse Query API] ✅ Pattern "collab avec X à Y" détecté (en deux étapes):',
                `filtre=${filterCollab}, nouvelle valeur=${newCollab}`
              );
            }
          }
        }
      }
    }

    // Extraire le nouveau style
    // D'abord, détecter le pattern spécial "de style X à Y" (filtre X, nouvelle valeur Y)
    const styleFilterToNewPattern =
      /(?:de|depuis)\s+style\s+([A-Za-z0-9_\s]+)\s+à\s+([A-Za-z0-9_\s]+)/i;
    const styleFilterToNewMatch = query.match(styleFilterToNewPattern);
    if (styleFilterToNewMatch) {
      const filterStyle = styleFilterToNewMatch[1].trim();
      const newStyle = styleFilterToNewMatch[2].trim();
      // Définir le filtre de style
      filters.style = filterStyle;
      // Définir la nouvelle valeur
      const styleMatch = findStyleFromString(newStyle, availableStyles);
      if (styleMatch) {
        updateData.newStyle = styleMatch.style;
      } else {
        updateData.newStyle = newStyle;
      }
      console.log(
        '[Parse Query API] ✅ Pattern "de style X à Y" détecté:',
        `filtre=${filterStyle}, nouvelle valeur=${newStyle}`
      );
    } else {
      // Patterns: "en style X", "change le style à X", "passe en style X", "style X", "en Dnb"
      const newStylePatterns = [
        /(?:en|à)\s+style\s+([A-Za-z0-9_\s]+)/i,
        /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:les?\s+)?(?:projets?\s+)?(?:le\s+)?style\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
        /style\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
        // Pattern pour "met les projets en Dnb" (sans le mot "style")
        /(?:mets?|met|change|changer|modifie|modifier|passe|passer)\s+(?:les?\s+)?(?:projets?\s+)?en\s+([A-Za-z0-9_\s]+)(?:\s|$)/i,
      ];

      for (const pattern of newStylePatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          const styleName = match[1].trim();
          // Ignorer les mots-clés communs
          const ignoredWords = [
            'projets',
            'projet',
            'les',
            'mes',
            'de',
            'en',
            'le',
            'la',
            'des',
            'cours',
            'attente',
            'termine',
          ];
          if (ignoredWords.includes(styleName.toLowerCase())) {
            continue;
          }
          // Vérifier si c'est un style valide
          const styleMatch = findStyleFromString(styleName, availableStyles);
          if (styleMatch) {
            updateData.newStyle = styleMatch.style;
            console.log('[Parse Query API] ✅ Nouveau style détecté:', styleMatch.style);
            break;
          } else {
            // Si pas trouvé dans la liste, utiliser quand même (peut être un nouveau style)
            updateData.newStyle = styleName;
            console.log('[Parse Query API] ✅ Nouveau style détecté (non validé):', styleName);
            break;
          }
        }
      }
    }

    // Extraire le nouveau label (label ciblé)
    // Patterns: "label à X", "change le label à X", "label ciblé X"
    const newLabelPatterns = [
      /(?:label|label\s+cibl[ée])\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
      /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
      /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+cibl[ée]\s+(?:à|en|pour)?\s*([A-Za-z0-9_\s]+)/i,
    ];

    for (const pattern of newLabelPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const labelName = match[1].trim();
        const ignoredWords = [
          'projets',
          'projet',
          'les',
          'mes',
          'de',
          'en',
          'le',
          'la',
          'des',
          'ciblé',
          'ciblée',
        ];
        if (!ignoredWords.includes(labelName.toLowerCase())) {
          updateData.newLabel = labelName;
          console.log('[Parse Query API] ✅ Nouveau label détecté:', labelName);
          break;
        }
      }
    }

    // Extraire le nouveau label final (si signé)
    // Patterns: "label final à X", "signé chez X", "label final X"
    const newLabelFinalPatterns = [
      /(?:label\s+final|sign[ée])\s+(?:à|en|chez|pour)\s+([A-Za-z0-9_\s]+)/i,
      /(?:change|changer|modifie|modifier|passe|passer|mets?|met)\s+(?:le\s+)?label\s+final\s+(?:à|en|pour)\s+([A-Za-z0-9_\s]+)/i,
      /sign[ée]\s+chez\s+([A-Za-z0-9_\s]+)/i,
    ];

    for (const pattern of newLabelFinalPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const labelFinalName = match[1].trim();
        const ignoredWords = [
          'projets',
          'projet',
          'les',
          'mes',
          'de',
          'en',
          'le',
          'la',
          'des',
          'final',
        ];
        if (!ignoredWords.includes(labelFinalName.toLowerCase())) {
          updateData.newLabelFinal = labelFinalName;
          console.log('[Parse Query API] ✅ Nouveau label final détecté:', labelFinalName);
          break;
        }
      }
    }

    // Si on a au moins une modification à faire, c'est une commande de modification valide
    if (
      updateData.newProgress !== undefined ||
      updateData.newStatus !== undefined ||
      updateData.newDeadline !== undefined ||
      updateData.pushDeadlineBy !== undefined ||
      updateData.newCollab !== undefined ||
      updateData.newStyle !== undefined ||
      updateData.newLabel !== undefined ||
      updateData.newLabelFinal !== undefined
    ) {
      console.log('[Parse Query API] updateData final:', updateData);
      // Construire les filtres pour updateData (réutiliser ceux déjà détectés)
      const updateFilters: {
        minProgress?: number;
        maxProgress?: number;
        status?: string;
        hasDeadline?: boolean;
        deadlineDate?: string;
        noProgress?: boolean;
        collab?: string;
        style?: string;
        label?: string;
        labelFinal?: string;
      } = {};

      if (filters.minProgress !== undefined) {
        updateFilters.minProgress = filters.minProgress;
      }
      if (filters.maxProgress !== undefined) {
        updateFilters.maxProgress = filters.maxProgress;
      }
      if (filters.status) {
        updateFilters.status = filters.status;
      }
      if (filters.hasDeadline !== undefined) {
        updateFilters.hasDeadline = filters.hasDeadline;
      }
      if (filters.deadlineDate) {
        updateFilters.deadlineDate = filters.deadlineDate;
      }
      if (filters.noProgress !== undefined) {
        updateFilters.noProgress = filters.noProgress;
      }
      if (filters.collab) {
        updateFilters.collab = filters.collab;
      }
      if (filters.style) {
        updateFilters.style = filters.style;
      }
      if (filters.label) {
        updateFilters.label = filters.label;
      }
      if (filters.labelFinal) {
        updateFilters.labelFinal = filters.labelFinal;
      }

      return {
        filters: updateFilters,
        type: 'update',
        understood: true,
        lang,
        updateData,
        clarification: null,
      };
    }
  }

  return {
    filters,
    type: isCount ? 'count' : isList ? 'list' : 'search',
    understood,
    lang, // Langue détectée pour les réponses côté client
    fieldsToShow: fieldsToShow.length > 0 ? fieldsToShow : undefined, // Retourner les champs demandés
    clarification: understood
      ? null
      : isEnglish
        ? "I didn't understand. Try: 'how many projects under 70%' or 'list my ghost prod'"
        : "Je n'ai pas compris. Essaie: 'combien de projets sous les 70%' ou 'liste mes ghost prod'",
  };
}
