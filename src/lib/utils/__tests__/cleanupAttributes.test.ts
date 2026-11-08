import { cleanupAttributes } from '../cleanupAttributes';
import { isBrowser } from '../env';

jest.mock('../env', () => ({
  isBrowser: jest.fn(() => true),
}));

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

  // ... (in describe)
  it('should return undefined when called server-side (no window)', () => {
    (isBrowser as jest.Mock).mockReturnValue(false);

    const result = cleanupAttributes();
    expect(result).toBeUndefined();

    (isBrowser as jest.Mock).mockReturnValue(true);
  });

  it('should setup MutationObserver and return cleanup function', () => {
    const cleanup = cleanupAttributes();
    expect(typeof cleanup).toBe('function');
    expect(cleanup).toBeDefined();
  });

  it.each([
    ['should remove bis_skin_checked attribute when added', 'bis_skin_checked'],
    ['should remove bis_register attribute when added', 'bis_register'],
    ['should remove __processed attribute when added', '__processed'],
  ])('%s', (_title, attribute, done) => {
    const element = document.createElement('div');
    element.setAttribute(attribute, 'true');
    document.body.appendChild(element);

    const cleanup = cleanupAttributes();

    // Wait a bit for observer to process
    setTimeout(() => {
      expect(element.hasAttribute(attribute)).toBe(false);
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
