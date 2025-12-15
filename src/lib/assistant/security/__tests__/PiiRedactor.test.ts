/**
 * Tests O13 - PII Redactor & Debug Guard
 *
 * Vérifie:
 * - Redaction: email/téléphone/carte → remplacés par tags
 * - Debug guard: en prod, ASSISTANT_DEBUG=true ne log pas sans ASSISTANT_DEBUG_ALLOW_IN_PROD
 */

import {
  redactPii,
  containsPii,
  detectPiiTypes,
  isDebugAllowed,
  safeDebugLog,
  redactObject,
} from '../PiiRedactor';

describe('O13: PII Redaction', () => {
  describe('Email Detection', () => {
    it('should redact email addresses', () => {
      const input = 'Contact: john.doe@example.com for more info';
      const result = redactPii(input);

      expect(result).toBe('Contact: [EMAIL] for more info');
      expect(result).not.toContain('@');
    });

    it('should redact multiple emails', () => {
      const input = 'Emails: alice@test.org and bob@company.co.uk';
      const result = redactPii(input);

      expect(result).toBe('Emails: [EMAIL] and [EMAIL]');
    });

    it('should detect email type', () => {
      const types = detectPiiTypes('user@example.com');
      expect(types).toContain('EMAIL');
    });
  });

  describe('Phone Detection', () => {
    it('should redact French phone numbers', () => {
      const cases = [
        { input: 'Tel: 06 12 34 56 78', expected: 'Tel: [PHONE]' },
        { input: 'Tel: 0612345678', expected: 'Tel: [PHONE]' },
        { input: 'Tel: 06.12.34.56.78', expected: 'Tel: [PHONE]' },
      ];

      for (const { input, expected } of cases) {
        expect(redactPii(input)).toBe(expected);
      }
    });

    it('should redact international phone numbers', () => {
      const input = 'Call +33 6 12 34 56 78 or +1 555 123 4567';
      const result = redactPii(input);

      expect(result).toContain('[PHONE]');
      expect(result).not.toMatch(/\+33/);
    });

    it('should redact US phone numbers', () => {
      const cases = ['(555) 123-4567', '555-123-4567'];

      for (const phone of cases) {
        expect(containsPii(`Call ${phone}`)).toBe(true);
      }
    });
  });

  describe('Credit Card Detection', () => {
    it('should redact credit card numbers', () => {
      const cases = [
        { input: 'Card: 4111 1111 1111 1111', expected: 'Card: [CARD]' },
        { input: 'Card: 4111-1111-1111-1111', expected: 'Card: [CARD]' },
        { input: 'Card: 4111111111111111', expected: 'Card: [CARD]' },
      ];

      for (const { input, expected } of cases) {
        expect(redactPii(input)).toBe(expected);
      }
    });

    it('should detect card type', () => {
      const types = detectPiiTypes('Pay with 5500 0000 0000 0004');
      expect(types).toContain('CARD');
    });
  });

  describe('API Key Detection', () => {
    it('should redact OpenAI style API keys', () => {
      const input = 'API key: sk-1234567890abcdefghijklmnop';
      const result = redactPii(input);

      expect(result).toContain('[API_KEY]');
      expect(result).not.toContain('sk-');
    });

    it('should redact Groq API keys', () => {
      const input = 'Key: gsk_' + 'a'.repeat(50);
      const result = redactPii(input);

      expect(result).toContain('[API_KEY]');
    });

    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc';
      const result = redactPii(input);

      expect(result).toContain('[API_KEY]');
    });

    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature123abc';
      const result = redactPii(`Token: ${jwt}`);

      expect(result).toContain('[API_KEY]');
    });
  });

  describe('IBAN Detection', () => {
    it('should redact IBAN numbers', () => {
      const input = 'IBAN: FR76 3000 6000 0112 3456 7890 189';
      const result = redactPii(input);

      expect(result).toContain('[IBAN]');
    });
  });

  describe('Combined Detection', () => {
    it('should redact multiple PII types in same text', () => {
      const input = 'Contact john@example.com at +33 6 12 34 56 78, pay with 4111111111111111';
      const result = redactPii(input, { returnDetails: true });

      expect(result.redactionCount).toBeGreaterThanOrEqual(3);
      expect(result.detectedTypes).toContain('EMAIL');
      expect(result.detectedTypes).toContain('PHONE');
      expect(result.detectedTypes).toContain('CARD');
    });

    it('should return redaction count with details', () => {
      const input = 'user1@test.com and user2@test.com';
      const result = redactPii(input, { returnDetails: true });

      expect(result.redactionCount).toBe(2);
      expect(result.text).toBe('[EMAIL] and [EMAIL]');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(redactPii('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(redactPii(null as unknown as string)).toBe('');
      expect(redactPii(undefined as unknown as string)).toBe('');
    });

    it('should not modify text without PII', () => {
      const input = 'Hello, this is a regular message without sensitive data.';
      expect(redactPii(input)).toBe(input);
      expect(containsPii(input)).toBe(false);
    });
  });

  describe('Object Redaction', () => {
    it('should redact strings in objects', () => {
      const obj = {
        name: 'John',
        email: 'john@example.com',
        phone: '06 12 34 56 78',
        nested: {
          card: '4111111111111111',
        },
      };

      const result = redactObject(obj);

      expect(result.email).toBe('[EMAIL]');
      expect(result.phone).toBe('[PHONE]');
      expect((result.nested as { card: string }).card).toBe('[CARD]');
    });

    it('should handle arrays', () => {
      const obj = {
        emails: ['a@b.com', 'c@d.com'],
      };

      const result = redactObject(obj);

      expect(result.emails).toEqual(['[EMAIL]', '[EMAIL]']);
    });
  });
});

describe('O13: Debug Guard in Production', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isDebugAllowed', () => {
    it('should allow debug in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.ASSISTANT_DEBUG = 'true';

      // Re-import to get fresh evaluation
      jest.resetModules();
      const { isDebugAllowed: freshIsDebugAllowed } = require('../PiiRedactor');

      expect(freshIsDebugAllowed()).toBe(true);
    });

    it('should block debug in production without ALLOW_IN_PROD', () => {
      process.env.NODE_ENV = 'production';
      process.env.ASSISTANT_DEBUG = 'true';
      delete process.env.ASSISTANT_DEBUG_ALLOW_IN_PROD;

      jest.resetModules();
      const { isDebugAllowed: freshIsDebugAllowed } = require('../PiiRedactor');

      expect(freshIsDebugAllowed()).toBe(false);
    });

    it('should allow debug in production with ALLOW_IN_PROD=true', () => {
      process.env.NODE_ENV = 'production';
      process.env.ASSISTANT_DEBUG = 'true';
      process.env.ASSISTANT_DEBUG_ALLOW_IN_PROD = 'true';

      jest.resetModules();
      const { isDebugAllowed: freshIsDebugAllowed } = require('../PiiRedactor');

      expect(freshIsDebugAllowed()).toBe(true);
    });

    it('should not debug when ASSISTANT_DEBUG is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ASSISTANT_DEBUG;

      jest.resetModules();
      const { isDebugAllowed: freshIsDebugAllowed } = require('../PiiRedactor');

      expect(freshIsDebugAllowed()).toBe(false);
    });
  });

  describe('safeDebugLog', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should not log when debug is not allowed', () => {
      process.env.NODE_ENV = 'production';
      process.env.ASSISTANT_DEBUG = 'true';
      delete process.env.ASSISTANT_DEBUG_ALLOW_IN_PROD;

      jest.resetModules();
      const { safeDebugLog: freshSafeDebugLog } = require('../PiiRedactor');

      freshSafeDebugLog('Test', 'Message with john@example.com');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should redact PII when logging in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.ASSISTANT_DEBUG = 'true';

      jest.resetModules();
      const { safeDebugLog: freshSafeDebugLog } = require('../PiiRedactor');

      freshSafeDebugLog('Test', 'User email is john@example.com');

      expect(consoleSpy).toHaveBeenCalled();
      const loggedMessage = consoleSpy.mock.calls[0][1];
      expect(loggedMessage).not.toContain('john@example.com');
      expect(loggedMessage).toContain('[EMAIL]');
    });
  });
});
