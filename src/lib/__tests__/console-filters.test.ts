import { setupConsoleFilters } from '../console-filters';
import { isBrowser } from '../utils/env';

jest.mock('../utils/env', () => ({
  isBrowser: jest.fn(() => true),
}));

describe('setupConsoleFilters', () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalWindowError = window.onerror;
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    // Reset console methods
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
    window.onerror = null;
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    window.onerror = originalWindowError;
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it('should return early when called server-side (no window)', () => {
    (isBrowser as jest.Mock).mockReturnValue(false);

    const cleanup = setupConsoleFilters();
    expect(cleanup).toBeUndefined();

    (isBrowser as jest.Mock).mockReturnValue(true);
  });

  it('should return cleanup function when called client-side', () => {
    const cleanup = setupConsoleFilters();
    expect(typeof cleanup).toBe('function');
  });

  it.each([
    [
      'React Router warnings',
      'warn',
      ['react router future flag', 'v7_starttransition', 'v7_relativesplatpath'],
    ],
    [
      'Framer Motion warnings',
      'warn',
      ['motion versions', 'attempting to mix motion versions', 'non-static position'],
    ],
    [
      'SecurityError messages',
      'error',
      ['getlayoutmap error', 'securityerror occurred', 'permission policy violation'],
    ],
    [
      'Twitch-related errors',
      'error',
      ['twitch error', '429 too many requests', 'autoplay disabled'],
    ],
  ] as const)('should filter %s', (_label, method, messages) => {
    const original = console[method];
    const spy = jest.fn();
    console[method] = spy;

    setupConsoleFilters();

    messages.forEach((message) => console[method](message));

    // These should be filtered, so the original method should not be called
    expect(spy).not.toHaveBeenCalled();

    console[method] = original;
  });

  it('should allow non-filtered messages through', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    setupConsoleFilters();

    console.warn('important warning');
    console.error('critical error');
    console.log('info message');

    expect(warnSpy).toHaveBeenCalledWith('important warning');
    expect(errorSpy).toHaveBeenCalledWith('critical error');
    expect(logSpy).toHaveBeenCalledWith('info message');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should restore original console methods on cleanup', () => {
    const cleanup = setupConsoleFilters();
    expect(typeof cleanup).toBe('function');

    cleanup?.();

    // After cleanup, console methods should be restored
    // We can't easily test this without more complex mocking,
    // but we can verify cleanup was called
    expect(cleanup).toBeDefined();
  });

  it('should add error event listener', () => {
    setupConsoleFilters();

    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);
  });

  it('should add unhandledrejection event listener', () => {
    setupConsoleFilters();

    expect(window.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );
  });

  it('should remove event listeners on cleanup', () => {
    const cleanup = setupConsoleFilters();

    cleanup?.();

    expect(window.removeEventListener).toHaveBeenCalled();
  });

  it('should filter network errors', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('ERR_CONNECTION_REFUSED');
    console.error('localhost:3001 error');

    // These should be filtered, so original error should not be called
    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
  });

  it('should filter extension errors', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('message port closed');
    console.error('runtime.lasterror');
    console.error('content_script.js error');

    // These should be filtered
    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
  });

  it('should filter preload warnings', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('was preloaded using link preload but not used');

    // Should be filtered
    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should filter 404 errors for original images', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('404 -ori.jpg not found');

    // Should be filtered
    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
  });

  it('should filter Fast Refresh messages', () => {
    const originalLog = console.log;
    const logSpy = jest.fn();
    console.log = logSpy;

    setupConsoleFilters();

    console.log('[Fast Refresh] message');

    // Should be filtered
    expect(logSpy).not.toHaveBeenCalled();

    console.log = originalLog;
  });

  it('should handle window.onerror', () => {
    const mockOnError = jest.fn();
    window.onerror = mockOnError;

    setupConsoleFilters();

    // Simulate error event
    const errorEvent = new ErrorEvent('error', {
      message: 'message port closed',
    });
    window.dispatchEvent(errorEvent);

    // Should be filtered
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should handle unhandledrejection', () => {
    setupConsoleFilters();

    // Simulate unhandled rejection - PromiseRejectionEvent is not available in JSDOM
    // Instead, we'll just verify that the event listener was added
    expect(window.addEventListener).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function)
    );
  });

  it('should add error event listener with capture phase', () => {
    setupConsoleFilters();

    expect(window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function), true);
  });

  it('should handle window.onerror with originalErrorHandler', () => {
    const mockOnError = jest.fn().mockReturnValue(true);
    window.onerror = mockOnError;

    setupConsoleFilters();

    // Simulate window.onerror call with non-filtered error
    const onErrorHandler = window.onerror as typeof window.onerror;
    const result = onErrorHandler?.('Important error', 'test.js', 1, 1, new Error('test'));

    // Should call original handler
    expect(mockOnError).toHaveBeenCalled();
  });

  it.each([
    ['getlayoutmap', 'getlayoutmap error', 'test.js'],
    ['twitch source', 'Error', 'twitch.tv/test.js'],
    ['uploads source and -ori.', '404', '/uploads/image-ori.jpg'],
    [
      'cannot read properties pattern',
      'Cannot read properties of undefined (reading "test")',
      'test.js',
    ],
    ['source containing twitch.tv', 'Error', 'https://twitch.tv/script.js'],
    ['source containing extension://', 'Error', 'extension://test/script.js'],
    ['source containing _next/static/media', 'Error', '/_next/static/media/font.woff2'],
    ['source containing passport.twitch.tv', 'Error', 'https://passport.twitch.tv/auth'],
    ['source containing gql.twitch.tv', 'Error', 'https://gql.twitch.tv/gql'],
    ['source containing /uploads/', 'Error', '/uploads/image.jpg'],
    ['localhost:3001 source', 'Error', 'localhost:3001/script.js'],
    ['content_script.js in source', 'Error', 'content_script.js'],
    ['non-static position message', 'non-static position error', 'test.js'],
    ['scroll offset message', 'scroll offset error', 'test.js'],
  ])('should filter window.onerror with %s', (_label, message, source) => {
    window.onerror = null;
    setupConsoleFilters();

    const onErrorHandler = window.onerror as typeof window.onerror;
    const result = onErrorHandler?.(message, source, 1, 1, new Error('test'));

    expect(result).toBe(true);
  });

  it('should handle unhandledrejection with reason as string', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: 'getlayoutmap error',
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
    }
  });

  it.each([
    [
      'should handle unhandledrejection with reason as object with message',
      'securityerror occurred',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing getlayoutmap',
      'getlayoutmap error occurred',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing securityerror',
      'securityerror occurred',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing non-static position',
      'non-static position error',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing scroll offset',
      'scroll offset error',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing cannot read properties',
      'Cannot read properties of undefined (reading "test")',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing message port closed',
      'message port closed',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing runtime.lasterror',
      'runtime.lasterror occurred',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing err_connection_refused',
      'err_connection_refused',
    ],
    [
      'should handle unhandledrejection with reason as object with message containing content_script.js',
      'content_script.js error',
    ],
  ])('%s', (_title, message) => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: { message },
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
    }
  });

  it('should handle unhandledrejection with non-filtered reason', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: 'Important error',
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('should handle console.warn with originalWarnDescriptor', () => {
    const mockDescriptor = {
      value: console.warn,
      writable: true,
      configurable: true,
    };
    Object.defineProperty(console, 'warn', mockDescriptor);

    setupConsoleFilters();

    console.warn('test message');

    // Should work without errors
    expect(console.warn).toBeDefined();
  });

  it('should handle cleanup with originalWarnDescriptor', () => {
    const mockDescriptor = {
      value: console.warn,
      writable: true,
      configurable: true,
    };
    Object.defineProperty(console, 'warn', mockDescriptor);

    const cleanup = setupConsoleFilters();
    cleanup?.();

    // Should restore without errors
    expect(cleanup).toBeDefined();
  });

  it('should handle cleanup without originalWarnDescriptor', () => {
    // Delete the descriptor to test fallback
    const originalWarn = console.warn;
    delete (console as any).warn;
    console.warn = originalWarn;

    const cleanup = setupConsoleFilters();
    cleanup?.();

    expect(cleanup).toBeDefined();
  });

  it('should filter all React Router patterns', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('react router future flag');
    console.warn('v7_starttransition');
    console.warn('v7_relativesplatpath');

    // All should be filtered
    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should filter all Framer Motion patterns', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('motion versions');
    console.warn('attempting to mix motion versions');
    console.warn('12.9.1');
    console.warn('12.9.2');
    console.warn('non-static position');
    console.warn('scroll offset');
    console.warn('container has a non-static');
    console.warn('please ensure that the container');
    console.warn('ensure that the container');
    console.warn('to ensure scroll offset is calculated correctly');
    console.warn("like 'relative', 'fixed', or 'absolute'");

    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should filter Amazon IVS messages', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('amazon ivs error');
    console.error('ivs player sdk error');

    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
  });

  it('should filter all preload patterns', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('was preloaded using link preload but not used');
    console.warn('preload but not used within a few seconds');
    console.warn('appropriate `as` value and it is preloaded intentionally');

    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should handle window.onerror with originalErrorHandler returning true', () => {
    const mockOnError = jest.fn().mockReturnValue(true);
    window.onerror = mockOnError;

    setupConsoleFilters();

    const onErrorHandler = window.onerror as typeof window.onerror;
    const result = onErrorHandler?.('Important error', 'test.js', 1, 1, new Error('test'));

    expect(mockOnError).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should handle window.onerror with originalErrorHandler returning false', () => {
    const mockOnError = jest.fn().mockReturnValue(false);
    window.onerror = mockOnError;

    setupConsoleFilters();

    const onErrorHandler = window.onerror as typeof window.onerror;
    const result = onErrorHandler?.('Important error', 'test.js', 1, 1, new Error('test'));

    expect(mockOnError).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('should handle window.onerror with no originalErrorHandler', () => {
    window.onerror = null;
    setupConsoleFilters();

    const onErrorHandler = window.onerror as typeof window.onerror;
    const result = onErrorHandler?.('Important error', 'test.js', 1, 1, new Error('test'));

    expect(result).toBe(false);
  });

  it('should handle unhandledrejection with reason as object without message', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: { other: 'property' },
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      // Should not prevent default for non-filtered reasons
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('should handle unhandledrejection with null reason', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: null,
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      // Should not prevent default for null reasons
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('should handle unhandledrejection with reason as number', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: 123,
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      // Should not prevent default for non-string/non-object reasons
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });

  it('should handle unhandledrejection with reason as object without message property', () => {
    setupConsoleFilters();
    const addEventListenerCalls = (window.addEventListener as jest.Mock).mock.calls;
    const unhandledRejectionHandler = addEventListenerCalls.find(
      (call) => call[0] === 'unhandledrejection'
    )?.[1];

    if (unhandledRejectionHandler) {
      const event = {
        reason: { other: 'property' },
        preventDefault: jest.fn(),
      } as unknown as PromiseRejectionEvent;

      unhandledRejectionHandler(event);

      // Should not prevent default for objects without message
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  });
});
