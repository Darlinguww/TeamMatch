import { ForbiddenError, NotFoundError } from '../errors/HttpErrors.js';

export interface ProjectAccessRepository {
  isUserMemberOfProject(userId: string, projectId: string): Promise<boolean>;
  isProjectLeader(userId: string, projectId: string): Promise<boolean>;
  findProjectLeader(projectId: string): Promise<string | null>;
}

export interface TaskAccessRepository {
  isUserInProjectByTask(userId: string, taskId: string): Promise<boolean>;
  isTaskInProject(taskId: string): Promise<boolean>;
  isProjectLeaderForTask(userId: string, taskId: string): Promise<boolean>;
}

export async function authorizeProjectMember(
  repository: ProjectAccessRepository,
  userId: string,
  projectId: string
): Promise<void> {
  const isMember = await repository.isUserMemberOfProject(userId, projectId);
  if (!isMember) {
    throw new ForbiddenError('Forbidden');
  }
}

export async function authorizeProjectLeader(
  repository: ProjectAccessRepository,
  userId: string,
  projectId: string
): Promise<void> {
  const isLeader = await repository.isProjectLeader(userId, projectId);
  if (!isLeader) {
    throw new ForbiddenError('Only project leaders can perform this action');
  }
}

export async function authorizeTaskProjectAccess(
  repository: TaskAccessRepository,
  userId: string,
  taskId: string
): Promise<void> {
  const taskExists = await repository.isTaskInProject(taskId);
  if (!taskExists) {
    throw new NotFoundError('Tarea no encontrada');
  }

  const hasAccess = await repository.isUserInProjectByTask(userId, taskId);
  if (!hasAccess) {
    throw new ForbiddenError('Forbidden');
  }
}

export async function authorizeTaskLeaderReview(
  repository: TaskAccessRepository,
  userId: string,
  taskId: string
): Promise<void> {
  await authorizeTaskProjectAccess(repository, userId, taskId);

  const isLeader = await repository.isProjectLeaderForTask(userId, taskId);
  if (!isLeader) {
    throw new ForbiddenError('Only project leaders can review tasks');
  }
}
