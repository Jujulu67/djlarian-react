import { cleanupAttributes } from '../cleanupAttributes';

describe('cleanupAttributes', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.innerHTML = '<html><head></head><body></body></html>';
  });

  afterEach(() => {
    // Cleanup any observers
    jest.clearAllMocks();
  });

  it('should return undefined when called server-side (no window)', () => {
    const originalWindow = global.window;
    // @ts-expect-error - simulating server-side
    delete global.window;

    const result = cleanupAttributes();
    expect(result).toBeUndefined();

    global.window = originalWindow;
  });

  it('should setup MutationObserver and return cleanup function', () => {
    const cleanup = cleanupAttributes();
    expect(typeof cleanup).toBe('function');
    expect(cleanup).toBeDefined();
  });

  it('should remove bis_skin_checked attribute when added', (done) => {
    const element = document.createElement('div');
    element.setAttribute('bis_skin_checked', 'true');
    document.body.appendChild(element);

    const cleanup = cleanupAttributes();

    // Wait a bit for observer to process
    setTimeout(() => {
      expect(element.hasAttribute('bis_skin_checked')).toBe(false);
      cleanup?.();
      done();
    }, 100);
  });

  it('should remove bis_register attribute when added', (done) => {
    const element = document.createElement('div');
    element.setAttribute('bis_register', 'true');
    document.body.appendChild(element);

    const cleanup = cleanupAttributes();

    setTimeout(() => {
      expect(element.hasAttribute('bis_register')).toBe(false);
      cleanup?.();
      done();
    }, 100);
  });

  it('should remove __processed attribute when added', (done) => {
    const element = document.createElement('div');
    element.setAttribute('__processed', 'true');
    document.body.appendChild(element);

    const cleanup = cleanupAttributes();

    setTimeout(() => {
      expect(element.hasAttribute('__processed')).toBe(false);
      cleanup?.();
      done();
    }, 100);
  });

  it('should cleanup existing attributes on initialization', () => {
    const element = document.createElement('div');
    element.setAttribute('bis_skin_checked', 'true');
    element.setAttribute('bis_register', 'true');
    element.setAttribute('__processed', 'true');
    document.body.appendChild(element);

    cleanupAttributes();

    // Should be cleaned up immediately
    expect(element.hasAttribute('bis_skin_checked')).toBe(false);
    expect(element.hasAttribute('bis_register')).toBe(false);
    expect(element.hasAttribute('__processed')).toBe(false);
  });

  it('should disconnect observer when cleanup is called', () => {
    const cleanup = cleanupAttributes();
    const disconnectSpy = jest.spyOn(MutationObserver.prototype, 'disconnect');

    cleanup?.();

    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
