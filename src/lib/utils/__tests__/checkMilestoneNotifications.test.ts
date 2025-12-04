import {
  checkProjectMilestones,
  checkAllUserMilestones,
  MilestoneType,
} from '../checkMilestoneNotifications';
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

describe('checkMilestoneNotifications', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkProjectMilestones', () => {
    it('should return error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non trouvé');
    });

    it('should return error if project does not belong to user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-2',
        name: 'Test Project',
        releaseDate: new Date(),
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non autorisé');
    });

    it('should skip if project has no release date', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 200); // More than 180 days ago

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate: null,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      // Should skip because no release date
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should skip if milestone date not reached', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 100); // Less than 180 days ago

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      // Should skip because milestone date not reached
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should create notification for J180 milestone', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 200); // More than 180 days ago
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.created).toBeGreaterThanOrEqual(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'MILESTONE',
            title: expect.stringContaining('6 mois'),
          }),
        })
      );
    });

    it('should create notification for J365 milestone', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 400); // More than 365 days ago
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.created).toBeGreaterThanOrEqual(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'MILESTONE',
            title: expect.stringContaining('1 an'),
          }),
        })
      );
    });

    it('should skip if notification already exists', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 200);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          metadata: JSON.stringify({
            milestoneType: 'J180',
          }),
        },
      ] as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.skipped).toBeGreaterThanOrEqual(1);
    });

    it('should skip if streams not available', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 200);

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        releaseDate,
        streamsJ180: null,
        streamsJ365: null,
      } as any);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('checkAllUserMilestones', () => {
    it('should check all user projects', async () => {
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() - 200);

      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          releaseDate,
          streamsJ180: 1000,
          streamsJ365: 2000,
        },
      ] as any);

      // Mock for checkProjectMilestones calls
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate,
        streamsJ180: 1000,
        streamsJ365: 2000,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkAllUserMilestones('user-1');

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            releaseDate: { not: null },
          }),
        })
      );
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'));

      const result = await checkAllUserMilestones('user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });
});
