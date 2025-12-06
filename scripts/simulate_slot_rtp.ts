import { SymbolType, RewardType } from '../src/types/slot-machine';

// Exact copy of logic from production route for verification

const COST_PER_SPIN = 3;
const SIMULATION_SPINS = 1000000;

// --- SLOT MACHINE CONFIGURATION ---
const SYMBOL_WEIGHTS = {
  [SymbolType.CHERRY]: 50,
  [SymbolType.LEMON]: 40,
  [SymbolType.ORANGE]: 25,
  [SymbolType.PLUM]: 18,
  [SymbolType.BELL]: 12,
  [SymbolType.STAR]: 6,
  [SymbolType.SEVEN]: 2,
};

const SYMBOL_VALUES = {
  [SymbolType.CHERRY]: 2,
  [SymbolType.LEMON]: 5,
  [SymbolType.ORANGE]: 10,
  [SymbolType.PLUM]: 15,
  [SymbolType.BELL]: 25,
  [SymbolType.STAR]: 50,
  [SymbolType.SEVEN]: 100,
};

// Item value estimation for RTP calculation
const VALUE_ESTIMATES = {
  [RewardType.TOKENS]: 1,
  [RewardType.ETERNAL_TICKET]: 50,
  [RewardType.QUEUE_SKIP]: 500,
};

// --- SIMULATION LOGIC ---

function getRandomSymbol(): SymbolType {
  const totalWeight = Object.values(SYMBOL_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [symbol, weight] of Object.entries(SYMBOL_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return symbol as SymbolType;
    }
  }
  return SymbolType.CHERRY; // Fallback
}

function determineReward(symbols: [SymbolType, SymbolType, SymbolType]): {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
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
    if (s1 === SymbolType.SEVEN) {
      return { rewardType: RewardType.QUEUE_SKIP, rewardAmount: 1, isWin: true };
    }
    if (s1 === SymbolType.STAR) {
      return { rewardType: RewardType.ETERNAL_TICKET, rewardAmount: 1, isWin: true };
    }

    let rewardAmount = 0;
    if (s1 === SymbolType.BELL) rewardAmount = 200;
    else if (s1 === SymbolType.PLUM) rewardAmount = 100;
    else if (s1 === SymbolType.ORANGE) rewardAmount = 50;
    else if (s1 === SymbolType.LEMON) rewardAmount = 25;
    else if (s1 === SymbolType.CHERRY) rewardAmount = 15;

    return { rewardType: RewardType.TOKENS, rewardAmount, isWin: true };
  }

  // --- 2 IDENTIQUES (DOUBLE MATCH) ---
  for (const [s, count] of Object.entries(counts)) {
    if (count === 2) {
      const symbol = s as SymbolType;
      let rewardAmount = 0;

      if (symbol === SymbolType.SEVEN) rewardAmount = 50;
      else if (symbol === SymbolType.STAR) rewardAmount = 30;
      else if (symbol === SymbolType.BELL) rewardAmount = 15;
      else if (symbol === SymbolType.PLUM) rewardAmount = 8;
      else if (symbol === SymbolType.ORANGE) rewardAmount = 3;
      else if (symbol === SymbolType.LEMON) rewardAmount = 2;
      else if (symbol === SymbolType.CHERRY) rewardAmount = 1;

      return { rewardType: RewardType.TOKENS, rewardAmount, isWin: true };
    }
  }

  return { rewardType: null, rewardAmount: 0, isWin: false };
}

// --- RUN SIMULATION ---

function runSimulation() {
  let totalSpent = 0;
  let totalWonValue = 0;
  let wins = 0;
  const hits = {
    [RewardType.TOKENS]: 0,
    [RewardType.ETERNAL_TICKET]: 0,
    [RewardType.QUEUE_SKIP]: 0,
  };

  console.log(`Starting simulation of ${SIMULATION_SPINS} spins...`);

  for (let i = 0; i < SIMULATION_SPINS; i++) {
    totalSpent += COST_PER_SPIN;
    const symbols: [SymbolType, SymbolType, SymbolType] = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol(),
    ];
    const result = determineReward(symbols);

    if (result.isWin) {
      wins++;
      if (result.rewardType === RewardType.TOKENS) {
        totalWonValue += result.rewardAmount;
      } else if (result.rewardType) {
        totalWonValue += VALUE_ESTIMATES[result.rewardType] * result.rewardAmount;
        hits[result.rewardType]++;
      }
    }
  }

  const rtp = (totalWonValue / totalSpent) * 100;
  const hitFrequency = (wins / SIMULATION_SPINS) * 100;

  console.log('--- RESULTS ---');
  console.log(`RTP: ${rtp.toFixed(2)}%`);
  console.log(`Hit Frequency: ${hitFrequency.toFixed(2)}%`);
  console.log(`Total Spent: ${totalSpent}`);
  console.log(`Total Value Won: ${totalWonValue}`);
  console.log(`Wins: ${wins}`);
  console.log(`Special Items Won:`);
  console.log(`  Eternal Tickets: ${hits[RewardType.ETERNAL_TICKET]}`);
  console.log(`  Queue Skips: ${hits[RewardType.QUEUE_SKIP]}`);
}

runSimulation();
