import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError } from '../errors/HttpErrors.js';
import {
  authorizeProjectLeader,
  authorizeProjectMember,
  authorizeTaskLeaderReview,
  authorizeTaskProjectAccess
} from './authorization.js';

describe('authorization helpers', () => {
  it('deniega miembros no pertenecientes al proyecto', async () => {
    const repo = {
      isUserMemberOfProject: vi.fn().mockResolvedValue(false),
      isProjectLeader: vi.fn(),
      findProjectLeader: vi.fn()
    };

    await expect(authorizeProjectMember(repo, 'u1', 'p1')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('deniega acciones de lider a no-lideres', async () => {
    const repo = {
      isUserMemberOfProject: vi.fn(),
      isProjectLeader: vi.fn().mockResolvedValue(false),
      findProjectLeader: vi.fn()
    };

    await expect(authorizeProjectLeader(repo, 'u1', 'p1')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('oculta tareas inexistentes como 404', async () => {
    const repo = {
      isUserInProjectByTask: vi.fn(),
      isTaskInProject: vi.fn().mockResolvedValue(false),
      isProjectLeaderForTask: vi.fn()
    };

    await expect(authorizeTaskProjectAccess(repo, 'u1', 't1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('impide revision de tareas a miembros no lideres', async () => {
    const repo = {
      isUserInProjectByTask: vi.fn().mockResolvedValue(true),
      isTaskInProject: vi.fn().mockResolvedValue(true),
      isProjectLeaderForTask: vi.fn().mockResolvedValue(false)
    };

    await expect(authorizeTaskLeaderReview(repo, 'member', 't1')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
