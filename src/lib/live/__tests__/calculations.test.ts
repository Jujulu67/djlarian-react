import {
  calculateMultiplier,
  calculateActiveTickets,
  calculateTicketsFromItems,
  calculateTicketWeight,
  calculateTicketWeightClient,
  calculateChances,
} from '../calculations';
import { LiveItemType, TicketSource } from '@/types/live';
import type { UserTicket, UserLiveItem } from '@/types/live';

// Mock getItemDefinition
jest.mock('../items', () => ({
  getItemDefinition: jest.fn((type) => {
    if (type === 'ETERNAL_TICKET') return { givesTickets: 1 };
    if (type === 'SUBSCRIBER_BONUS') return { givesTickets: 20 };
    if (type === 'LOYALTY_BONUS') return { givesTickets: 10 };
    return { givesTickets: 0 };
  }),
}));

describe('Live Calculations', () => {
  describe('calculateMultiplier', () => {
    it('should return 1.0 for 0 minutes elapsed', () => {
      const now = new Date();
      expect(calculateMultiplier(now, now)).toBe(1.0);
    });

    it('should return approx 1.4 for 15 minutes elapsed', () => {
      const start = new Date();
      const submission = new Date(start.getTime() - 15 * 60 * 1000);
      expect(calculateMultiplier(submission, start)).toBe(1.4);
    });

    it('should return 2.0 for 30 minutes elapsed', () => {
      const start = new Date();
      const submission = new Date(start.getTime() - 30 * 60 * 1000);
      expect(calculateMultiplier(submission, start)).toBe(2.0);
    });

    it('should return 4.0 for 60 minutes elapsed', () => {
      const start = new Date();
      const submission = new Date(start.getTime() - 60 * 60 * 1000);
      expect(calculateMultiplier(submission, start)).toBe(4.0);
    });

    it('should handle time offset', () => {
      const now = new Date();
      // 0 elapsed + 30 offset = 30 minutes effective -> 2.0
      expect(calculateMultiplier(now, now, 30)).toBe(2.0);
    });

    it('should handle negative time offset', () => {
      const start = new Date();
      const submission = new Date(start.getTime() - 15 * 60 * 1000);
      // 15 minutes - 20 offset = -5 minutes -> should be treated as 0 -> 1.0
      expect(calculateMultiplier(submission, start, -20)).toBe(1.0);
    });

    it('should not return negative multiplier', () => {
      const start = new Date();
      const futureSubmission = new Date(start.getTime() + 60 * 60 * 1000);
      expect(calculateMultiplier(futureSubmission, start)).toBe(1.0);
    });

    it('should round to 1 decimal place', () => {
      const start = new Date();
      const submission = new Date(start.getTime() - 45 * 60 * 1000);
      const result = calculateMultiplier(submission, start);
      // Should be approximately 2.8, rounded to 1 decimal
      expect(result).toBeCloseTo(2.8, 1);
    });
  });

  describe('calculateActiveTickets', () => {
    it('should sum valid tickets', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 5,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
        {
          id: '2',
          quantity: 3,
          source: TicketSource.GIFT,
          createdAt: new Date(),
          userId: 'u1',
          expiresAt: new Date(Date.now() + 10000),
        },
      ];
      expect(calculateActiveTickets(tickets)).toBe(8);
    });

    it('should ignore expired tickets', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 5,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
        {
          id: '2',
          quantity: 3,
          source: TicketSource.GIFT,
          createdAt: new Date(),
          userId: 'u1',
          expiresAt: new Date(Date.now() - 10000),
        },
      ];
      expect(calculateActiveTickets(tickets)).toBe(5);
    });

    it('should handle tickets without expiresAt', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 10,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
      ];
      expect(calculateActiveTickets(tickets)).toBe(10);
    });

    it('should handle empty tickets array', () => {
      expect(calculateActiveTickets([])).toBe(0);
    });

    it('should handle tickets with expiresAt exactly at now', () => {
      const now = new Date();
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 5,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
          expiresAt: new Date(now.getTime() - 1), // 1ms ago - expired
        },
        {
          id: '2',
          quantity: 3,
          source: TicketSource.GIFT,
          createdAt: new Date(),
          userId: 'u1',
          expiresAt: new Date(now.getTime() + 1), // 1ms in future - valid
        },
      ];
      expect(calculateActiveTickets(tickets)).toBe(3);
    });
  });

  describe('calculateTicketsFromItems', () => {
    it('should calculate tickets from activated items', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // Mock returns 1 ticket for ETERNAL_TICKET * 2 activated
      expect(calculateTicketsFromItems(items)).toBe(2);
    });

    it('should handle items without LiveItem', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: null,
        },
      ];
      expect(calculateTicketsFromItems(items)).toBe(0);
    });

    it('should handle items with null activatedQuantity', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: null as any,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      expect(calculateTicketsFromItems(items)).toBe(0);
    });

    it('should handle items with givesTickets undefined', () => {
      // Use WAVEFORM_COLOR which doesn't have givesTickets in the mock
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.WAVEFORM_COLOR,
            name: 'Waveform',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // Mock returns { givesTickets: 0 } for WAVEFORM_COLOR, so 0 * 2 = 0
      expect(calculateTicketsFromItems(items)).toBe(0);
    });

    it('should handle multiple items', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 3,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
        {
          id: '2',
          userId: 'u1',
          itemId: 'i2',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i2',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal 2',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // (1 * 3) + (1 * 2) = 5
      expect(calculateTicketsFromItems(items)).toBe(5);
    });

    it('should handle empty items array', () => {
      expect(calculateTicketsFromItems([])).toBe(0);
    });
  });

  describe('calculateTicketWeight', () => {
    it('should calculate base weight', () => {
      expect(calculateTicketWeight([], [])).toBe(1);
    });

    it('should add eternal tickets', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 5,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + 5 eternal
      expect(calculateTicketWeight([], items)).toBe(6);
    });

    it('should add subscriber bonus', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + 20 sub
      expect(calculateTicketWeight([], items)).toBe(21);
    });

    it('should apply multiplier', () => {
      expect(calculateTicketWeight([], [], 2.0)).toBe(2);
    });

    it('should handle multiple subscriber items', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
        {
          id: '2',
          userId: 'u1',
          itemId: 'i2',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i2',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub 2',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + (2 * 20) + (1 * 20) = 61
      expect(calculateTicketWeight([], items)).toBe(61);
    });

    it('should handle multiple loyalty items', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 3,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.LOYALTY_BONUS,
            name: 'Loyalty',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + (3 * 10) = 31
      expect(calculateTicketWeight([], items)).toBe(31);
    });

    it('should handle items without LiveItem', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: null,
        },
      ];
      // Should ignore items without LiveItem
      expect(calculateTicketWeight([], items)).toBe(1);
    });

    it('should handle items with null activatedQuantity', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: null as any,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // Should treat null as 0
      expect(calculateTicketWeight([], items)).toBe(1);
    });

    it('should handle multiplier of 0', () => {
      expect(calculateTicketWeight([], [], 0)).toBe(0);
    });

    it('should handle multiplier of null', () => {
      expect(calculateTicketWeight([], [], null as any)).toBe(1);
    });
  });

  describe('calculateTicketWeightClient', () => {
    it('should calculate weight client side', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.LOYALTY_BONUS,
            name: 'Loyalty',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + 10 loyalty
      expect(calculateTicketWeightClient(items)).toBe(11);
    });

    it('should use custom baseTickets', () => {
      const items: UserLiveItem[] = [];
      expect(calculateTicketWeightClient(items, 5)).toBe(5);
    });

    it('should handle multiple items', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 2,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.ETERNAL_TICKET,
            name: 'Eternal',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
        {
          id: '2',
          userId: 'u1',
          itemId: 'i2',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i2',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      // 1 base + 2 eternal + 20 sub = 23
      expect(calculateTicketWeightClient(items)).toBe(23);
    });

    it('should handle items without LiveItem', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: null,
        },
      ];
      expect(calculateTicketWeightClient(items)).toBe(1);
    });

    it('should handle null activatedQuantity', () => {
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: null as any,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.LOYALTY_BONUS,
            name: 'Loyalty',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];
      expect(calculateTicketWeightClient(items)).toBe(1);
    });
  });

  describe('calculateChances', () => {
    it('should calculate chances with tickets and items', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 5,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
      ];
      const items: UserLiveItem[] = [
        {
          id: '1',
          userId: 'u1',
          itemId: 'i1',
          quantity: 1,
          activatedQuantity: 1,
          isActivated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          LiveItem: {
            id: 'i1',
            type: LiveItemType.SUBSCRIBER_BONUS,
            name: 'Sub',
            createdAt: new Date(),
            updatedAt: new Date(),
            description: null,
            icon: null,
            isActive: true,
          },
        },
      ];

      const result = calculateChances(tickets, items, true);

      expect(result.multiplier).toBe(1.0);
      expect(result.activeTickets).toBe(5);
      expect(result.hasSubmission).toBe(true);
      expect(result.chancePercentage).toBeGreaterThanOrEqual(0);
      expect(result.chancePercentage).toBeLessThanOrEqual(100);
    });

    it('should calculate chances without submission', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 10,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
      ];
      const items: UserLiveItem[] = [];

      const result = calculateChances(tickets, items, false);

      expect(result.hasSubmission).toBe(false);
      expect(result.activeTickets).toBe(10);
    });

    it('should handle empty tickets and items', () => {
      const result = calculateChances([], [], false);

      expect(result.activeTickets).toBe(0);
      expect(result.multiplier).toBe(1.0);
      expect(result.chancePercentage).toBe(0);
    });

    it('should cap chance percentage at 100', () => {
      const tickets: UserTicket[] = [
        {
          id: '1',
          quantity: 100,
          source: TicketSource.PURCHASE,
          createdAt: new Date(),
          userId: 'u1',
        },
      ];
      const items: UserLiveItem[] = [];

      const result = calculateChances(tickets, items, true);

      expect(result.chancePercentage).toBeLessThanOrEqual(100);
    });
  });
});
