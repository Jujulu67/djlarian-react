/**
 * Tests for lib/data/homepage
 */

// Mock dependencies BEFORE imports
jest.mock('@/config/defaults', () => ({
  defaultConfigs: {
    homepage: {
      heroTitle: 'Default Title',
      heroSubtitle: 'Default Subtitle',
      showEvents: true,
      showReleases: true,
    },
  },
}));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    siteConfig: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { defaultConfigs } from '@/config/defaults';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

import { getHomepageConfig } from '../homepage';

describe('getHomepageConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return default config when tables are not ready', async () => {
    (prisma.siteConfig.count as jest.Mock).mockRejectedValue(new Error('Table does not exist'));

    const result = await getHomepageConfig();

    expect(result).toEqual(defaultConfigs.homepage);
    expect(prisma.siteConfig.findMany).not.toHaveBeenCalled();
  });

  it('should return default config when no configs found', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(0);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getHomepageConfig();

    expect(result).toEqual(defaultConfigs.homepage);
  });

  it('should return config from database when available', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'heroTitle', value: 'Custom Title' },
      { key: 'heroSubtitle', value: 'Custom Subtitle' },
      { key: 'showEvents', value: 'false' },
    ]);

    const result = await getHomepageConfig();

    expect(result).toEqual({
      heroTitle: 'Custom Title',
      heroSubtitle: 'Custom Subtitle',
      showEvents: false,
      showReleases: true, // From defaults
    });
  });

  it('should convert string "true"/"false" to boolean', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'showEvents', value: 'true' },
      { key: 'showReleases', value: 'false' },
    ]);

    const result = await getHomepageConfig();

    expect(result.showEvents).toBe(true);
    expect(result.showReleases).toBe(false);
  });

  it('should convert numeric strings to numbers', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'maxEvents', value: '5' },
      { key: 'maxReleases', value: '10' },
    ]);

    const result = await getHomepageConfig();

    expect(result.maxEvents).toBe(5);
    expect(result.maxReleases).toBe(10);
  });

  it('should keep string values as strings', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'heroTitle', value: 'My Title' },
      { key: 'heroSubtitle', value: 'My Subtitle' },
    ]);

    const result = await getHomepageConfig();

    expect(result.heroTitle).toBe('My Title');
    expect(result.heroSubtitle).toBe('My Subtitle');
  });

  it('should handle null values', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'heroTitle', value: null },
    ]);

    const result = await getHomepageConfig();

    expect(result.heroTitle).toBeNull();
  });

  it('should merge database config with defaults', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([
      { key: 'heroTitle', value: 'Custom Title' },
      // showEvents not in DB, should use default
    ]);

    const result = await getHomepageConfig();

    expect(result.heroTitle).toBe('Custom Title');
    expect(result.showEvents).toBe(true); // From defaults
  });

  it('should handle errors and return defaults', async () => {
    // Mock count to succeed but findMany to throw to trigger the catch block
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await getHomepageConfig();

    expect(result).toEqual(defaultConfigs.homepage);
    expect(result.heroTitle).toBe('Default Title');
    // The error should be logged
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur lors de la récupération de la configuration homepage',
      expect.any(Error)
    );
  });

  it('should filter by homepage section', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([]);

    await getHomepageConfig();

    expect(prisma.siteConfig.findMany).toHaveBeenCalledWith({
      where: { section: 'homepage' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('should not convert empty strings to numbers', async () => {
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(1);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([{ key: 'maxEvents', value: '' }]);

    const result = await getHomepageConfig();

    expect(result.maxEvents).toBe('');
  });
});
