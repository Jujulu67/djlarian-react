import { centerAspectCrop } from '../cropHelpers';
import { Crop } from 'react-image-crop';

describe('cropHelpers', () => {
  describe('centerAspectCrop', () => {
    it('should create centered crop for square aspect ratio', () => {
      const result = centerAspectCrop(800, 600, 1);

      expect(result.unit).toBe('%');
      expect(result.width).toBe(90);
      expect(result.height).toBe(90);
      expect(result.x).toBe(5); // (100 - 90) / 2
      expect(result.y).toBe(5); // (100 - 90) / 2
    });

    it('should create centered crop for wide aspect ratio (16:9)', () => {
      const aspect = 16 / 9;
      const result = centerAspectCrop(1920, 1080, aspect);

      expect(result.unit).toBe('%');
      expect(result.width).toBe(90);
      expect(result.height).toBeCloseTo(90 / aspect, 2);
      expect(result.x).toBe(5);
      expect(result.y).toBeCloseTo((100 - 90 / aspect) / 2, 2);
    });

    it('should create centered crop for tall aspect ratio (3:4)', () => {
      const aspect = 3 / 4;
      const result = centerAspectCrop(600, 800, aspect);

      expect(result.unit).toBe('%');
      expect(result.width).toBe(90);
      expect(result.height).toBeCloseTo(90 * (1 / aspect), 2);
      expect(result.x).toBe(5);
      expect(result.y).toBeCloseTo((100 - 90 * (1 / aspect)) / 2, 2);
    });

    it('should center crop regardless of image dimensions', () => {
      const result1 = centerAspectCrop(100, 100, 1);
      const result2 = centerAspectCrop(2000, 2000, 1);

      // Both should have same percentages
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
      expect(result1.x).toBe(result2.x);
      expect(result1.y).toBe(result2.y);
    });

    it('should handle aspect ratio of 2:1', () => {
      const aspect = 2;
      const result = centerAspectCrop(1000, 500, aspect);

      expect(result.width).toBe(90);
      expect(result.height).toBe(45); // 90 / 2
      expect(result.x).toBe(5);
      expect(result.y).toBe(27.5); // (100 - 45) / 2
    });
  });
});
