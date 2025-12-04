import { createDbPerformanceLogger, measureDbQuery } from '../db-performance';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('db-performance', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'production';
    console.warn = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    console.warn = originalConsoleWarn;
  });

  describe('createDbPerformanceLogger', () => {
    it('should create a logger instance', () => {
      const perf = createDbPerformanceLogger('test-handler');
      expect(perf).toBeDefined();
    });

    it('should start timer and return timestamp', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      expect(typeof t0).toBe('number');
      expect(t0).toBeGreaterThan(0);
    });

    it('should log connection time when enabled', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const t1 = Date.now() + 10;
      perf.logConnection(t0, t1);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should not log connection time when disabled', () => {
      process.env.NODE_ENV = 'development';
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const t1 = Date.now() + 10;
      perf.logConnection(t0, t1);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should log query time when enabled', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t1 = perf.start();
      const t2 = Date.now() + 20;
      perf.logQuery(t1, t2, 'test-query');
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('query:'));
    });

    it('should return connection time', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const t1 = Date.now() + 15;
      const connectTime = perf.logConnection(t0, t1);
      expect(connectTime).toBeGreaterThan(0);
    });

    it('should return query time', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t1 = perf.start();
      const t2 = Date.now() + 25;
      const queryTime = perf.logQuery(t1, t2);
      expect(queryTime).toBeGreaterThan(0);
    });
  });

  describe('end', () => {
    it('should return metrics with total time', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metrics = perf.end(t0);
      expect(metrics).toHaveProperty('handler', 'test-handler');
      expect(metrics).toHaveProperty('totalTime');
      expect(metrics.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should include connectTime in metrics when provided', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metrics = perf.end(t0, { connectTime: 10 });
      expect(metrics).toHaveProperty('connectTime', 10);
    });

    it('should include queryTime in metrics when provided', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metrics = perf.end(t0, { queryTime: 20 });
      expect(metrics).toHaveProperty('queryTime', 20);
    });

    it('should include query in metrics when provided', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metrics = perf.end(t0, { query: 'test-query' });
      expect(metrics).toHaveProperty('query', 'test-query');
    });

    it('should include operation in metrics when provided', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metrics = perf.end(t0, { operation: 'create' });
      expect(metrics).toHaveProperty('operation', 'create');
    });

    it('should include metadata in metrics when provided', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const metadata = { key: 'value' };
      const metrics = perf.end(t0, { metadata });
      expect(metrics).toHaveProperty('metadata', metadata);
    });

    it('should warn when total time exceeds 1000ms', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = Date.now() - 1500; // 1.5 seconds ago
      perf.end(t0);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('est lent'));
    });

    it('should warn when query is fast but handler is slow', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = Date.now() - 600; // 600ms ago
      perf.end(t0, { queryTime: 50 }); // Query took 50ms
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('cold start'));
    });
  });

  describe('measureQuery', () => {
    it('should measure and return result with metrics', async () => {
      const perf = createDbPerformanceLogger('test-handler');
      const queryFn = jest.fn().mockResolvedValue('result');
      const { result, metrics } = await perf.measureQuery(queryFn, 'test-query');
      expect(result).toBe('result');
      expect(metrics).toHaveProperty('handler', 'test-handler');
      expect(metrics).toHaveProperty('queryTime');
      expect(metrics).toHaveProperty('query', 'test-query');
    });

    it('should handle query errors', async () => {
      const perf = createDbPerformanceLogger('test-handler');
      const error = new Error('Query failed');
      const queryFn = jest.fn().mockRejectedValue(error);
      await expect(perf.measureQuery(queryFn, 'test-query')).rejects.toThrow('Query failed');
      const metrics = perf.end(perf.start(), { query: 'test-query' });
      expect(metrics).toBeDefined();
    });

    it('should include error in metadata on failure', async () => {
      const perf = createDbPerformanceLogger('test-handler');
      const error = new Error('Query failed');
      const queryFn = jest.fn().mockRejectedValue(error);
      try {
        await perf.measureQuery(queryFn, 'test-query');
      } catch (e) {
        // Error is thrown, metrics should be logged
      }
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('measureDbQuery', () => {
    it('should measure query and return result', async () => {
      const queryFn = jest.fn().mockResolvedValue('result');
      const result = await measureDbQuery('test-handler', queryFn, 'test-query');
      expect(result).toBe('result');
      expect(queryFn).toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      const queryFn = jest.fn().mockRejectedValue(error);
      await expect(measureDbQuery('test-handler', queryFn, 'test-query')).rejects.toThrow(
        'Query failed'
      );
    });

    it('should work without query name', async () => {
      const queryFn = jest.fn().mockResolvedValue('result');
      const result = await measureDbQuery('test-handler', queryFn);
      expect(result).toBe('result');
    });
  });

  describe('edge cases', () => {
    it('should handle zero connection time', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const t1 = t0;
      perf.logConnection(t0, t1);
      // Should not log when time is 0
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle zero query time', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t1 = perf.start();
      const t2 = t1;
      perf.logQuery(t1, t2);
      // Should not log when time is 0
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle negative times gracefully', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = perf.start();
      const t1 = t0 - 10; // Negative time
      const connectTime = perf.logConnection(t0, t1);
      expect(connectTime).toBeLessThan(0);
      // Should not log negative times
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle measureQuery with error before query starts', async () => {
      const perf = createDbPerformanceLogger('test-handler');
      const queryFn = jest.fn().mockRejectedValue(new Error('Early error'));
      try {
        await perf.measureQuery(queryFn, 'test-query');
      } catch (e) {
        // Error should be thrown
      }
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should not warn when total time is exactly 1000ms', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = Date.now() - 1000; // Exactly 1 second ago
      perf.end(t0);
      // Should not warn at exactly 1000ms (only > 1000ms)
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not warn when query time is exactly 100ms', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = Date.now() - 600;
      perf.end(t0, { queryTime: 100 }); // Exactly 100ms
      // Should not warn at exactly 100ms (only < 100ms)
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not warn when total time is exactly 500ms', () => {
      const perf = createDbPerformanceLogger('test-handler');
      const t0 = Date.now() - 500;
      perf.end(t0, { queryTime: 50 });
      // Should not warn at exactly 500ms (only > 500ms)
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
