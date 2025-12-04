import { cn } from '../cn';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null, 'baz')).toBe('foo bar baz');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle complex combinations', () => {
    expect(
      cn(
        'base-class',
        { 'conditional-1': true, 'conditional-2': false },
        ['array-1', 'array-2'],
        undefined,
        'final-class'
      )
    ).toBe('base-class conditional-1 array-1 array-2 final-class');
  });
});
