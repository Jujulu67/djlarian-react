import { SymbolType, RewardType } from '@/types/slot-machine';

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
  let random = Math.random() * totalWeight;

  for (const [symbol, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return symbol as SymbolType;
    }
  }
  return SymbolType.CHERRY; // Fallback
}

/**
 * Détermine la récompense basée sur les symboles
 */
export function determineReward(symbols: [SymbolType, SymbolType, SymbolType]): {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
} {
  const [s1, s2, s3] = symbols;
  const counts: Record<string, number> = {};
  symbols.forEach((s) => (counts[s] = (counts[s] || 0) + 1));

  let maxCount = 0;

  for (const [s, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
    }
  }

  // --- 3 IDENTIQUES (TRIPLE MATCH) ---
  if (counts[s1] === 3) {
    // JACKPOT ULTIME : 3x7
    if (s1 === SymbolType.SEVEN) {
      return {
        rewardType: RewardType.QUEUE_SKIP,
        rewardAmount: 1,
        isWin: true,
        message: '🎉 JACKPOT ULTIME ! Un Queue Skip !',
      };
    }

    // MINI JACKPOT : 3xEtoile
    if (s1 === SymbolType.STAR) {
      return {
        rewardType: RewardType.ETERNAL_TICKET,
        rewardAmount: 1,
        isWin: true,
        message: '🎉 JACKPOT ! Un Ticket Éternel !',
      };
    }

    // Récompenses en jetons pour les autres triples - GROS GAINS!
    let rewardAmount = 0;
    if (s1 === SymbolType.BELL)
      rewardAmount = 200; // MEGA WIN
    else if (s1 === SymbolType.PLUM)
      rewardAmount = 100; // Super win
    else if (s1 === SymbolType.ORANGE)
      rewardAmount = 50; // Nice win
    else if (s1 === SymbolType.LEMON)
      rewardAmount = 25; // Good win
    else if (s1 === SymbolType.CHERRY) rewardAmount = 15; // Small win

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

  // --- 2 IDENTIQUES (DOUBLE MATCH) ---
  // On paye pour n'importe quelle paire, mais le montant dépend du symbole
  for (const [s, count] of Object.entries(counts)) {
    if (count === 2) {
      const symbol = s as SymbolType;
      let rewardAmount = 0;

      if (symbol === SymbolType.SEVEN)
        rewardAmount = 50; // Exciting!
      else if (symbol === SymbolType.STAR) rewardAmount = 30;
      else if (symbol === SymbolType.BELL) rewardAmount = 15;
      else if (symbol === SymbolType.PLUM) rewardAmount = 8;
      else if (symbol === SymbolType.ORANGE)
        rewardAmount = 3; // Break even
      else if (symbol === SymbolType.LEMON)
        rewardAmount = 2; // Small loss
      else if (symbol === SymbolType.CHERRY) rewardAmount = 1; // Loss but still a "win"

      // Message adapté - toujours positif!
      let msg = '';
      if (rewardAmount >= 15) msg = `✨ Beau double! +${rewardAmount} jetons!`;
      else if (rewardAmount >= 8) msg = `✨ Double! +${rewardAmount} jetons!`;
      else if (rewardAmount >= 3) msg = `👍 +${rewardAmount} jetons`;
      else msg = `🍀 +${rewardAmount} jeton`;

      return {
        rewardType: RewardType.TOKENS,
        rewardAmount,
        isWin: true,
        message: msg,
      };
    }
  }

  return {
    rewardType: null,
    rewardAmount: 0,
    isWin: false,
    message: '😔 Pas de chance.',
  };
}
