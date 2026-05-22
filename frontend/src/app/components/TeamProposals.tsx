import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Sparkles, Users, Clock, Star, ChevronDown, ChevronUp,
  CheckCircle2, Zap, Brain, RefreshCw,
  Shield, Award,
} from 'lucide-react';
import { mockUsers, type User, type Project } from '../lib/mockData';
import { useAuth } from '../lib/authContext';
import { isApiModeEnabled, matchmakingApi, teamsApi, type ApiMatchmakingResult } from '../lib/projectApi';
import {
  computeOpenRoleSlots,
  dedupeMatchmakingResults,
  normalizeRoleLabel,
  proposalMemberKey,
  scoreMatchForRole,
  type TeamMemberRef,
} from '../lib/matchmakingProposals';
import {
  computeMemberAffinityScore,
  computeTeamAffinity,
  scoreBadgeColor,
  type MemberAffinityScore,
} from '../lib/affinityScore';
import {
  AffinityScoreBar,
  AffinityScoreRing,
  AffinityCriteriaBreakdown,
  AiJustification,
} from './AffinityScore';
import { TeamMetricsGrid } from './TeamMetricsGrid';

interface TeamProposal {
  id: string;
  members: MemberAffinityScore[];
  teamAffinityScore: number;
  complementarity: number;
  availabilityMatch: number;
  experienceBalance: number;
  teamJustification: string;
  aiJustification: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function matchToMemberScore(match: ApiMatchmakingResult, role: string): MemberAffinityScore {
  const user: User = {
    id: match.userId,
    name: match.user,
    email: '',
    bio: '',
    skills: match.coverage.coveredRequiredSkills.map((name, i) => ({
      id: `m_${match.userId}_${i}`,
      name,
      category: 'technical' as const,
      level: 'intermediate' as const,
    })),
    interests: [],
    experience: match.experienceLevel === 'senior' ? 5 : match.experienceLevel === 'mid' ? 3 : 1,
    availability: { hoursPerWeek: 20, preferredTimes: [] },
    completedProjects: 0,
    rating: Math.round((match.reputationScore / 100) * 5 * 10) / 10,
    joinedDate: new Date().toISOString().split('T')[0],
  };

  const breakdown = {
    skills: Math.round((match.breakdown.skills / 60) * 100),
    availability: Math.round((match.breakdown.availability / 20) * 100),
    experience: Math.round((match.breakdown.experienceBalance / 5) * 100),
    feedback: Math.round((match.breakdown.reputation / 20) * 100),
  };

  const overall = Math.round(match.score);
  const justification = match.reasons.length > 0
    ? match.reasons.join(' ')
    : `Encaje del ${overall}% para el rol ${role} según habilidades y disponibilidad en Neo4j.`;

  return {
    user,
    role,
    overallScore: overall,
    breakdown,
    matchedSkills: match.coverage.coveredRequiredSkills,
    justification,
    aiJustification: justification,
  };
}

function buildSingleProposal(
  openSlots: ReturnType<typeof computeOpenRoleSlots>,
  pool: ApiMatchmakingResult[],
  seed: number
): TeamProposal | null {
  const usedUserIds = new Set<string>();
  const members: MemberAffinityScore[] = [];

  for (let slotIndex = 0; slotIndex < openSlots.length; slotIndex++) {
    const slot = openSlots[slotIndex];
    const candidates = pool.filter((match) => !usedUserIds.has(match.userId));
    if (candidates.length === 0) {
      return null;
    }

    const ranked = candidates
      .map((match) => ({ match, score: scoreMatchForRole(match, slot.roleName) }))
      .sort((a, b) => b.score - a.score || a.match.userId.localeCompare(b.match.userId));

    const pick = ranked[(seed + slotIndex) % ranked.length]?.match;
    if (!pick) {
      return null;
    }

    usedUserIds.add(pick.userId);
    members.push(matchToMemberScore(pick, slot.label));
  }

  if (members.length === 0) {
    return null;
  }

  const summary = computeTeamAffinity(members);
  return {
    id: `api_proposal_${seed}_${proposalMemberKey(members)}`,
    members,
    teamAffinityScore: summary.overallScore,
    complementarity: summary.complementarity,
    availabilityMatch: summary.availabilityMatch,
    experienceBalance: summary.experienceBalance,
    teamJustification: summary.teamJustification,
    aiJustification: `Propuesta para ${members.length} vacante(s) abierta(s). ${summary.aiJustification}`,
  };
}

function buildProposalsFromMatches(
  project: Project,
  matches: ApiMatchmakingResult[],
  authUserId: string,
  currentMembers: TeamMemberRef[]
): TeamProposal[] {
  const openSlots = computeOpenRoleSlots(project, currentMembers, project.leaderId);
  if (openSlots.length === 0) {
    return [];
  }

  const pool = dedupeMatchmakingResults(
    matches.filter((m) => m.userId !== authUserId && m.userId !== project.leaderId)
  ).filter((m) => !currentMembers.some((member) => member.userId === m.userId));

  if (pool.length === 0) {
    return [];
  }

  const proposals: TeamProposal[] = [];
  const seenKeys = new Set<string>();

  for (let seed = 0; seed < 3 && proposals.length < 3; seed++) {
    const proposal = buildSingleProposal(openSlots, pool, seed);
    if (!proposal) continue;
    const key = proposalMemberKey(proposal.members);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    proposals.push(proposal);
  }

  return proposals;
}

function generateProposals(
  project: Project,
  authUserId: string,
  currentMembers: TeamMemberRef[]
): TeamProposal[] {
  const openSlots = computeOpenRoleSlots(project, currentMembers, project.leaderId);
  if (openSlots.length === 0) {
    return [];
  }

  const candidates = mockUsers.filter(
    (u) =>
      u.id !== authUserId &&
      u.id !== project.leaderId &&
      !currentMembers.some((member) => member.userId === u.id)
  );

  const shuffled = (arr: User[], seed: number) =>
    [...arr].sort((a, b) => ((parseInt(a.id, 10) * seed) % 7) - ((parseInt(b.id, 10) * seed) % 7));

  const proposals: TeamProposal[] = [];
  const seenKeys = new Set<string>();

  for (let seed = 0; seed < 3 && proposals.length < 3; seed++) {
    const pool = shuffled(candidates, seed * 3 + seed);
    const used = new Set<string>();
    const members: MemberAffinityScore[] = [];

    for (const slot of openSlots) {
      const available = pool.filter((u) => !used.has(u.id));
      if (available.length === 0) break;
      const pick = available[members.length % available.length];
      used.add(pick.id);
      members.push(computeMemberAffinityScore(pick, project, slot.label));
    }

    if (members.length !== openSlots.length) continue;

    const key = proposalMemberKey(members);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const summary = computeTeamAffinity(members);
    proposals.push({
      id: `proposal_${seed}_${key}`,
      members,
      teamAffinityScore: summary.overallScore,
      complementarity: summary.complementarity,
      availabilityMatch: summary.availabilityMatch,
      experienceBalance: summary.experienceBalance,
      teamJustification: summary.teamJustification,
      aiJustification: summary.aiJustification,
    });
  }

  return proposals;
}

function MemberCard({ ms }: { ms: MemberAffinityScore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-card transition-all duration-200 hover:shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0 overflow-hidden">
            {ms.user.avatar
              ? <img src={ms.user.avatar} alt={ms.user.name} className="h-full w-full object-cover" />
              : <span className="text-sm font-bold text-white">{getInitials(ms.user.name)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm truncate">{ms.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{ms.role}</p>
              </div>
              <div className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-bold ${scoreBadgeColor(ms.overallScore)}`}>
                <Sparkles className="h-3 w-3" />
                {ms.overallScore}%
              </div>
            </div>
            <div className="mt-2.5">
              <AffinityScoreBar value={ms.overallScore} height="md" />
            </div>
            {ms.matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ms.matchedSkills.slice(0, 3).map(s => (
                  <span key={s} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                    <CheckCircle2 className="h-2.5 w-2.5" />{s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">{ms.justification}</p>
        <AiJustification text={ms.aiJustification} compact title="Por qué la IA lo recomienda" />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-medium text-muted-foreground"
      >
        <span>Ver desglose por criterio</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t bg-muted/20">
          <AffinityCriteriaBreakdown breakdown={ms.breakdown} collapsible={false} />
          <div className="flex flex-wrap gap-3 pt-3 mt-2 text-xs text-muted-foreground border-t">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ms.user.availability?.hoursPerWeek ?? 0}h/semana
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {ms.user.experience ?? 0} años exp.
            </span>
            {ms.user.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {ms.user.rating}/5 rating
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  proposal, index, onAccept, disabled,
}: {
  proposal: TeamProposal;
  index: number;
  onAccept: () => void;
  disabled?: boolean;
}) {
  const metrics = [
    { label: 'Complementariedad', icon: Brain, value: proposal.complementarity },
    { label: 'Disponibilidad', icon: Clock, value: proposal.availabilityMatch },
    { label: 'Balance exp.', icon: Shield, value: proposal.experienceBalance },
  ];

  return (
    <Card className="overflow-hidden min-w-0">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-cyan-500/5 border-b min-w-0">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2 break-words">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              Propuesta {index + 1}
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed break-words">
              {proposal.teamJustification}
            </CardDescription>
          </div>
          <AffinityScoreRing value={proposal.teamAffinityScore} />
        </div>

        <AiJustification
          text={proposal.aiJustification}
          title="Justificación de IA del equipo"
          compact
        />

        <TeamMetricsGrid metrics={metrics} layout="stacked" className="mt-3" />
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Miembros sugeridos ({proposal.members.length})</span>
        </div>
        {proposal.members.map((ms, i) => (
          <MemberCard key={`${ms.user.id}_${i}`} ms={ms} />
        ))}
      </CardContent>

      <div className="px-4 pb-4 flex gap-2">
        <Button
          onClick={onAccept}
          disabled={disabled}
          className="flex-1 bg-gradient-to-r from-primary to-cyan-500 text-white hover:opacity-90 gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Aceptar esta propuesta
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={disabled}>
          <Zap className="h-3.5 w-3.5" />
          Ajustar
        </Button>
      </div>
    </Card>
  );
}

export type { TeamProposal };

interface TeamProposalsProps {
  project: Project;
  currentMembers?: TeamMemberRef[];
  onTeamAccepted?: (proposal: TeamProposal) => void;
  onTeamPersisted?: () => void;
}

export function TeamProposals({
  project,
  currentMembers = [],
  onTeamAccepted,
  onTeamPersisted,
}: TeamProposalsProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<TeamProposal[]>([]);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const useApi = isApiModeEnabled();

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    if (useApi) {
      try {
        const { matches } = await matchmakingApi.getProjectMatches(project.id, 30, 0);
        const fromApi = buildProposalsFromMatches(
          project,
          matches,
          user?.id ?? '',
          currentMembers
        );
        if (fromApi.length > 0) {
          setProposals(fromApi);
          setLoading(false);
          return;
        }
        const openSlots = computeOpenRoleSlots(project, currentMembers, project.leaderId);
        setProposals([]);
        setLoadError(
          openSlots.length === 0
            ? 'El equipo ya está completo. No hay vacantes para nuevas recomendaciones.'
            : 'No hay candidatos reales con perfil suficiente en la base de datos para las vacantes actuales.'
        );
        setLoading(false);
        return;
      } catch (err) {
        setProposals([]);
        setLoadError(
          err instanceof Error ? err.message : 'Error de matchmaking'
        );
        setLoading(false);
        return;
      }
    }

    setProposals(generateProposals(project, user?.id ?? '', currentMembers));
    setLoading(false);
  }, [project, useApi, user?.id, currentMembers]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const handleRegenerate = async () => {
    setAccepted(null);
    await loadProposals();
  };

  const handleAccept = async (proposal: TeamProposal) => {
    setSavingTeam(true);
    try {
      const occupiedIds = new Set([
        project.leaderId,
        user?.id ?? '',
        ...currentMembers.map((member) => member.userId),
      ]);

      const openSlots = computeOpenRoleSlots(project, currentMembers, project.leaderId);
      const newMembers = proposal.members.filter((member) => !occupiedIds.has(member.user.id));
      const limited = newMembers.slice(0, openSlots.length);

      if (limited.length === 0) {
        alert(
          openSlots.length === 0
            ? 'El equipo ya está completo. No se pueden agregar más miembros.'
            : 'Los miembros sugeridos ya forman parte del proyecto.'
        );
        return;
      }

      if (useApi) {
        await teamsApi.updateMembers(project.id, {
          add: limited.map((member) => ({
            userId: member.user.id,
            rol: normalizeRoleLabel(member.role),
          })),
        });
        onTeamPersisted?.();
        window.dispatchEvent(new CustomEvent('teammatch:membership-changed'));
      }

      const acceptedProposal: TeamProposal = {
        ...proposal,
        members: limited,
      };
      setAccepted(acceptedProposal.id);
      onTeamAccepted?.(acceptedProposal);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist team proposal', err);
      alert('No se pudo guardar el equipo en la base de datos. Revisa permisos y vuelve a intentar.');
    } finally {
      setSavingTeam(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-xl font-bold">Motor de Matchmaking</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Propuestas para <span className="font-medium text-foreground">{project.name}</span> · {proposals.length} alternativas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generando...' : 'Regenerar'}
        </Button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Score de afinidad con IA</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Cada miembro: <strong>Habilidades (45%)</strong>, <strong>Disponibilidad (25%)</strong>,
            <strong> Experiencia (20%)</strong>, <strong>Retroalimentación (10%)</strong>.
            La justificación de IA explica el encaje con el proyecto.
          </p>
        </div>
      </div>

      {accepted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">¡Propuesta aceptada!</p>
            <p className="text-xs text-green-700">El equipo se actualizó en la pestaña Equipo.</p>
          </div>
        </div>
      )}

      {loadError && !loading && proposals.length === 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-200">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-full" />
              {[1, 2, 3].map(j => <div key={j} className="h-20 bg-muted rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : proposals.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {proposals.map((p, i) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              index={i}
              onAccept={() => handleAccept(p)}
              disabled={!!accepted || savingTeam}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No hay propuestas reales disponibles todavía.
        </div>
      )}
    </div>
  );
}
