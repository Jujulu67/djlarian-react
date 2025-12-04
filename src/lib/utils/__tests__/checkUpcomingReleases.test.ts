import {
  checkProjectUpcomingRelease,
  checkAllUserUpcomingReleases,
} from '../checkUpcomingReleases';
import prisma from '@/lib/prisma';

// Mock prisma
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
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkProjectUpcomingRelease', () => {
    it('should return error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non trouvé');
      expect(result.created).toBe(0);
    });

    it('should return error if project does not belong to user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-2',
        name: 'Test Project',
        releaseDate: new Date(),
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non autorisé');
    });

    it('should skip if project has no release date', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate: null,
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should skip if release date is more than 7 days away', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate: futureDate,
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should skip if release date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate: pastDate,
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should create notification for release in 7 days', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7);
      releaseDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INFO',
            title: expect.stringContaining('7 jours'),
          }),
        })
      );
    });

    it('should create notification for release in 3 days', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 3);
      releaseDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'WARNING',
            title: expect.stringContaining('3 jours'),
          }),
        })
      );
    });

    it('should create notification for release today', async () => {
      const releaseDate = new Date();
      releaseDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(releaseDate);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INFO',
            title: expect.stringContaining("aujourd'hui"),
          }),
        })
      );
    });

    it('should skip if notification already exists', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + 7);
      releaseDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          metadata: JSON.stringify({
            type: 'RELEASE_UPCOMING',
            daysUntil: 7,
          }),
        },
      ] as any);

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.skipped).toBe(1);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await checkProjectUpcomingRelease('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('checkAllUserUpcomingReleases', () => {
    it('should check all user projects with upcoming releases', async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const releaseDate = new Date(now);
      releaseDate.setDate(releaseDate.getDate() + 5);
      jest.setSystemTime(now);

      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          releaseDate,
        },
        {
          id: 'project-2',
          userId: 'user-1',
          name: 'Project 2',
          releaseDate,
        },
      ] as any);

      // Mock for checkProjectUpcomingRelease calls
      mockPrisma.project.findUnique
        .mockResolvedValueOnce({
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          releaseDate,
        } as any)
        .mockResolvedValueOnce({
          id: 'project-2',
          userId: 'user-1',
          name: 'Project 2',
          releaseDate,
        } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkAllUserUpcomingReleases('user-1');

      expect(result.created).toBeGreaterThan(0);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'));

      const result = await checkAllUserUpcomingReleases('user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });
});
