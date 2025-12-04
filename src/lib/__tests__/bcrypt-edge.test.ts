import { compare, hash } from '../bcrypt-edge';
import bcrypt from 'bcryptjs';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('bcrypt-edge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compare', () => {
    it('should compare password with hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await compare('password123', 'hashed-password');

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await compare('wrong-password', 'hashed-password');

      expect(result).toBe(false);
    });
  });

  describe('hash', () => {
    it('should hash password with default salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await hash('password123');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toBe('hashed-password');
    });

    it('should hash password with custom salt rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await hash('password123', 12);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(result).toBe('hashed-password');
    });

    it('should handle empty password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-empty');

      const result = await hash('');

      expect(bcrypt.hash).toHaveBeenCalledWith('', 10);
      expect(result).toBe('hashed-empty');
    });

    it('should handle hash errors', async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

      await expect(hash('password123')).rejects.toThrow('Hash error');
    });
  });

  describe('compare edge cases', () => {
    it('should handle empty password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await compare('', 'hashed-password');

      expect(bcrypt.compare).toHaveBeenCalledWith('', 'hashed-password');
      expect(result).toBe(false);
    });

    it('should handle empty hash', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await compare('password', '');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', '');
      expect(result).toBe(false);
    });

    it('should handle compare errors', async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare error'));

      await expect(compare('password', 'hash')).rejects.toThrow('Compare error');
    });
  });
});
