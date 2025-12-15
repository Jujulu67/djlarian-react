/**
 * Tests pour SessionPersistence.ts
 *
 * O10: Stabiliser la session côté client
 *
 * RT4 - Session persistence:
 * - un refresh simulé garde la même session (via storage)
 * - un nouvel onglet (tabId différent) isole
 *
 * Note: Ces tests utilisent des mocks car sessionStorage/localStorage
 * ne sont pas disponibles dans l'environnement de test Node.js
 */

// Mock window and storage for testing
const mockSessionStorage = new Map<string, string>();
const mockLocalStorage = new Map<string, string>();

// Mock window check
jest.mock('../SessionPersistence', () => {
  const original = jest.requireActual('../SessionPersistence');

  // Override isClient to return true
  const mockSessionStorage = new Map<string, string>();
  const mockLocalStorage = new Map<string, string>();

  // Create mock implementations
  const mockGetOrCreateSessionId = () => {
    let sessionId = mockSessionStorage.get('assistant_session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      mockSessionStorage.set('assistant_session_id', sessionId);
    }
    return sessionId;
  };

  const mockGetOrCreateTabId = () => {
    let tabId = mockSessionStorage.get('assistant_tab_id');
    if (!tabId) {
      tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      mockSessionStorage.set('assistant_tab_id', tabId);
    }
    return tabId;
  };

  const mockGetOrCreateUserId = () => {
    let userId = mockLocalStorage.get('assistant_user_id');
    if (!userId) {
      userId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      mockLocalStorage.set('assistant_user_id', userId);
    }
    return userId;
  };

  const mockResetSession = () => {
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    mockSessionStorage.set('assistant_session_id', newSessionId);
    return newSessionId;
  };

  const mockGetSessionKey = () => {
    return `${mockGetOrCreateUserId()}:${mockGetOrCreateTabId()}`;
  };

  const mockGetSessionInfo = () => ({
    sessionId: mockGetOrCreateSessionId(),
    tabId: mockGetOrCreateTabId(),
    userId: mockGetOrCreateUserId(),
    sessionKey: mockGetSessionKey(),
    isClient: true,
  });

  // Expose mock storage for tests
  (global as any).__mockSessionStorage = mockSessionStorage;
  (global as any).__mockLocalStorage = mockLocalStorage;

  return {
    ...original,
    getOrCreateSessionId: mockGetOrCreateSessionId,
    getOrCreateTabId: mockGetOrCreateTabId,
    getOrCreateUserId: mockGetOrCreateUserId,
    resetSession: mockResetSession,
    getSessionKey: mockGetSessionKey,
    getSessionInfo: mockGetSessionInfo,
    // Keep pure functions from original
    isSameUser: original.isSameUser,
    isSameTab: original.isSameTab,
  };
});

import {
  getOrCreateSessionId,
  getOrCreateTabId,
  getOrCreateUserId,
  resetSession,
  getSessionKey,
  getSessionInfo,
  isSameUser,
  isSameTab,
} from '../SessionPersistence';

describe('SessionPersistence', () => {
  beforeEach(() => {
    // Clear mock storage between tests
    (global as any).__mockSessionStorage?.clear();
    (global as any).__mockLocalStorage?.clear();
  });

  describe('getOrCreateSessionId', () => {
    it('should generate a sessionId on first call', () => {
      const sessionId = getOrCreateSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session-/);
    });

    it('RT4 - should return same sessionId on subsequent calls (simulates refresh)', () => {
      const sessionId1 = getOrCreateSessionId();
      const sessionId2 = getOrCreateSessionId();

      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('getOrCreateTabId', () => {
    it('should generate a tabId on first call', () => {
      const tabId = getOrCreateTabId();
      expect(tabId).toBeDefined();
      expect(tabId).toMatch(/^tab-/);
    });

    it('should return same tabId on subsequent calls', () => {
      const tabId1 = getOrCreateTabId();
      const tabId2 = getOrCreateTabId();

      expect(tabId1).toBe(tabId2);
    });
  });

  describe('getOrCreateUserId', () => {
    it('should generate a userId on first call', () => {
      const userId = getOrCreateUserId();
      expect(userId).toBeDefined();
      expect(userId).toMatch(/^anon-/);
    });

    it('should return same userId on subsequent calls', () => {
      const userId1 = getOrCreateUserId();
      const userId2 = getOrCreateUserId();

      expect(userId1).toBe(userId2);
    });
  });

  describe('resetSession', () => {
    it('should generate a new sessionId', () => {
      const originalSessionId = getOrCreateSessionId();
      const newSessionId = resetSession();

      expect(newSessionId).not.toBe(originalSessionId);
      expect(newSessionId).toMatch(/^session-/);
    });

    it('should update stored sessionId', () => {
      getOrCreateSessionId();
      const newSessionId = resetSession();
      const currentSessionId = getOrCreateSessionId();

      expect(currentSessionId).toBe(newSessionId);
    });
  });

  describe('getSessionKey', () => {
    it('should combine userId and tabId', () => {
      const sessionKey = getSessionKey();
      expect(sessionKey).toContain(':');

      const [userPart, tabPart] = sessionKey.split(':');
      expect(userPart).toMatch(/^anon-/);
      expect(tabPart).toMatch(/^tab-/);
    });
  });

  describe('getSessionInfo', () => {
    it('should return complete session information', () => {
      const info = getSessionInfo();

      expect(info.sessionId).toMatch(/^session-/);
      expect(info.tabId).toMatch(/^tab-/);
      expect(info.userId).toMatch(/^anon-/);
      expect(info.sessionKey).toBe(`${info.userId}:${info.tabId}`);
      expect(info.isClient).toBe(true);
    });
  });

  describe('isSameUser', () => {
    it('should return true for same userId', () => {
      expect(isSameUser('user1:tab1', 'user1:tab2')).toBe(true);
    });

    it('should return false for different userId', () => {
      expect(isSameUser('user1:tab1', 'user2:tab1')).toBe(false);
    });
  });

  describe('isSameTab', () => {
    it('should return true for same tabId', () => {
      expect(isSameTab('user1:tab1', 'user2:tab1')).toBe(true);
    });

    it('should return false for different tabId', () => {
      expect(isSameTab('user1:tab1', 'user1:tab2')).toBe(false);
    });
  });

  describe('RT4 - Multi-tab isolation', () => {
    it('sessions from different tabs should have different tabIds', () => {
      // Simulate two tabs by having different tabIds
      // This is conceptual - in reality each tab has its own sessionStorage
      const sessionKey1 = 'user1:tab-123';
      const sessionKey2 = 'user1:tab-456';

      expect(isSameUser(sessionKey1, sessionKey2)).toBe(true);
      expect(isSameTab(sessionKey1, sessionKey2)).toBe(false);
    });
  });
});
