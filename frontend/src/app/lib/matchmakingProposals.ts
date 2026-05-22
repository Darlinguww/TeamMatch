import type { Project } from './mockData';
import type { ApiMatchmakingResult } from './projectApi';

export interface TeamMemberRef {
  userId: string;
  role: string;
}

export interface OpenRoleSlot {
  roleName: string;
  label: string;
}

/** Strip UI suffixes like " #2" or "(×3)" from role labels. */
export function normalizeRoleLabel(role: string): string {
  return role
    .replace(/\s*#\d+\s*$/i, '')
    .replace(/\s*\(×\d+\)\s*$/i, '')
    .trim();
}

function isLeaderRole(role: string): boolean {
  const key = normalizeRoleLabel(role).toLowerCase();
  return key === 'lider' || key === 'leader' || key === 'líder';
}

/** Open slots = unfilled role headcount, capped by remaining team capacity. */
export function computeOpenRoleSlots(
  project: Project,
  members: TeamMemberRef[],
  leaderId: string
): OpenRoleSlot[] {
  const filledByRole = new Map<string, number>();

  for (const member of members) {
    if (member.userId === leaderId || isLeaderRole(member.role)) continue;
    const key = normalizeRoleLabel(member.role).toLowerCase();
    filledByRole.set(key, (filledByRole.get(key) ?? 0) + 1);
  }

  const slots: OpenRoleSlot[] = [];

  if (project.requiredRoles.length > 0) {
    for (const roleDef of project.requiredRoles) {
      const baseName = normalizeRoleLabel(roleDef.name);
      const headcount = roleDef.headcount ?? 1;
      const filled = filledByRole.get(baseName.toLowerCase()) ?? 0;
      const open = Math.max(0, headcount - filled);

      for (let i = 0; i < open; i++) {
        slots.push({
          roleName: baseName,
          label: headcount > 1 ? `${baseName} #${filled + i + 1}` : baseName,
        });
      }
    }
  } else {
    const nonLeaderMembers = members.filter((m) => m.userId !== leaderId && !isLeaderRole(m.role));
    const spots = Math.max(0, project.teamSize - 1 - nonLeaderMembers.length);
    for (let i = 0; i < spots; i++) {
      slots.push({ roleName: 'miembro', label: 'Miembro del equipo' });
    }
  }

  const currentTotal = 1 + members.filter((m) => m.userId !== leaderId).length;
  const capacityLeft = Math.max(0, project.teamSize - currentTotal);
  return slots.slice(0, capacityLeft);
}

export function dedupeMatchmakingResults(matches: ApiMatchmakingResult[]): ApiMatchmakingResult[] {
  const byUser = new Map<string, ApiMatchmakingResult>();
  for (const match of matches) {
    const existing = byUser.get(match.userId);
    if (!existing || match.score > existing.score) {
      byUser.set(match.userId, match);
    }
  }
  return [...byUser.values()].sort((a, b) => b.score - a.score);
}

export function scoreMatchForRole(match: ApiMatchmakingResult, roleName: string): number {
  const target = normalizeRoleLabel(roleName).toLowerCase();
  let bonus = 0;
  if (
    match.coverage.coveredRoles.some(
      (role) => normalizeRoleLabel(role).toLowerCase() === target
    )
  ) {
    bonus += 25;
  }
  if (
    match.coverage.coveredRequiredSkills.some((skill) =>
      target.includes(skill.toLowerCase()) || skill.toLowerCase().includes(target)
    )
  ) {
    bonus += 10;
  }
  return match.score + bonus;
}

export function proposalMemberKey(proposalMembers: Array<{ user: { id: string } }>): string {
  return proposalMembers
    .map((m) => m.user.id)
    .sort()
    .join('|');
}

export interface CandidateRecommendation {
  match: ApiMatchmakingResult;
  suggestedRole: string;
  displayScore: number;
}

/** Candidatos individuales ordenados por encaje (para invitar desde gestión de equipo). */
export function buildCandidateRecommendations(
  project: Project,
  matches: ApiMatchmakingResult[],
  authUserId: string,
  currentMembers: TeamMemberRef[],
  limit = 15
): CandidateRecommendation[] {
  const openSlots = computeOpenRoleSlots(project, currentMembers, project.leaderId);
  const occupiedIds = new Set([
    project.leaderId,
    authUserId,
    ...currentMembers.map((m) => m.userId),
  ]);

  const pool = dedupeMatchmakingResults(
    matches.filter((m) => !occupiedIds.has(m.userId))
  );

  if (pool.length === 0) {
    return [];
  }

  const recommendations: CandidateRecommendation[] = pool.map((match) => {
    let suggestedRole = 'Miembro del equipo';
    let displayScore = Math.round(match.score);

    if (openSlots.length > 0) {
      let bestScore = -1;
      let bestLabel = openSlots[0].label;
      for (const slot of openSlots) {
        const score = scoreMatchForRole(match, slot.roleName);
        if (score > bestScore) {
          bestScore = score;
          bestLabel = slot.label;
          displayScore = Math.round(score);
        }
      }
      suggestedRole = bestLabel;
    }

    return { match, suggestedRole, displayScore };
  });

  return recommendations
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, limit);
}
