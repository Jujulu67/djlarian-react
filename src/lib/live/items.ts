import { LiveItemType } from '@/types/live';

export interface ItemDefinition {
  type: LiveItemType;
  name: string;
  description: string;
  icon: string;
  givesTickets?: number; // Nombre de tickets donnés
}

export const LIVE_ITEMS: Record<LiveItemType, ItemDefinition> = {
  [LiveItemType.SUBSCRIBER_BONUS]: {
    type: LiveItemType.SUBSCRIBER_BONUS,
    name: 'Subscriber Bonus',
    description: 'Bonus pour les abonnés Twitch',
    icon: '👑',
  },
  [LiveItemType.LOYALTY_BONUS]: {
    type: LiveItemType.LOYALTY_BONUS,
    name: 'Loyalty Bonus',
    description: 'Bonus de fidélité (au-dessus de 6)',
    icon: '💎',
  },
  [LiveItemType.WATCH_STREAK]: {
    type: LiveItemType.WATCH_STREAK,
    name: 'Watch Streak Bonus',
    description: 'Bonus pour avoir regardé plusieurs streams consécutifs',
    icon: '🔥',
  },
  [LiveItemType.CHEER_PROGRESS]: {
    type: LiveItemType.CHEER_PROGRESS,
    name: 'Cheer Bonus',
    description: 'Bonus pour avoir cheer sur Twitch',
    icon: '💜',
  },
  [LiveItemType.ETERNAL_TICKET]: {
    type: LiveItemType.ETERNAL_TICKET,
    name: 'Eternal Ticket',
    description: 'Ticket permanent pour les soumissions',
    icon: '🎫',
    givesTickets: 25,
  },
  [LiveItemType.WAVEFORM_COLOR]: {
    type: LiveItemType.WAVEFORM_COLOR,
    name: 'Waveform Color',
    description: 'Couleur personnalisée pour le waveform',
    icon: '🎨',
  },
  [LiveItemType.BACKGROUND_IMAGE]: {
    type: LiveItemType.BACKGROUND_IMAGE,
    name: 'Background Image',
    description: 'Image de fond personnalisée',
    icon: '🖼️',
  },
  [LiveItemType.QUEUE_SKIP]: {
    type: LiveItemType.QUEUE_SKIP,
    name: 'Queue Skip',
    description: "Passe la file d'attente pour la prochaine soumission",
    icon: '⏭️',
  },
  [LiveItemType.SUB_GIFT_BONUS]: {
    type: LiveItemType.SUB_GIFT_BONUS,
    name: 'Sub Gift Bonus',
    description: 'Bonus pour avoir offert un abonnement',
    icon: '🎁',
  },
  [LiveItemType.MARBLES_WINNER_BONUS]: {
    type: LiveItemType.MARBLES_WINNER_BONUS,
    name: 'Marbles Winner Bonus',
    description: 'Bonus pour avoir gagné un jeu de marbles',
    icon: '🎲',
  },
  [LiveItemType.SHINY_NAME]: {
    type: LiveItemType.SHINY_NAME,
    name: 'Shiny Name',
    description: 'Nom brillant et scintillant',
    icon: '✨',
  },
};

export function getItemDefinition(type: LiveItemType): ItemDefinition | undefined {
  return LIVE_ITEMS[type];
}

export function getAllItemDefinitions(): ItemDefinition[] {
  return Object.values(LIVE_ITEMS);
}
