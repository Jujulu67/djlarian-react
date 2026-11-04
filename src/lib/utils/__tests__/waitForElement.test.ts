/**
 * @jest-environment jsdom
 */
import { waitForElement } from '../waitForElement';

describe('waitForElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it("résout tout de suite si l'élément existe", async () => {
    document.body.innerHTML = '<div id="a"></div>';
    await expect(waitForElement('#a')).resolves.toBe(document.getElementById('a'));
  });

  it("attend que l'élément soit ajouté", async () => {
    const promise = waitForElement('#b');
    const el = document.createElement('div');
    el.id = 'b';
    document.body.appendChild(el);
    await expect(promise).resolves.toBe(el);
  });

  it('résout null après le délai', async () => {
    await expect(waitForElement('#absent', { timeoutMs: 10 })).resolves.toBeNull();
  });

  it('résout null si annulé', async () => {
    const controller = new AbortController();
    const promise = waitForElement('#absent', { signal: controller.signal });
    controller.abort();
    await expect(promise).resolves.toBeNull();
  });
});
