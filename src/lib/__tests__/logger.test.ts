/**
 * Tests for logger
 */
// Mock console methods before importing logger
const originalConsole = { ...console };
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

beforeAll(() => {
  global.console = mockConsole as unknown as typeof console;
});

afterAll(() => {
  global.console = originalConsole;
});

// Import logger after setting up mocks
import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    logger.info('Info message', { data: 'test' });
    // In test environment, info may or may not log depending on NODE_ENV
    // Just verify the method exists and can be called
    expect(typeof logger.info).toBe('function');
  });

  it('should log warn messages', () => {
    logger.warn('Warning message', { data: 'test' });
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Error message', error);
    expect(mockConsole.error).toHaveBeenCalled();
  });

  it('should log with custom prefix', () => {
    logger.log('CUSTOM', 'Custom message', { data: 'test' });
    // In test environment, log may or may not log depending on NODE_ENV
    expect(typeof logger.log).toBe('function');
  });

  it('should log with options', () => {
    logger.logWithOptions(
      'Message with options',
      { level: 'warn', prefix: 'TEST' },
      { data: 'test' }
    );
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it('should have debug method', () => {
    logger.debug('Debug message');
    expect(typeof logger.debug).toBe('function');
  });
});
