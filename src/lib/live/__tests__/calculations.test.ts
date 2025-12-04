import {
  calculateMultiplier,
  calculateActiveTickets,
  calculateTicketsFromItems,
  calculateTicketWeight,
  calculateTicketWeightClient,
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

    it('should handle time offset', () => {
      const now = new Date();
      // 0 elapsed + 30 offset = 30 minutes effective -> 2.0
      expect(calculateMultiplier(now, now, 30)).toBe(2.0);
    });

    it('should not return negative multiplier', () => {
      const start = new Date();
      const futureSubmission = new Date(start.getTime() + 60 * 60 * 1000);
      expect(calculateMultiplier(futureSubmission, start)).toBe(1.0);
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
  });
});
