export enum RewardType {
  TOKENS = 'TOKENS',
  ETERNAL_TICKET = 'ETERNAL_TICKET',
  QUEUE_SKIP = 'QUEUE_SKIP',
}

export enum SymbolType {
  CHERRY = '🍒',
  LEMON = '🍋',
  ORANGE = '🍊',
  PLUM = '🫐',
  BELL = '🔔',
  STAR = '⭐',
  SEVEN = '7️⃣',
}

export interface SlotMachineStatus {
  tokens: number;
  nextResetDate: Date;
  totalSpins: number;
  totalWins: number;
}

export interface SpinResult {
  symbols: [SymbolType, SymbolType, SymbolType];
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
}

export interface BatchSpinResult extends SpinResult {
  results: SpinResult[]; // Detailed list of all spins
  summary: {
    totalSpins: number;
    totalWins: number;
    totalTokensWon: number;
    queueSkips: number;
    eternalTickets: number;
    netProfit: number;
    winRate: number;
  };
}
