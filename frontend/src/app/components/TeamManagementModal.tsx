import { useMemo, useState } from 'react';
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
import { UserPlus, Users, Trash2, Shield, Clock, Brain } from 'lucide-react';
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
import { scoreColor, scoreBarColor } from '../lib/affinityScore';
import { isApiModeEnabled, teamsApi } from '../lib/projectApi';

export type TeamMemberWithUser = TeamMember & { user: User };

interface TeamManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  leader: User;
  members: TeamMemberWithUser[];
  onMembersChange: (members: TeamMemberWithUser[]) => void;
  canManage: boolean;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
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
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{affinity.user.name}</p>
                <p className="text-xs text-muted-foreground">{affinity.role}</p>
                {isLeader && (
                  <Badge variant="outline" className="mt-1 text-xs gap-1">
                    <Shield className="h-3 w-3" />
                    Líder
                  </Badge>
                )}
              </div>
              <AffinityScoreRing value={affinity.overallScore} size="sm" />
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
  canManage,
}: TeamManagementModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [removeTarget, setRemoveTarget] = useState<TeamMemberWithUser | null>(null);
  const [saving, setSaving] = useState(false);
  const apiMode = isApiModeEnabled();

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
    { label: 'Complementariedad', value: teamAffinity.complementarity, icon: Brain },
    { label: 'Disponibilidad', value: teamAffinity.availabilityMatch, icon: Clock },
    { label: 'Balance exp.', value: teamAffinity.experienceBalance, icon: Shield },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-cyan-500/5 p-4 space-y-4">
            <div className="flex items-start gap-4">
              <AffinityScoreRing
                value={teamAffinity.overallScore}
                size="lg"
                label="equipo"
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="font-semibold text-sm">Score de afinidad del equipo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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

            <div className="grid grid-cols-3 gap-3">
              {teamMetrics.map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <m.icon className="h-3 w-3" />
                      {m.label}
                    </span>
                    <span className={`font-bold ${scoreColor(m.value)}`}>
                      {m.value}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${scoreBarColor(m.value)}`}
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

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

          {/* Add member */}
          {canManage && (
            <div className="rounded-xl border border-dashed p-4 space-y-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Agregar miembro
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
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                  En modo API no se muestran usuarios de demostraciÃ³n. Agrega miembros aceptando propuestas reales desde Matchmaking.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    Candidato
                  </label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                    disabled={apiMode || spotsLeft <= 0 || availableCandidates.length === 0}
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
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Rol</label>
                  <Select
                    value={selectedRole}
                    onValueChange={setSelectedRole}
                    disabled={apiMode || spotsLeft <= 0}
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
                <div className="rounded-lg border bg-muted/30 p-3">
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
                  !selectedUserId ||
                  !selectedRole ||
                  apiMode ||
                  spotsLeft <= 0 ||
                  saving
                }
                onClick={handleAddMember}
              >
                <UserPlus className="h-4 w-4" />
                Agregar al equipo
              </Button>
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
