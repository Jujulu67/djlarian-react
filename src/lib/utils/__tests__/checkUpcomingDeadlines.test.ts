import {
  checkProjectUpcomingDeadline,
  checkAllUserUpcomingDeadlines,
} from '../checkUpcomingDeadlines';
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
      updateMany: jest.fn(),
    },
  },
}));

describe('checkUpcomingDeadlines', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkProjectUpcomingDeadline', () => {
    it('should return error if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non trouvé');
      expect(result.created).toBe(0);
    });

    it('should return error if project does not belong to user', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-2',
        name: 'Test Project',
        deadline: new Date(),
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Projet non autorisé');
    });

    it('should skip if project has no deadline', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: null,
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.skipped).toBe(1);
      expect(result.created).toBe(0);
    });

    it('should skip if deadline is more than 14 days away', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: futureDate,
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should skip if deadline is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: pastDate,
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.skipped).toBe(1);
    });

    it('should create notification for deadline in 14 days', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 14);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INFO',
            title: expect.stringContaining('2 semaines'),
          }),
        })
      );
    });

    it('should create notification for deadline in 7 days', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 7);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INFO',
            title: expect.stringContaining('1 semaine'),
          }),
        })
      );
    });

    it('should create notification for deadline in 5 days', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 5);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'INFO',
            title: expect.stringContaining('5 jours'),
          }),
        })
      );
    });

    it('should create notification for deadline in 3 days', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

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

    it('should create notification for deadline tomorrow', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 1);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'WARNING',
            title: expect.stringContaining('demain'),
          }),
        })
      );
    });

    it('should delete previous DEADLINE_UPCOMING notifications before creating new one', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Simuler une notification précédente pour J-7 avec projectId correspondant
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: 'project-1',
          deletedAt: null,
          metadata: JSON.stringify({
            type: 'DEADLINE_UPCOMING',
            daysUntil: 7,
            projectId: 'project-1',
          }),
        },
      ] as any);
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Vérifier que findMany a été appelé pour récupérer les notifications existantes
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          deletedAt: null,
          OR: [{ projectId: 'project-1' }, { projectId: null }],
        },
      });
      // Vérifier que les anciennes notifications sont supprimées
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['notif-1'],
          },
        },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      // Vérifier qu'une nouvelle notification est créée
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.project.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('checkAllUserUpcomingDeadlines', () => {
    it('should check all user projects with upcoming deadlines', async () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(now);
      deadlineDate.setDate(deadlineDate.getDate() + 5);
      jest.setSystemTime(now);

      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          deadline: deadlineDate,
        },
        {
          id: 'project-2',
          userId: 'user-1',
          name: 'Project 2',
          deadline: deadlineDate,
        },
      ] as any);

      // Mock for checkProjectUpcomingDeadline calls
      mockPrisma.project.findUnique
        .mockResolvedValueOnce({
          id: 'project-1',
          userId: 'user-1',
          name: 'Project 1',
          deadline: deadlineDate,
        } as any)
        .mockResolvedValueOnce({
          id: 'project-2',
          userId: 'user-1',
          name: 'Project 2',
          deadline: deadlineDate,
        } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkAllUserUpcomingDeadlines('user-1');

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

      const result = await checkAllUserUpcomingDeadlines('user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });

    it('should handle notifications with null projectId and isTest metadata', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Simuler une notification de test avec projectId null
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: null,
          deletedAt: null,
          metadata: JSON.stringify({
            type: 'DEADLINE_UPCOMING',
            daysUntil: 7,
            isTest: true,
          }),
        },
      ] as any);
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalled();
    });

    it('should skip notifications without metadata', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Notification sans metadata
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: 'project-1',
          deletedAt: null,
          metadata: null,
        },
      ] as any);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Should not try to delete notification without metadata
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('should skip notifications with invalid JSON metadata', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Notification avec metadata invalide
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: 'project-1',
          deletedAt: null,
          metadata: 'invalid json{',
        },
      ] as any);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Should not try to delete notification with invalid metadata
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('should skip notifications with different type', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Notification avec un type différent
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: 'project-1',
          deletedAt: null,
          metadata: JSON.stringify({
            type: 'MILESTONE',
            projectId: 'project-1',
          }),
        },
      ] as any);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Should not try to delete notification with different type
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('should handle notifications with null projectId but different projectId in metadata', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Notification avec projectId null mais projectId différent dans metadata
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          projectId: null,
          deletedAt: null,
          metadata: JSON.stringify({
            type: 'DEADLINE_UPCOMING',
            projectId: 'project-2', // Different project
            isTest: false,
          }),
        },
      ] as any);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Should not delete notification for different project
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('should handle case when no existing notifications to delete', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      // Aucune notification existante
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
      } as any);

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.created).toBe(1);
      // Should not call updateMany when no notifications to delete
      expect(mockPrisma.notification.updateMany).not.toHaveBeenCalled();
    });

    it('should handle notification creation errors', async () => {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + 3);
      deadlineDate.setHours(0, 0, 0, 0);
      jest.setSystemTime(new Date());

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        userId: 'user-1',
        name: 'Test Project',
        deadline: deadlineDate,
      } as any);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockRejectedValue(new Error('Create error'));

      const result = await checkProjectUpcomingDeadline('project-1', 'user-1');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Create error');
    });
  });
});
