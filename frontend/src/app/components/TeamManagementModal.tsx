import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  UserPlus,
  Users,
  Trash2,
  Shield,
  Clock,
  Brain,
  Loader2,
  Sparkles,
  Check,
  X,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  mockUsers,
  type Project,
  type TeamMember,
  type User,
} from '../lib/mockData';
import {
  computeMemberAffinityScore,
  computeTeamAffinity,
  type MemberAffinityScore,
} from '../lib/affinityScore';
import {
  AffinityScoreBar,
  AffinityScorePanel,
  AffinityScoreRing,
  AiJustification,
} from './AffinityScore';
import { scoreBadgeColor } from '../lib/affinityScore';
import {
  isApiModeEnabled,
  matchmakingApi,
  notificationsApi,
  teamsApi,
  type ApiMatchmakingResult,
  type UserNotification,
} from '../lib/projectApi';
import { useAuth } from '../lib/authContext';
import {
  buildCandidateRecommendations,
  normalizeRoleLabel,
  type CandidateRecommendation,
} from '../lib/matchmakingProposals';
import { TeamMetricsGrid } from './TeamMetricsGrid';

export type TeamMemberWithUser = TeamMember & { user: User };

interface TeamManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  leader: User;
  members: TeamMemberWithUser[];
  onMembersChange: (members: TeamMemberWithUser[]) => void;
  /** Recarga el equipo desde la API tras invitar o aprobar solicitudes. */
  onTeamUpdated?: () => void | Promise<void>;
  canManage: boolean;
}

const ACTIONABLE_REQUEST_TYPES = new Set([
  'PROJECT_JOIN_REQUEST',
  'ROLE_APPLICATION_REQUEST',
]);

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function matchToUser(match: ApiMatchmakingResult): User {
  return {
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
}

function MemberRow({
  affinity,
  onRemove,
  canManage,
  isLeader,
}: {
  affinity: MemberAffinityScore;
  onRemove: () => void;
  canManage: boolean;
  isLeader?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">
              {getInitials(affinity.user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{affinity.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{affinity.role}</p>
                {isLeader && (
                  <Badge variant="outline" className="mt-1 text-xs gap-1 max-w-full">
                    <Shield className="h-3 w-3 shrink-0" />
                    Líder
                  </Badge>
                )}
              </div>
              <AffinityScoreRing
                value={affinity.overallScore}
                size="sm"
                showLabel={false}
              />
            </div>
            <div className="mt-2">
              <AffinityScoreBar value={affinity.overallScore} showLabel />
            </div>
          </div>
        </div>
        {canManage && !isLeader && (
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Ocultar detalle' : 'Ver score y justificación IA'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive gap-1"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </Button>
          </div>
        )}
      </div>
      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/20">
          <AffinityScorePanel
            score={affinity.overallScore}
            breakdown={affinity.breakdown}
            justification={affinity.justification}
            aiJustification={affinity.aiJustification}
            matchedSkills={affinity.matchedSkills}
          />
        </div>
      )}
    </div>
  );
}

export function TeamManagementModal({
  open,
  onOpenChange,
  project,
  leader,
  members,
  onMembersChange,
  onTeamUpdated,
  canManage,
}: TeamManagementModalProps) {
  const { user: authUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [removeTarget, setRemoveTarget] = useState<TeamMemberWithUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<CandidateRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<UserNotification[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const apiMode = isApiModeEnabled();

  const memberRefs = useMemo(
    () => members.map((m) => ({ userId: m.userId, role: m.role })),
    [members]
  );

  const roleOptions =
    project.requiredRoles.length > 0
      ? project.requiredRoles.map((r) => r.name)
      : ['Desarrollador', 'Diseñador', 'QA', 'Analista'];

  const memberAffinities = useMemo(
    () =>
      members.map((m) =>
        computeMemberAffinityScore(m.user, project, m.role)
      ),
    [members, project]
  );

  const teamAffinity = useMemo(
    () => computeTeamAffinity(memberAffinities),
    [memberAffinities]
  );

  const occupiedIds = new Set([
    project.leaderId,
    ...members.map((m) => m.userId),
  ]);

  const availableCandidates = apiMode
    ? []
    : mockUsers.filter((u) => !occupiedIds.has(u.id));

  const previewAffinity = useMemo(() => {
    if (!selectedUserId || !selectedRole) return null;
    const user = mockUsers.find((u) => u.id === selectedUserId);
    if (!user) return null;
    return computeMemberAffinityScore(user, project, selectedRole);
  }, [selectedUserId, selectedRole, project]);

  const spotsLeft = project.teamSize - 1 - members.length;

  const loadRecommendations = useCallback(async () => {
    if (!apiMode || !open || spotsLeft <= 0) {
      setRecommendations([]);
      return;
    }
    setLoadingRecommendations(true);
    setRecommendationsError(null);
    try {
      const { matches } = await matchmakingApi.getProjectMatches(project.id, 30, 0);
      const recs = buildCandidateRecommendations(
        project,
        matches,
        authUser?.id ?? '',
        memberRefs
      );
      setRecommendations(recs);
      if (recs.length === 0) {
        setRecommendationsError(
          'No hay candidatos con perfil suficiente para las vacantes actuales.'
        );
      }
    } catch (err) {
      setRecommendations([]);
      setRecommendationsError(
        err instanceof Error ? err.message : 'No se pudieron cargar recomendaciones'
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }, [apiMode, open, spotsLeft, project, authUser?.id, memberRefs]);

  const loadPendingRequests = useCallback(async () => {
    if (!apiMode || !open) {
      setPendingRequests([]);
      return;
    }
    setLoadingRequests(true);
    try {
      const { notifications } = await notificationsApi.list();
      const forProject = (notifications ?? []).filter(
        (n) =>
          n.projectId === project.id &&
          n.actionable !== false &&
          ACTIONABLE_REQUEST_TYPES.has(n.type)
      );
      setPendingRequests(forProject);
    } catch {
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [apiMode, open, project.id]);

  useEffect(() => {
    if (!open) return;
    void loadRecommendations();
    void loadPendingRequests();
  }, [open, loadRecommendations, loadPendingRequests]);

  const handleInviteCandidate = async (rec: CandidateRecommendation) => {
    if (spotsLeft <= 0) return;
    const role = normalizeRoleLabel(rec.suggestedRole);
    const user = matchToUser(rec.match);
    setInvitingUserId(rec.match.userId);
    setSaving(true);
    try {
      if (apiMode) {
        await teamsApi.updateMembers(project.id, {
          add: [{ userId: rec.match.userId, rol: role }],
        });
        window.dispatchEvent(new CustomEvent('teammatch:membership-changed'));
      }
      const newMember: TeamMemberWithUser = {
        userId: user.id,
        projectId: project.id,
        role,
        joinedDate: new Date().toISOString().split('T')[0],
        tasksCompleted: 0,
        totalTasks: 0,
        user,
      };
      onMembersChange([...members, newMember]);
      setRecommendations((prev) => prev.filter((r) => r.match.userId !== rec.match.userId));
      await onTeamUpdated?.();
      toast.success(`${user.name} se unió al equipo`);
    } catch (err) {
      console.error('Failed to invite candidate', err);
      toast.error('No se pudo invitar al candidato. Revisa permisos y plazas libres.');
    } finally {
      setInvitingUserId(null);
      setSaving(false);
    }
  };

  const handleRespondToRequest = async (
    notificationId: string,
    decision: 'approved' | 'rejected'
  ) => {
    setRespondingId(notificationId);
    try {
      await notificationsApi.respond(notificationId, decision);
      setPendingRequests((prev) =>
        prev.filter((n) => n.notificationId !== notificationId)
      );
      window.dispatchEvent(new CustomEvent('teammatch:membership-changed'));
      window.dispatchEvent(new CustomEvent('teammatch:notifications-changed'));
      toast.success(decision === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      if (decision === 'approved') {
        await onTeamUpdated?.();
        await loadRecommendations();
      }
    } catch (err) {
      console.error('Failed to respond to request', err);
      toast.error('No se pudo procesar la solicitud');
      await loadPendingRequests();
    } finally {
      setRespondingId(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedRole || spotsLeft <= 0) return;
    const user = mockUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    const newMember: TeamMemberWithUser = {
      userId: user.id,
      projectId: project.id,
      role: selectedRole,
      joinedDate: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      totalTasks: 0,
      user,
    };

    setSaving(true);
    try {
      if (apiMode) {
        await teamsApi.updateMembers(project.id, {
          add: [{ userId: user.id, rol: selectedRole }],
        });
      }
      onMembersChange([...members, newMember]);
      setSelectedUserId('');
      setSelectedRole('');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add team member', err);
      alert('No se pudo agregar el miembro al equipo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setSaving(true);
    try {
      if (apiMode) {
        await teamsApi.updateMembers(project.id, {
          remove: [removeTarget.userId],
        });
      }
      onMembersChange(members.filter((m) => m.userId !== removeTarget.userId));
      setRemoveTarget(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove team member', err);
      alert('No se pudo quitar el miembro del equipo.');
    } finally {
      setSaving(false);
    }
  };

  const teamMetrics = [
    {
      label: 'Complementariedad',
      shortLabel: 'Complement.',
      value: teamAffinity.complementarity,
      icon: Brain,
    },
    {
      label: 'Disponibilidad',
      shortLabel: 'Disponib.',
      value: teamAffinity.availabilityMatch,
      icon: Clock,
    },
    {
      label: 'Balance de experiencia',
      shortLabel: 'Balance exp.',
      value: teamAffinity.experienceBalance,
      icon: Shield,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gestión del equipo
            </DialogTitle>
            <DialogDescription>
              {project.name} · {members.length + 1}/{project.teamSize} plazas
              ocupadas
              {!canManage && ' · Solo lectura'}
            </DialogDescription>
          </DialogHeader>

          {/* Team score summary */}
          <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-cyan-500/5 p-4 space-y-4 min-w-0">
            <div className="flex flex-col gap-4 min-[480px]:flex-row min-[480px]:items-start">
              <div className="flex flex-col items-center shrink-0 gap-1 self-center min-[480px]:self-start">
                <AffinityScoreRing
                  value={teamAffinity.overallScore}
                  size="lg"
                  showLabel={false}
                />
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Score del equipo
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-2 w-full">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">Score de afinidad del equipo</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words leading-relaxed">
                    {teamAffinity.teamJustification}
                  </p>
                </div>
                <AffinityScoreBar
                  value={teamAffinity.overallScore}
                  height="md"
                  showLabel
                />
              </div>
            </div>

            <TeamMetricsGrid metrics={teamMetrics} layout="compact" />

            <AiJustification
              text={teamAffinity.aiJustification}
              title="Análisis de IA del equipo"
            />
          </div>

          {/* Leader */}
          <div>
            <p className="text-sm font-medium mb-2">Líder del proyecto</p>
            <MemberRow
              affinity={computeMemberAffinityScore(
                leader,
                project,
                'Líder de proyecto'
              )}
              onRemove={() => {}}
              canManage={false}
              isLeader
            />
          </div>

          {/* Members list */}
          <div>
            <p className="text-sm font-medium mb-2">
              Miembros ({members.length})
            </p>
            {members.length > 0 ? (
              <div className="space-y-3">
                {memberAffinities.map((affinity, i) => (
                  <MemberRow
                    key={members[i].userId}
                    affinity={affinity}
                    canManage={canManage}
                    onRemove={() => setRemoveTarget(members[i])}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                No hay miembros además del líder
              </p>
            )}
          </div>

          {/* Add members / invitations */}
          {canManage && (
            <div className="rounded-xl border border-dashed p-4 space-y-5 min-w-0">
              <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                <UserPlus className="h-4 w-4 text-primary shrink-0" />
                Agregar miembros
                {spotsLeft > 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    {spotsLeft === 1 ? '1 plaza libre' : `${spotsLeft} plazas libres`}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Equipo completo
                  </Badge>
                )}
              </p>

              {apiMode && (
                <>
                  {/* Pending join requests */}
                  <div className="space-y-3 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-amber-600 shrink-0" />
                      Solicitudes para unirse
                      {pendingRequests.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {pendingRequests.length}
                        </Badge>
                      )}
                    </p>
                    {loadingRequests ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando solicitudes…
                      </div>
                    ) : pendingRequests.length > 0 ? (
                      <div className="space-y-2">
                        {pendingRequests.map((req) => {
                          const isResponding = respondingId === req.notificationId;
                          const applicant =
                            req.applicantDisplayName ?? 'Usuario';
                          const roleLabel =
                            req.type === 'ROLE_APPLICATION_REQUEST'
                              ? req.roleName ?? 'Rol solicitado'
                              : 'Unirse al proyecto';
                          return (
                            <div
                              key={req.notificationId}
                              className="rounded-lg border bg-card p-3 space-y-2 min-w-0"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-sm break-words">
                                  {applicant}
                                </p>
                                <p className="text-xs text-muted-foreground break-words">
                                  {roleLabel}
                                </p>
                                {req.message && (
                                  <p className="text-xs text-muted-foreground mt-1 italic break-words">
                                    &ldquo;{req.message}&rdquo;
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-1"
                                  disabled={isResponding || spotsLeft <= 0}
                                  onClick={() =>
                                    void handleRespondToRequest(
                                      req.notificationId,
                                      'approved'
                                    )
                                  }
                                >
                                  {isResponding ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Aceptar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  disabled={isResponding}
                                  onClick={() =>
                                    void handleRespondToRequest(
                                      req.notificationId,
                                      'rejected'
                                    )
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Rechazar
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No hay solicitudes pendientes para este proyecto.
                      </p>
                    )}
                  </div>

                  {/* Matchmaking recommendations */}
                  <div className="space-y-3 min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      Recomendaciones de matchmaking
                    </p>
                    {spotsLeft <= 0 ? (
                      <p className="text-xs text-muted-foreground">
                        El equipo está completo. Libera una plaza para invitar más candidatos.
                      </p>
                    ) : loadingRecommendations ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando candidatos…
                      </div>
                    ) : recommendations.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {recommendations.map((rec) => {
                          const isInviting = invitingUserId === rec.match.userId;
                          const skills = rec.match.coverage.coveredRequiredSkills.slice(
                            0,
                            3
                          );
                          return (
                            <div
                              key={rec.match.userId}
                              className="rounded-lg border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-sm break-words">
                                      {rec.match.user}
                                    </p>
                                    <p className="text-xs text-muted-foreground break-words">
                                      Rol sugerido: {rec.suggestedRole}
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${scoreBadgeColor(rec.displayScore)}`}
                                  >
                                    {rec.displayScore}%
                                  </span>
                                </div>
                                {skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {skills.map((s) => (
                                      <Badge
                                        key={s}
                                        variant="outline"
                                        className="text-xs max-w-full truncate"
                                      >
                                        {s}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="shrink-0 gap-1 w-full sm:w-auto"
                                disabled={isInviting || saving}
                                onClick={() => void handleInviteCandidate(rec)}
                              >
                                {isInviting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserPlus className="h-3.5 w-3.5" />
                                )}
                                Invitar al equipo
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground break-words">
                        {recommendationsError ??
                          'No hay candidatos recomendados en este momento.'}
                      </p>
                    )}
                  </div>
                </>
              )}

              {!apiMode && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs text-muted-foreground">
                        Candidato
                      </label>
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                        disabled={spotsLeft <= 0 || availableCandidates.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCandidates.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs text-muted-foreground">Rol</label>
                      <Select
                        value={selectedRole}
                        onValueChange={setSelectedRole}
                        disabled={spotsLeft <= 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {previewAffinity && (
                    <div className="rounded-lg border bg-muted/30 p-3 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Vista previa del candidato
                      </p>
                      <AffinityScorePanel
                        score={previewAffinity.overallScore}
                        breakdown={previewAffinity.breakdown}
                        justification={previewAffinity.justification}
                        aiJustification={previewAffinity.aiJustification}
                        matchedSkills={previewAffinity.matchedSkills}
                        title={previewAffinity.user.name}
                        subtitle={previewAffinity.role}
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    className="w-full gap-2"
                    disabled={
                      !selectedUserId || !selectedRole || spotsLeft <= 0 || saving
                    }
                    onClick={handleAddMember}
                  >
                    <UserPlus className="h-4 w-4" />
                    Agregar al equipo
                  </Button>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar del equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.user.name} dejará de formar parte del proyecto. Esta
              acción se puede revertir agregándolo de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitar miembro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
