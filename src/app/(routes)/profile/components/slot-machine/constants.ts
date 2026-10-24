import { SymbolType } from '@/types/slot-machine';

export const SYMBOL_EMOJIS: Record<SymbolType, string> = {
  [SymbolType.CHERRY]: '🍒',
  [SymbolType.LEMON]: '🍋',
  [SymbolType.ORANGE]: '🍊',
  [SymbolType.PLUM]: '🫐',
  [SymbolType.BELL]: '🔔',
  [SymbolType.STAR]: '⭐',
  [SymbolType.SEVEN]: '7️⃣',
};

// Couleurs néon pour le mode moderne
export const SYMBOL_GLOWS: Record<SymbolType, string> = {
  [SymbolType.CHERRY]: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
  [SymbolType.LEMON]: 'shadow-[0_0_20px_rgba(234,179,8,0.6)]',
  [SymbolType.ORANGE]: 'shadow-[0_0_20px_rgba(249,115,22,0.6)]',
  [SymbolType.PLUM]: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]',
  [SymbolType.BELL]: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]',
  [SymbolType.STAR]: 'shadow-[0_0_20px_rgba(253,224,71,0.6)]',
  [SymbolType.SEVEN]: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]',
};
