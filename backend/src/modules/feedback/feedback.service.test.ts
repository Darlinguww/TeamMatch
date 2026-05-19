import { describe, expect, it, vi } from 'vitest';
import { BadRequestError, ForbiddenError } from '../../shared/errors/HttpErrors.js';
import { FeedbackService } from './feedback.service.js';

function buildRepo(overrides: Record<string, unknown> = {}) {
  return {
    isUserMemberOfProject: vi.fn().mockResolvedValue(true),
    hasFeedbackBetweenUsers: vi.fn().mockResolvedValue(false),
    findProjectLeader: vi.fn().mockResolvedValue('leader-1'),
    createFeedbackRelationship: vi.fn().mockResolvedValue(undefined),
    setProjectStatusAndFeedback: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('FeedbackService', () => {
  it('rechaza auto-evaluacion', async () => {
    const service = new FeedbackService(buildRepo() as never);

    await expect(service.submitFeedback('u1', {
      projectId: 'p1',
      toUserId: 'u1',
      score: 5
    })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rechaza feedback duplicado', async () => {
    const service = new FeedbackService(buildRepo({
      hasFeedbackBetweenUsers: vi.fn().mockResolvedValue(true)
    }) as never);

    await expect(service.submitFeedback('u1', {
      projectId: 'p1',
      toUserId: 'u2',
      score: 4
    })).rejects.toThrow(/already submitted/i);
  });

  it('solo el lider puede cerrar el proyecto', async () => {
    const service = new FeedbackService(buildRepo({
      findProjectLeader: vi.fn().mockResolvedValue('leader-1')
    }) as never);

    await expect(service.closeProjectAndEnableFeedback('member', 'p1'))
      .rejects.toBeInstanceOf(ForbiddenError);

    const result = await service.closeProjectAndEnableFeedback('leader-1', 'p1');
    expect(result.projectId).toBe('p1');
  });
});
