import { renderHook, act } from '@testing-library/react';

import { useActiveSection } from '../useActiveSection';

describe('useActiveSection', () => {
  const replaceStateSpy = jest.spyOn(window.history, 'replaceState');

  beforeEach(() => {
    replaceStateSpy.mockClear();
    window.history.replaceState(null, '', '/admin/configuration');
  });

  afterAll(() => {
    replaceStateSpy.mockRestore();
  });

  it('defaults to the general section when there is no valid hash', () => {
    const { result } = renderHook(() => useActiveSection());
    expect(result.current.activeSection).toBe('general');
  });

  it.each([
    ['reads a valid section from the initial hash', '/admin/configuration#security', 'security'],
    ['ignores an unknown hash', '/admin/configuration#inconnu', 'general'],
    [
      'selects the images section when the pathname ends with /images',
      '/admin/configuration/images',
      'images',
    ],
  ])('%s', (_label, url, expectedSection) => {
    window.history.replaceState(null, '', url);
    const { result } = renderHook(() => useActiveSection());
    expect(result.current.activeSection).toBe(expectedSection);
  });

  it('sets the hash when selecting a non-general section', () => {
    const { result } = renderHook(() => useActiveSection());

    act(() => result.current.handleSectionClick('appearance'));

    expect(result.current.activeSection).toBe('appearance');
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '#appearance');
  });

  it('clears the hash when selecting the general section', () => {
    window.history.replaceState(null, '', '/admin/configuration#api');
    const { result } = renderHook(() => useActiveSection());

    act(() => result.current.handleSectionClick('general'));

    expect(result.current.activeSection).toBe('general');
    expect(replaceStateSpy).toHaveBeenLastCalledWith(null, '', '/admin/configuration');
  });
});
