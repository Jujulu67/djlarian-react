// Live Panel Types

export enum LiveItemType {
  SUBSCRIBER_BONUS = 'SUBSCRIBER_BONUS',
  LOYALTY_BONUS = 'LOYALTY_BONUS',
  WATCH_STREAK = 'WATCH_STREAK',
  CHEER_PROGRESS = 'CHEER_PROGRESS',
  ETERNAL_TICKET = 'ETERNAL_TICKET',
  WAVEFORM_COLOR = 'WAVEFORM_COLOR',
  BACKGROUND_IMAGE = 'BACKGROUND_IMAGE',
  QUEUE_SKIP = 'QUEUE_SKIP',
  SUB_GIFT_BONUS = 'SUB_GIFT_BONUS',
  MARBLES_WINNER_BONUS = 'MARBLES_WINNER_BONUS',
}

export enum LiveSubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TicketSource {
  ETERNAL_TICKET = 'ETERNAL_TICKET',
  LOYALTY_BONUS = 'LOYALTY_BONUS',
  WATCH_STREAK = 'WATCH_STREAK',
  MANUAL = 'MANUAL',
}

export interface LiveSubmission {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  title: string;
  description: string | null;
  status: LiveSubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveItem {
  id: string;
  type: LiveItemType;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLiveItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  isActivated: boolean;
  activatedAt: Date | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  LiveItem?: LiveItem;
}

export interface UserTicket {
  id: string;
  userId: string;
  quantity: number;
  source: TicketSource;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface LiveInventory {
  activatedItems: UserLiveItem[];
  unactivatedItems: UserLiveItem[];
  totalTickets: number;
}

export interface LiveChances {
  multiplier: number;
  chancePercentage: number;
  activeTickets: number;
  hasSubmission: boolean;
  isRolled?: boolean;
}

export interface TwitchSubscriptionStatus {
  isSubscribed: boolean;
  tier: number | null;
  subscriberSince: Date | null;
}

export interface LiveRewards {
  loyalty: {
    current: number;
    threshold: number;
    bonusAvailable: boolean;
  };
  watchStreak: {
    current: number;
    threshold: number;
    bonusAvailable: boolean;
  };
  cheerProgress: {
    current: number;
    threshold: number;
    bonusAvailable: boolean;
  };
}

export interface CreateSubmissionInput {
  title: string;
  description?: string;
  file: File;
}

export interface UpdateInventoryInput {
  itemId: string;
  isActivated: boolean;
}

export interface CreateTicketInput {
  quantity: number;
  source: TicketSource;
  expiresAt?: Date;
}

export interface UpdateRewardsInput {
  loyalty?: number;
  watchStreak?: number;
  cheerProgress?: number;
}
