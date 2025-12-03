/**
 * Tests for /api/live/storage-mode route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(),
}));

describe('/api/live/storage-mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return blob storage mode', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.useBlobStorage).toBe(true);
  });

  it('should return local storage mode', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.useBlobStorage).toBe(false);
  });
});
