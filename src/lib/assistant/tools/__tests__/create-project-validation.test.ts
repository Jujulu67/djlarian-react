import { createProjectSchema } from '../create-projects-schema';
import { z } from 'zod';

describe('Create Project Tool Validation (Deadline Fix)', () => {
  it('should validate valid inputs', () => {
    const input = {
      name: 'Test Project',
      style: 'Techno',
      collab: 'Martin',
      status: 'EN_COURS',
      deadline: '2025-01-01', // Standard string deadline
    };
    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deadline).toBe('2025-01-01');
    }
  });

  it('should validate object deadline (AI Hallucination Fix)', () => {
    const input = {
      name: 'Hallucinated Project',
      deadline: { date: '2026-01-13' }, // The hallucinated object
    };
    const result = createProjectSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should be transformed to string
      expect(result.data.deadline).toBe('2026-01-13');
    }
  });

  it('should still support array collab and empty style', () => {
    const input = {
      name: 'Test',
      style: '',
      collab: ['Martin', 'Paul'],
    };
    const result = createProjectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
