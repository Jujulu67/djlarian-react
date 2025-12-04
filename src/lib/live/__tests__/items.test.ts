import { LiveItemType } from '@/types/live';

import { LIVE_ITEMS, getItemDefinition, getAllItemDefinitions } from '../items';

describe('items', () => {
  describe('LIVE_ITEMS', () => {
    it('should have all item types defined', () => {
      const expectedTypes = [
        LiveItemType.SUBSCRIBER_BONUS,
        LiveItemType.LOYALTY_BONUS,
        LiveItemType.WATCH_STREAK,
        LiveItemType.CHEER_PROGRESS,
        LiveItemType.ETERNAL_TICKET,
        LiveItemType.WAVEFORM_COLOR,
        LiveItemType.BACKGROUND_IMAGE,
        LiveItemType.QUEUE_SKIP,
        LiveItemType.SUB_GIFT_BONUS,
        LiveItemType.MARBLES_WINNER_BONUS,
      ];

      expectedTypes.forEach((type) => {
        expect(LIVE_ITEMS[type]).toBeDefined();
      });
    });

    it('should have required fields for each item', () => {
      Object.values(LIVE_ITEMS).forEach((item) => {
        expect(item.type).toBeDefined();
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.icon).toBeTruthy();
      });
    });

    it('should have correct structure for SUBSCRIBER_BONUS', () => {
      const item = LIVE_ITEMS[LiveItemType.SUBSCRIBER_BONUS];
      expect(item.type).toBe(LiveItemType.SUBSCRIBER_BONUS);
      expect(item.name).toBe('Subscriber Bonus');
      expect(item.icon).toBe('👑');
    });

    it('should have correct structure for ETERNAL_TICKET', () => {
      const item = LIVE_ITEMS[LiveItemType.ETERNAL_TICKET];
      expect(item.type).toBe(LiveItemType.ETERNAL_TICKET);
      expect(item.name).toBe('Eternal Ticket');
      expect(item.icon).toBe('🎫');
      expect(item.givesTickets).toBe(25);
    });

    it('should have givesTickets only for ETERNAL_TICKET', () => {
      Object.values(LIVE_ITEMS).forEach((item) => {
        if (item.type === LiveItemType.ETERNAL_TICKET) {
          expect(item.givesTickets).toBe(25);
        } else {
          expect(item.givesTickets).toBeUndefined();
        }
      });
    });

    it('should have unique icons for each item', () => {
      const icons = Object.values(LIVE_ITEMS).map((item) => item.icon);
      const uniqueIcons = new Set(icons);
      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should have unique names for each item', () => {
      const names = Object.values(LIVE_ITEMS).map((item) => item.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('getItemDefinition', () => {
    it('should return item definition for valid type', () => {
      const item = getItemDefinition(LiveItemType.SUBSCRIBER_BONUS);
      expect(item).toBeDefined();
      expect(item?.type).toBe(LiveItemType.SUBSCRIBER_BONUS);
      expect(item?.name).toBe('Subscriber Bonus');
    });

    it('should return item definition for ETERNAL_TICKET', () => {
      const item = getItemDefinition(LiveItemType.ETERNAL_TICKET);
      expect(item).toBeDefined();
      expect(item?.type).toBe(LiveItemType.ETERNAL_TICKET);
      expect(item?.givesTickets).toBe(25);
    });

    it('should return item definition for all item types', () => {
      const types = [
        LiveItemType.SUBSCRIBER_BONUS,
        LiveItemType.LOYALTY_BONUS,
        LiveItemType.WATCH_STREAK,
        LiveItemType.CHEER_PROGRESS,
        LiveItemType.ETERNAL_TICKET,
        LiveItemType.WAVEFORM_COLOR,
        LiveItemType.BACKGROUND_IMAGE,
        LiveItemType.QUEUE_SKIP,
        LiveItemType.SUB_GIFT_BONUS,
        LiveItemType.MARBLES_WINNER_BONUS,
      ];

      types.forEach((type) => {
        const item = getItemDefinition(type);
        expect(item).toBeDefined();
        expect(item?.type).toBe(type);
      });
    });

    it('should return undefined for invalid type', () => {
      const item = getItemDefinition('INVALID_TYPE' as LiveItemType);
      expect(item).toBeUndefined();
    });
  });

  describe('getAllItemDefinitions', () => {
    it('should return all item definitions', () => {
      const items = getAllItemDefinitions();
      expect(items).toHaveLength(10);
    });

    it('should return array of ItemDefinition objects', () => {
      const items = getAllItemDefinitions();
      items.forEach((item) => {
        expect(item.type).toBeDefined();
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.icon).toBeTruthy();
      });
    });

    it('should include all item types', () => {
      const items = getAllItemDefinitions();
      const types = items.map((item) => item.type);

      expect(types).toContain(LiveItemType.SUBSCRIBER_BONUS);
      expect(types).toContain(LiveItemType.LOYALTY_BONUS);
      expect(types).toContain(LiveItemType.WATCH_STREAK);
      expect(types).toContain(LiveItemType.CHEER_PROGRESS);
      expect(types).toContain(LiveItemType.ETERNAL_TICKET);
      expect(types).toContain(LiveItemType.WAVEFORM_COLOR);
      expect(types).toContain(LiveItemType.BACKGROUND_IMAGE);
      expect(types).toContain(LiveItemType.QUEUE_SKIP);
      expect(types).toContain(LiveItemType.SUB_GIFT_BONUS);
      expect(types).toContain(LiveItemType.MARBLES_WINNER_BONUS);
    });

    it('should return items with correct properties', () => {
      const items = getAllItemDefinitions();
      const eternalTicket = items.find((item) => item.type === LiveItemType.ETERNAL_TICKET);
      expect(eternalTicket?.givesTickets).toBe(25);
    });
  });
});
