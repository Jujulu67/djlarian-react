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

export interface ClaimRewardInput {
  rewardType: RewardType;
  rewardAmount: number;
}
