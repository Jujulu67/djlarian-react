import { centerAspectCrop } from '../cropHelpers';

describe('centerAspectCrop', () => {
  it('should create a centered crop with square aspect ratio (1:1)', () => {
    const crop = centerAspectCrop(1000, 1000, 1);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90);
    expect(crop.x).toBe(5); // (100 - 90) / 2
    expect(crop.y).toBe(5); // (100 - 90) / 2
  });

  it('should create a centered crop with landscape aspect ratio (16:9)', () => {
    const crop = centerAspectCrop(1920, 1080, 16 / 9);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 / (16 / 9)); // width / aspect
    expect(crop.x).toBe(5);
    expect(crop.y).toBeGreaterThan(5); // More vertical margin
  });

  it('should create a centered crop with portrait aspect ratio (9:16)', () => {
    const crop = centerAspectCrop(1080, 1920, 9 / 16);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 * (16 / 9)); // width * (1 / aspect)
    expect(crop.x).toBe(5);
    expect(crop.y).toBeLessThan(5); // Less vertical margin (may be negative)
  });

  it('should create a centered crop with 4:3 aspect ratio', () => {
    const crop = centerAspectCrop(1024, 768, 4 / 3);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 / (4 / 3));
    expect(crop.x).toBe(5);
  });

  it('should create a centered crop with 3:4 aspect ratio (portrait)', () => {
    const crop = centerAspectCrop(768, 1024, 3 / 4);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 * (4 / 3));
    expect(crop.x).toBe(5);
  });

  it('should handle very wide aspect ratios', () => {
    const crop = centerAspectCrop(2000, 500, 4);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 / 4);
    expect(crop.x).toBe(5);
    expect(crop.y).toBeGreaterThan(5);
  });

  it('should handle very tall aspect ratios', () => {
    const crop = centerAspectCrop(500, 2000, 0.25);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBe(90);
    expect(crop.height).toBe(90 / 0.25);
    expect(crop.x).toBe(5);
  });

  it('should work regardless of actual media dimensions', () => {
    // The function uses percentages, so actual dimensions shouldn't matter
    const crop1 = centerAspectCrop(100, 100, 1);
    const crop2 = centerAspectCrop(1000, 1000, 1);
    const crop3 = centerAspectCrop(10000, 10000, 1);

    expect(crop1).toEqual(crop2);
    expect(crop2).toEqual(crop3);
  });

  it('should always use percentage units', () => {
    const crop1 = centerAspectCrop(1000, 1000, 1);
    const crop2 = centerAspectCrop(1920, 1080, 16 / 9);
    const crop3 = centerAspectCrop(1080, 1920, 9 / 16);

    expect(crop1.unit).toBe('%');
    expect(crop2.unit).toBe('%');
    expect(crop3.unit).toBe('%');
  });

  it('should always use 90% width', () => {
    const crop1 = centerAspectCrop(1000, 1000, 1);
    const crop2 = centerAspectCrop(1920, 1080, 16 / 9);
    const crop3 = centerAspectCrop(1080, 1920, 9 / 16);

    expect(crop1.width).toBe(90);
    expect(crop2.width).toBe(90);
    expect(crop3.width).toBe(90);
  });

  it('should always center horizontally at x=5', () => {
    const crop1 = centerAspectCrop(1000, 1000, 1);
    const crop2 = centerAspectCrop(1920, 1080, 16 / 9);
    const crop3 = centerAspectCrop(1080, 1920, 9 / 16);

    expect(crop1.x).toBe(5);
    expect(crop2.x).toBe(5);
    expect(crop3.x).toBe(5);
  });
});
