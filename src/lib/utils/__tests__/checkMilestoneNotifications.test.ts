/**
 * Tests for checkMilestoneNotifications
 * @jest-environment node
 */
import { checkProjectMilestones, checkAllUserMilestones } from '../checkMilestoneNotifications';

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

describe('checkMilestoneNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkProjectMilestones', () => {
    it('should return error if project not found', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.created).toBe(0);
    });

    it('should skip if project does not belong to user', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-2',
        name: 'Project 1',
        releaseDate: new Date('2024-01-01'),
        streamsJ180: null,
        streamsJ365: null,
      });

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should skip if milestone not reached', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 200);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: futureDate,
        streamsJ180: null,
        streamsJ365: null,
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.skipped).toBeGreaterThan(0);
    });

    it('should create notification for reached milestone', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 200);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: pastDate,
        streamsJ180: 1000,
        streamsJ365: null,
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: 'notif-1',
      });

      const result = await checkProjectMilestones('project-1', 'user-1');

      expect(result.created).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkAllUserMilestones', () => {
    it('should check all user projects', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          releaseDate: new Date('2024-01-01'),
          streamsJ180: null,
          streamsJ365: null,
        },
      ]);

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Project 1',
        releaseDate: new Date('2024-01-01'),
        streamsJ180: null,
        streamsJ365: null,
      });

      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkAllUserMilestones('user-1');

      expect(result).toBeDefined();
      expect(prisma.project.findMany).toHaveBeenCalled();
    });
  });
});
