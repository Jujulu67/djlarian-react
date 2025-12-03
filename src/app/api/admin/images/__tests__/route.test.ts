/**
 * Tests for /api/admin/images route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('../shared', () => ({
  getAllImages: jest.fn(),
}));

describe('/api/admin/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all images', async () => {
    const { getAllImages } = await import('../shared');
    const mockImages = [
      {
        id: 'img1',
        url: 'https://example.com/img1.jpg',
        name: 'img1.jpg',
        size: 12345,
        date: '2024-01-01T00:00:00Z',
        type: 'cover',
        linkedTo: null,
        isDuplicate: false,
      },
    ];

    (getAllImages as jest.Mock).mockReturnValue(mockImages);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockImages);
    expect(getAllImages).toHaveBeenCalledTimes(1);
  });
});
