import { centerAspectCrop } from '../centerAspectCrop';

describe('centerAspectCrop', () => {
  it('returns a percentage crop centred on a landscape image', () => {
    // Image 200x100, ratio 1:1 -> crop 100x100 px, centré horizontalement
    const crop = centerAspectCrop(200, 100, 1);

    expect(crop.unit).toBe('%');
    expect(crop.width).toBeCloseTo(50);
    expect(crop.height).toBeCloseTo(100);
    expect(crop.x).toBeCloseTo(25);
    expect(crop.y).toBeCloseTo(0);
  });

  it('returns a crop centred vertically on a portrait image', () => {
    // Image 100x200, ratio 1:1 -> crop 100x100 px, centré verticalement
    const crop = centerAspectCrop(100, 200, 1);

    expect(crop.width).toBeCloseTo(100);
    expect(crop.height).toBeCloseTo(50);
    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(25);
  });
});
