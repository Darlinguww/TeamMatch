import { ActiveTaskSummary, TeamComposition, TeamMember, TeamRole } from '../types/team.types.js';

export interface TeamCompositionRecord {
  id: unknown;
  title: unknown;
  description: unknown;
  summary: unknown;
  createdAt: unknown;
  members: unknown;
  roles: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function serializeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function serializeMember(value: unknown): TeamMember | null {
  if (!isRecord(value)) {
    return null;
  }

  const userId = serializeString(value.userId);

  if (!userId) {
    return null;
  }

  const rolRaw = value.rol ?? value.role;

  return {
    userId,
    user: serializeString(value.user),
    joinedAt: serializeOptionalString(value.joinedAt),
    rol: typeof rolRaw === 'string' && rolRaw.trim() ? rolRaw.trim() : null
  };
}

function serializeRole(value: unknown): TeamRole | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = serializeString(value.name);

  if (!name) {
    return null;
  }

  const headcount = Number(value.headcount ?? 1);

  return {
    roleId: serializeString(value.roleId),
    name,
    skills: Array.isArray(value.skills)
      ? value.skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
      : [],
    headcount: Number.isFinite(headcount) && headcount > 0 ? Math.min(20, Math.floor(headcount)) : 1
  };
}

export function serializeTeamComposition(record: TeamCompositionRecord): TeamComposition {
  return {
    id: serializeString(record.id),
    title: serializeString(record.title),
    description: serializeString(record.description),
    summary: serializeString(record.summary),
    createdAt: serializeOptionalString(record.createdAt),
    members: Array.isArray(record.members)
      ? record.members.map(serializeMember).filter((member): member is TeamMember => member !== null)
      : [],
    roles: Array.isArray(record.roles)
      ? record.roles.map(serializeRole).filter((role): role is TeamRole => role !== null)
      : []
  };
}

export function serializeActiveTaskSummary(value: unknown): ActiveTaskSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const taskId = serializeString(value.taskId);

  if (!taskId) {
    return null;
  }

  return {
    taskId,
    title: serializeString(value.title),
    status: serializeOptionalString(value.status)
  };
}
