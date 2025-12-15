/**
 * Tests pour SanitizeGroqMessages.ts
 *
 * O8: Validation stricte des messages Groq
 *
 * RT3 - Sanitize messages:
 * - si un message a content non-string (objet), la sanitization le corrige ou le rejette
 * - prouver que le payload final est valide
 */

import {
  sanitizeGroqMessages,
  validateGroqMessages,
  createValidGroqMessage,
  ValidGroqMessage,
} from '../SanitizeGroqMessages';

describe('SanitizeGroqMessages', () => {
  describe('sanitizeGroqMessages', () => {
    describe('valid messages', () => {
      it('should pass through valid messages unchanged', () => {
        const messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ];

        const result = sanitizeGroqMessages(messages);

        expect(result.sanitized).toBe(false);
        expect(result.issues).toHaveLength(0);
        expect(result.messages).toEqual([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ]);
      });

      it('should handle system role', () => {
        const messages = [{ role: 'system', content: 'You are a helpful assistant' }];
        const result = sanitizeGroqMessages(messages);

        expect(result.messages[0].role).toBe('system');
        expect(result.messages[0].content).toBe('You are a helpful assistant');
      });
    });

    describe('RT3 - content non-string (objet)', () => {
      it('should convert object content to string in non-strict mode', () => {
        const messages = [{ role: 'user', content: { key: 'value' } as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.sanitized).toBe(true);
        expect(result.messages[0].content).toBe('{"key":"value"}');
        expect(result.issues).toContainEqual(
          expect.objectContaining({
            field: 'content',
            action: 'converted',
          })
        );
      });

      it('should reject object content in strict mode', () => {
        const messages = [{ role: 'user', content: { key: 'value' } as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: true });

        expect(result.sanitized).toBe(true);
        expect(result.messages).toHaveLength(0);
        expect(result.issues[0].action).toBe('rejected');
      });

      it('should convert array content to string', () => {
        const messages = [{ role: 'user', content: ['item1', 'item2'] as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.sanitized).toBe(true);
        expect(result.messages[0].content).toBe('["item1","item2"]');
      });
    });

    describe('null/undefined content', () => {
      it('should convert null content to empty string in non-strict mode', () => {
        const messages = [{ role: 'user', content: null as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.sanitized).toBe(true);
        expect(result.messages[0].content).toBe('');
      });

      it('should reject null content in strict mode', () => {
        const messages = [{ role: 'user', content: null as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: true });

        expect(result.messages).toHaveLength(0);
      });
    });

    describe('invalid roles', () => {
      it('should fix invalid role to user in non-strict mode', () => {
        const messages = [{ role: 'invalid', content: 'test' }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.sanitized).toBe(true);
        expect(result.messages[0].role).toBe('user');
      });

      it('should reject invalid role in strict mode', () => {
        const messages = [{ role: 'invalid', content: 'test' }];

        const result = sanitizeGroqMessages(messages, { strict: true });

        expect(result.messages).toHaveLength(0);
      });
    });

    describe('non-object messages', () => {
      it('should reject non-object messages', () => {
        const messages = ['string message', 123, null] as unknown[];

        const result = sanitizeGroqMessages(messages);

        expect(result.sanitized).toBe(true);
        expect(result.messages).toHaveLength(0);
        expect(result.issues).toHaveLength(3);
      });
    });

    describe('primitive content types', () => {
      it('should convert number content to string', () => {
        const messages = [{ role: 'user', content: 42 as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.messages[0].content).toBe('42');
      });

      it('should convert boolean content to string', () => {
        const messages = [{ role: 'user', content: true as unknown as string }];

        const result = sanitizeGroqMessages(messages, { strict: false });

        expect(result.messages[0].content).toBe('true');
      });
    });
  });

  describe('validateGroqMessages', () => {
    it('should return true for valid messages', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];

      expect(validateGroqMessages(messages)).toBe(true);
    });

    it('should return false for invalid role', () => {
      const messages = [{ role: 'invalid', content: 'test' }];
      expect(validateGroqMessages(messages)).toBe(false);
    });

    it('should return false for non-string content', () => {
      const messages = [{ role: 'user', content: { obj: true } as unknown as string }];
      expect(validateGroqMessages(messages)).toBe(false);
    });

    it('should return false for extra properties', () => {
      const messages = [{ role: 'user', content: 'test', timestamp: Date.now() }];
      expect(validateGroqMessages(messages)).toBe(false);
    });
  });

  describe('createValidGroqMessage', () => {
    it('should create pure JSON objects', () => {
      const msg = createValidGroqMessage('user', 'Hello');

      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello');
      expect(Object.keys(msg)).toEqual(['role', 'content']);
    });

    it('should produce objects that pass validation', () => {
      const msg = createValidGroqMessage('assistant', 'Response');
      expect(validateGroqMessages([msg])).toBe(true);
    });
  });

  describe('RT3 - payload final valide', () => {
    it('should produce valid payload after sanitization', () => {
      // Simulate a "dirty" message array that might come from runtime
      const dirtyMessages = [
        { role: 'user', content: 'Question', timestamp: 12345 }, // Extra field
        { role: 'assistant', content: { data: 'response' } }, // Object content
        { role: 'invalid', content: 'test' }, // Invalid role
        { role: 'user', content: 42 }, // Number content
      ];

      const result = sanitizeGroqMessages(dirtyMessages as unknown[], { strict: false });

      // The sanitized output should pass validation (after removing extra fields)
      // Note: validation checks for extra properties, but sanitization creates clean objects
      for (const msg of result.messages) {
        expect(typeof msg.role).toBe('string');
        expect(['system', 'user', 'assistant']).toContain(msg.role);
        expect(typeof msg.content).toBe('string');
      }
    });
  });
});
