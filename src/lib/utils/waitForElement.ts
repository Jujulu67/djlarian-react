/**
 * Attend qu'un élément correspondant à `selector` soit dans le DOM, au lieu de deviner un délai.
 * Résout avec l'élément, ou null après `timeoutMs` ou si `signal` est annulé.
 */
export function waitForElement(
  selector: string,
  { timeoutMs = 3000, signal }: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<Element | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || signal?.aborted) return resolve(null);

    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    let done = false;
    const finish = (el: Element | null) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(el);
    };
    const onAbort = () => finish(null);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => finish(null), timeoutMs);
    signal?.addEventListener('abort', onAbort);
  });
}
