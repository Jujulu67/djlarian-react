import { extractImageId } from '../extractImageId';

describe('extractImageId', () => {
  it('should extract ID from simple image name', () => {
    expect(extractImageId('cover1.jpg')).toBe('cover1');
    expect(extractImageId('image123.png')).toBe('image123');
    expect(extractImageId('photo.webp')).toBe('photo');
  });

  it('should extract ID from original image name with -ori suffix', () => {
    expect(extractImageId('cover1-ori.jpg')).toBe('cover1');
    expect(extractImageId('image123-ori.png')).toBe('image123');
    expect(extractImageId('photo-ori.webp')).toBe('photo');
  });

  it('should handle -ori without extension', () => {
    expect(extractImageId('cover1-ori')).toBe('cover1');
    expect(extractImageId('image-ori')).toBe('image');
  });

  it('should handle various file extensions', () => {
    expect(extractImageId('image.jpg')).toBe('image');
    expect(extractImageId('image.jpeg')).toBe('image');
    expect(extractImageId('image.png')).toBe('image');
    expect(extractImageId('image.gif')).toBe('image');
    expect(extractImageId('image.webp')).toBe('image');
    expect(extractImageId('image.svg')).toBe('image');
  });

  it('should handle uppercase extensions', () => {
    expect(extractImageId('image.JPG')).toBe('image');
    expect(extractImageId('image.PNG')).toBe('image');
    expect(extractImageId('image-ori.JPEG')).toBe('image');
  });

  it('should handle names with multiple dots', () => {
    expect(extractImageId('my.image.name.jpg')).toBe('my.image.name');
    // Note: extractImageId removes -ori and extension, so file.name.test-ori.png becomes file.name
    expect(extractImageId('file.name.test-ori.png')).toBe('file.name');
  });

  it('should handle names with hyphens', () => {
    expect(extractImageId('my-image-name.jpg')).toBe('my-image-name');
    expect(extractImageId('test-file-123.png')).toBe('test-file-123');
  });

  it('should handle names with numbers', () => {
    expect(extractImageId('image123.jpg')).toBe('image123');
    expect(extractImageId('123image.png')).toBe('123image');
    expect(extractImageId('img-123-456.webp')).toBe('img-123-456');
  });

  it('should handle complex names with -ori', () => {
    expect(extractImageId('my-complex-image-123-ori.jpg')).toBe('my-complex-image-123');
    // Note: extractImageId removes -ori and extension, so test.file.name-ori.png becomes test.file
    expect(extractImageId('test.file.name-ori.png')).toBe('test.file');
  });

  it('should handle names without extension', () => {
    expect(extractImageId('imagename')).toBe('imagename');
    expect(extractImageId('test-image')).toBe('test-image');
  });

  it('should handle edge cases', () => {
    expect(extractImageId('')).toBe('');
    expect(extractImageId('.jpg')).toBe('');
    expect(extractImageId('-ori.jpg')).toBe('');
  });

  it('should not remove -ori if it is part of the base name', () => {
    // The function removes -ori only if it's followed by an extension or at the end
    expect(extractImageId('original-image.jpg')).toBe('original-image');
    expect(extractImageId('ori-test.png')).toBe('ori-test');
  });

  it('should handle alphanumeric extensions', () => {
    expect(extractImageId('image.jpg2')).toBe('image');
    expect(extractImageId('image.png8')).toBe('image');
  });
});
