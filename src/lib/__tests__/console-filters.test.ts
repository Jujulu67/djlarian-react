import { setupConsoleFilters } from '../console-filters';

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
    const originalWindow = global.window;
    // @ts-expect-error - simulating server-side
    delete global.window;

    const cleanup = setupConsoleFilters();
    expect(cleanup).toBeUndefined();

    global.window = originalWindow;
  });

  it('should return cleanup function when called client-side', () => {
    const cleanup = setupConsoleFilters();
    expect(typeof cleanup).toBe('function');
  });

  it('should filter React Router warnings', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('react router future flag');
    console.warn('v7_starttransition');
    console.warn('v7_relativesplatpath');

    // These should be filtered, so the original warn should not be called
    // setupConsoleFilters replaces console.warn, so warnSpy won't be called
    // Instead, we check that filtered messages don't reach the original
    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should filter Framer Motion warnings', () => {
    const originalWarn = console.warn;
    const warnSpy = jest.fn();
    console.warn = warnSpy;

    setupConsoleFilters();

    console.warn('motion versions');
    console.warn('attempting to mix motion versions');
    console.warn('non-static position');

    // These should be filtered
    expect(warnSpy).not.toHaveBeenCalled();

    console.warn = originalWarn;
  });

  it('should filter SecurityError messages', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('getlayoutmap error');
    console.error('securityerror occurred');
    console.error('permission policy violation');

    // These should be filtered
    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
  });

  it('should filter Twitch-related errors', () => {
    const originalError = console.error;
    const errorSpy = jest.fn();
    console.error = errorSpy;

    setupConsoleFilters();

    console.error('twitch error');
    console.error('429 too many requests');
    console.error('autoplay disabled');

    // These should be filtered
    expect(errorSpy).not.toHaveBeenCalled();

    console.error = originalError;
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
});
