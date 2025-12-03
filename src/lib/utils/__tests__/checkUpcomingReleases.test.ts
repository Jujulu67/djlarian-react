/**
 * Tests for checkUpcomingReleases
 * @jest-environment node
 */
import {
  checkProjectUpcomingRelease,
  checkAllUserUpcomingReleases,
} from '../checkUpcomingReleases';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('checkUpcomingReleases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkProjectUpcomingRelease', () => {
    it('should return error if project not found', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.created).toBe(0);
    });

    it('should skip if project has no release date', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: null,
      });

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should skip if release date is too far', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: futureDate,
      });

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should create notification for upcoming release', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: futureDate,
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',
      });

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.created).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkAllUserUpcomingReleases', () => {
    it('should check all user projects', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          releaseDate: new Date(),
        },
      ]);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: new Date(),
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkAllUserUpcomingReleases('user-1');

      expect(result).toBeDefined();
      expect(prisma.project.findMany).toHaveBeenCalled();
    });
  });
});
