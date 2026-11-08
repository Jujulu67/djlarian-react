import { SymbolType, RewardType } from '@/types/slot-machine';
import { secureRandom } from '@/lib/utils/random';

// --- CONFIGURATION ---
// Tuned for ~96% RTP with high Hit Frequency (>50%)

export const SYMBOL_WEIGHTS = {
  [SymbolType.CHERRY]: 50, // Less common = less boring +2
  [SymbolType.LEMON]: 40,
  [SymbolType.ORANGE]: 25,
  [SymbolType.PLUM]: 18, // Medium = exciting wins
  [SymbolType.BELL]: 12, // Rare = big excitement
  [SymbolType.STAR]: 6,
  [SymbolType.SEVEN]: 2, // Ultra rare jackpot
};

// Booster Mode: Increase Cherry/Lemon weights by ~50%
// This increases hit frequency for small wins without touching Jackpot odds
export const BOOSTED_WEIGHTS = {
  ...SYMBOL_WEIGHTS,
  [SymbolType.CHERRY]: 70,
  [SymbolType.LEMON]: 55,
  [SymbolType.PLUM]: 25, // More medium wins in boost mode
};

export const SYMBOL_VALUES = {
  [SymbolType.CHERRY]: 2,
  [SymbolType.LEMON]: 5,
  [SymbolType.ORANGE]: 10,
  [SymbolType.PLUM]: 15,
  [SymbolType.BELL]: 25,
  [SymbolType.STAR]: 50,
  [SymbolType.SEVEN]: 100,
};

export const COST_PER_SPIN = 3;

/**
 * Génère un symbole aléatoire basé sur les poids
 * @param useBooster Si true, utilise les poids boostés (plus de petits gains)
 */
export function getRandomSymbol(useBooster = false): SymbolType {
  const weights = useBooster ? BOOSTED_WEIGHTS : SYMBOL_WEIGHTS;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let random = secureRandom() * totalWeight;

  for (const [symbol, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return symbol as SymbolType;
    }
  }
  return SymbolType.CHERRY; // Fallback
}

interface RewardOutcome {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
}

/** Jetons gagnés pour un triple (les jackpots 3x7 et 3x étoile sont traités à part). */
const TRIPLE_TOKEN_REWARDS: Partial<Record<SymbolType, number>> = {
  [SymbolType.BELL]: 200, // MEGA WIN
  [SymbolType.PLUM]: 100, // Super win
  [SymbolType.ORANGE]: 50, // Nice win
  [SymbolType.LEMON]: 25, // Good win
  [SymbolType.CHERRY]: 15, // Small win
};

/** Jetons gagnés pour une paire, selon le symbole. */
const DOUBLE_TOKEN_REWARDS: Partial<Record<SymbolType, number>> = {
  [SymbolType.SEVEN]: 50, // Exciting!
  [SymbolType.STAR]: 30,
  [SymbolType.BELL]: 15,
  [SymbolType.PLUM]: 8,
  [SymbolType.ORANGE]: 3, // Break even
  [SymbolType.LEMON]: 2, // Small loss
  [SymbolType.CHERRY]: 1, // Loss but still a "win"
};

function getTripleReward(symbol: SymbolType): RewardOutcome {
  // JACKPOT ULTIME : 3x7
  if (symbol === SymbolType.SEVEN) {
    return {
      rewardType: RewardType.QUEUE_SKIP,
      rewardAmount: 1,
      isWin: true,
      message: '🎉 JACKPOT ULTIME ! Un Queue Skip !',
    };
  }

  // MINI JACKPOT : 3xEtoile
  if (symbol === SymbolType.STAR) {
    return {
      rewardType: RewardType.ETERNAL_TICKET,
      rewardAmount: 1,
      isWin: true,
      message: '🎉 JACKPOT ! Un Ticket Éternel !',
    };
  }

  // Récompenses en jetons pour les autres triples - GROS GAINS!
  const rewardAmount = TRIPLE_TOKEN_REWARDS[symbol] ?? 0;
  return {
    rewardType: RewardType.TOKENS,
    rewardAmount,
    isWin: true,
    message:
      rewardAmount >= 100
        ? `💰 MEGA WIN! +${rewardAmount} jetons!`
        : `🎉 TRIPLE! +${rewardAmount} jetons!`,
  };
}

function getDoubleMessage(rewardAmount: number): string {
  // Message adapté - toujours positif!
  if (rewardAmount >= 15) return `✨ Beau double! +${rewardAmount} jetons!`;
  if (rewardAmount >= 8) return `✨ Double! +${rewardAmount} jetons!`;
  if (rewardAmount >= 3) return `👍 +${rewardAmount} jetons`;
  return `🍀 +${rewardAmount} jeton`;
}

function getDoubleReward(symbol: SymbolType): RewardOutcome {
  const rewardAmount = DOUBLE_TOKEN_REWARDS[symbol] ?? 0;
  return {
    rewardType: RewardType.TOKENS,
    rewardAmount,
    isWin: true,
    message: getDoubleMessage(rewardAmount),
  };
}

/**
 * Détermine la récompense basée sur les symboles
 */
export function determineReward(symbols: [SymbolType, SymbolType, SymbolType]): RewardOutcome {
  const [s1] = symbols;
  const counts: Record<string, number> = {};
  symbols.forEach((s) => (counts[s] = (counts[s] || 0) + 1));

  // --- 3 IDENTIQUES (TRIPLE MATCH) ---
  if (counts[s1] === 3) {
    return getTripleReward(s1);
  }

  // --- 2 IDENTIQUES (DOUBLE MATCH) ---
  // On paye pour n'importe quelle paire, mais le montant dépend du symbole
  for (const [s, count] of Object.entries(counts)) {
    if (count === 2) {
      return getDoubleReward(s as SymbolType);
    }
  }

  return {
    rewardType: null,
    rewardAmount: 0,
    isWin: false,
    message: '😔 Pas de chance.',
  };
}
