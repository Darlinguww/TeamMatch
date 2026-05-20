import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, Users, Clock, Target, Sparkles,
  UserPlus, Star, Calendar, CheckCircle2, Columns3, Plus, Zap, Loader2
} from 'lucide-react';
import { mockProjects, mockUsers, mockTeamMembers, mockTasks, type Project, type Task, type TaskStatus } from '../lib/mockData';
import { TeamProposals, type TeamProposal } from './TeamProposals';
import { KanbanBoard } from './KanbanBoard';
import { ApiError, getStoredToken } from '../lib/apiClient';
import {
  isApiProjectRouteId,
  mapApiProjectToUi,
  mapApiTaskToUi,
  projectsApi,
  shouldLoadProjectFromApi,
  tasksApi,
  teamsApi,
  type ApiProjectKanbanState,
} from '../lib/projectApi';
import { apiTaskStatusToUi } from '../lib/taskStatus';
import type { User } from '../lib/mockData';
import {
  TeamManagementModal,
  type TeamMemberWithUser,
} from './TeamManagementModal';
import { useAuth } from '../lib/authContext';
import { computeMemberAffinityScore } from '../lib/affinityScore';
import { AffinityScoreBadge } from './AffinityScore';

interface TaskForm {
  title: string;
  description: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  status: TaskStatus;
  sprint: number;
}

interface ProjectEditForm {
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  teamSize: number;
  estimatedDuration: number;
}

export function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = mockProjects.find(p => p.id === id);
  const [editableProject, setEditableProject] = useState<Project | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithUser[]>([]);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: '',
    description: '',
    assignedTo: user?.id ?? '',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    status: 'pending',
    sprint: 1,
  });
  const [projectForm, setProjectForm] = useState<ProjectEditForm>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    category: project?.category ?? '',
    difficulty: project?.difficulty ?? 'medium',
    teamSize: project?.teamSize ?? 3,
    estimatedDuration: project?.estimatedDuration ?? 4,
  });
  const [sprintActive, setSprintActive] = useState(false);
  const [currentSprint, setCurrentSprint] = useState(1);
  const [leaderUser, setLeaderUser] = useState<User | null>(null);
  const [assigneeDirectory, setAssigneeDirectory] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isProjectMember, setIsProjectMember] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [applyingRole, setApplyingRole] = useState<string | null>(null);

  const hydrateFromMock = (source: Project) => {
    setEditableProject(source);
    setProjectTasks(mockTasks.filter((t) => t.projectId === source.id));
    setTeamMembers(
      mockTeamMembers
        .filter((tm) => tm.projectId === source.id)
        .map((tm) => ({
          ...tm,
          user: mockUsers.find((u) => u.id === tm.userId)!,
        }))
        .filter((tm) => tm.user)
    );
    setProjectForm({
      name: source.name,
      description: source.description,
      category: source.category,
      difficulty: source.difficulty,
      teamSize: source.teamSize,
      estimatedDuration: source.estimatedDuration,
    });
    setSprintActive(false);
  };

  useEffect(() => {
    const projectId = id?.trim();
    if (!projectId) return;
    setLoadError(null);
    const mock = mockProjects.find((p) => p.id === projectId);

    if (!shouldLoadProjectFromApi(projectId)) {
      if (mock) {
        hydrateFromMock(mock);
      } else {
        setEditableProject(null);
        setLoadError(
          isApiProjectRouteId(projectId)
            ? 'Inicia sesión para ver este proyecto.'
            : 'Proyecto no encontrado.'
        );
      }
      return;
    }

    if (!getStoredToken()) {
      setEditableProject(null);
      setLoadError('Tu sesión ha expirado. Inicia sesión de nuevo para ver el proyecto.');
      return;
    }

    let cancelled = false;

    const loadFromApi = async (attempt = 0): Promise<void> => {
      setIsLoading(true);
      try {
        const apiProject = await projectsApi.get(projectId);
        if (cancelled) return;

        let member = false;
        try {
          const { projects: memberships } = await projectsApi.list();
          member = memberships.some((p) => p.id === projectId);
        } catch {
          member = false;
        }
        if (cancelled) return;
        setIsProjectMember(member);

        try {
          const participation = await projectsApi.getParticipationStatus(projectId);
          if (!cancelled) {
            setPendingJoin(participation.pendingJoin);
            setPendingRoles(participation.pendingRoles ?? []);
            if (participation.isMember) {
              setIsProjectMember(true);
            }
          }
        } catch {
          if (!cancelled) {
            setPendingJoin(false);
            setPendingRoles([]);
          }
        }

        const apiTasks = member ? await projectsApi.listTasks(projectId) : [];
        const team = await teamsApi.getComposition(projectId).catch(() => null);
        if (cancelled) return;

        const mapped = mapApiProjectToUi(apiProject);
        setEditableProject(mapped);
        const tasks = apiTasks.map((t) => mapApiTaskToUi(t, projectId));
        setProjectTasks(tasks);
        const maxSprintFromTasks = tasks.reduce((max, t) => Math.max(max, t.sprint ?? 1), 1);
        const kanban = apiProject.kanban;
        setSprintActive(kanban?.sprintActive ?? false);
        setCurrentSprint(
          Math.max(1, kanban?.currentSprint ?? 1, maxSprintFromTasks)
        );

        const directory: Record<string, string> = {};
        if (user?.id) {
          directory[user.id] = user.name || user.email;
        }
        if (mapped.leaderId) {
          const leaderFromApi = team?.members.find((m) => m.userId === mapped.leaderId);
          directory[mapped.leaderId] =
            leaderFromApi?.user ||
            (mapped.leaderId === user?.id ? user.name : '') ||
            apiProject.leader?.email ||
            'Líder';
          setLeaderUser({
            id: mapped.leaderId,
            name: directory[mapped.leaderId],
            email: apiProject.leader?.email ?? '',
            bio: '',
            skills: [],
            interests: [],
            experience: 0,
            availability: { hoursPerWeek: 0, preferredTimes: [] },
            completedProjects: 0,
            rating: 0,
            joinedDate: apiProject.createdAt.split('T')[0],
          });
        }
        for (const member of team?.members ?? []) {
          if (member.userId !== mapped.leaderId) {
            directory[member.userId] = member.user || member.userId;
          }
        }
        setAssigneeDirectory(directory);
        if (team) {
          setTeamMembers(
            team.members
              .filter((m) => m.userId !== mapped.leaderId)
              .map((m) => ({
                userId: m.userId,
                projectId,
                role: m.rol?.trim() || 'Miembro',
                joinedDate: m.joinedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
                tasksCompleted: 0,
                totalTasks: 0,
                user: {
                  id: m.userId,
                  name: m.user,
                  email: '',
                  bio: '',
                  skills: [],
                  interests: [],
                  experience: 0,
                  availability: { hoursPerWeek: 0, preferredTimes: [] },
                  completedProjects: 0,
                  rating: 0,
                  joinedDate: m.joinedAt?.split('T')[0] ?? '',
                },
              }))
          );
        }
        setProjectForm({
          name: apiProject.title,
          description: apiProject.description || apiProject.summary,
          category: 'Web Platform',
          difficulty: 'medium',
          teamSize: Math.max(apiProject.roles.reduce((sum, role) => sum + (role.headcount ?? 1), 0) + 1, 1),
          estimatedDuration: 4,
        });
        setLoadError(null);
      } catch (err) {
        const isNotFound =
          (err instanceof ApiError && err.status === 404) ||
          (err instanceof Error &&
            (err.message.toLowerCase().includes('not found') ||
              err.message.toLowerCase().includes('no encontrado')));
        if (!cancelled && isNotFound && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          if (!cancelled) return loadFromApi(attempt + 1);
        }
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.status === 401
                ? 'Tu sesión ha expirado. Inicia sesión de nuevo.'
                : err.status === 403
                  ? 'No tienes permiso para ver este proyecto.'
                  : err.status === 404
                    ? 'Proyecto no encontrado.'
                    : err.message
              : 'No se pudo cargar el proyecto.';
          setLoadError(message);
          setEditableProject(null);
          // eslint-disable-next-line no-console
          console.error('Failed to load project from API', err);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadFromApi();

    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const currentMembersForProposals = useMemo(
    () => teamMembers.map((member) => ({ userId: member.userId, role: member.role })),
    [teamMembers]
  );

  if (isLoading && !editableProject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground" role="status">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" aria-hidden />
        <p>Cargando proyecto…</p>
      </div>
    );
  }

  if (loadError || !editableProject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">{loadError ?? 'Proyecto no encontrado'}</h2>
        {id && (
          <p className="text-sm text-muted-foreground mb-4 font-mono break-all">
            ID: {id}
          </p>
        )}
        <Button asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Link>
        </Button>
      </div>
    );
  }

  const currentProject = editableProject ?? project;
  if (!currentProject) return null;
  const leader =
    leaderUser ??
    mockUsers.find((u) => u.id === currentProject.leaderId) ??
    (currentProject.leaderId === user?.id && user
      ? { ...user, id: user.id }
      : undefined);
  const isProjectLeader = currentProject.leaderId === user?.id;

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

  const getAssigneeName = (userId: string) => {
    if (!userId) return 'Sin asignar';
    if (assigneeDirectory[userId]) return assigneeDirectory[userId];
    return mockUsers.find((u) => u.id === userId)?.name ?? 'Sin asignar';
  };

  const boardTasks = sprintActive
    ? projectTasks.filter((t) => (t.sprint ?? 1) === currentSprint)
    : projectTasks;

  const isUserInTeam =
    isProjectMember &&
    (isProjectLeader || teamMembers.some((tm) => tm.userId === user?.id));

  const handleRequestJoin = async () => {
    const projectId = id?.trim();
    if (!projectId || !shouldLoadProjectFromApi(projectId)) return;
    setIsJoining(true);
    try {
      await projectsApi.requestJoin(projectId);
      setPendingJoin(true);
      alert('Solicitud enviada. El líder del proyecto la revisará en Alertas.');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud.';
      alert(message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleApplyToRole = async (roleName: string) => {
    const projectId = id?.trim();
    if (!projectId || !shouldLoadProjectFromApi(projectId)) return;
    setApplyingRole(roleName);
    try {
      await projectsApi.applyToRole(projectId, roleName);
      setPendingRoles((prev) => [...prev, roleName]);
      alert(`Postulación al rol "${roleName}" enviada. El líder la revisará en Alertas.`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la postulación.';
      alert(message);
    } finally {
      setApplyingRole(null);
    }
  };
  const effectiveTeamSize = (leader ? 1 : 0) + teamMembers.length;
  const spotsLeft = currentProject.teamSize - effectiveTeamSize;

  const reloadTeamFromApi = async () => {
    if (!shouldLoadProjectFromApi(currentProject.id) || !getStoredToken()) return;
    try {
      const team = await teamsApi.getComposition(currentProject.id);
      setTeamMembers(
        team.members
          .filter((m) => m.userId !== currentProject.leaderId)
          .map((m) => ({
            userId: m.userId,
            projectId: currentProject.id,
            role: m.rol?.trim() || 'Miembro',
            joinedDate: m.joinedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
            tasksCompleted: 0,
            totalTasks: 0,
            user: {
              id: m.userId,
              name: m.user,
              email: '',
              bio: '',
              skills: [],
              interests: [],
              experience: 0,
              availability: { hoursPerWeek: 0, preferredTimes: [] },
              completedProjects: 0,
              rating: 0,
              joinedDate: m.joinedAt?.split('T')[0] ?? '',
            },
          }))
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to reload team after proposal', err);
    }
  };

  const handleTeamAccepted = (proposal: TeamProposal) => {
    const newMembers: TeamMemberWithUser[] = proposal.members.map((ms) => ({
      userId: ms.user.id,
      projectId: currentProject.id,
      role: ms.role,
      joinedDate: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      totalTasks: 0,
      user: ms.user,
    }));

    setTeamMembers((prev) => {
      const byId = new Map(prev.map((member) => [member.userId, member]));
      for (const member of newMembers) {
        if (!byId.has(member.userId)) {
          byId.set(member.userId, member);
        }
      }
      return [...byId.values()];
    });
  };

  const canDragTask = (task: Task) => {
    if (isProjectLeader) return true;
    if (task.assignedTo !== user?.id) return false;
    return task.status === 'pending' || task.status === 'in-progress';
  };

  const canDropTask = (task: Task, targetStatus: TaskStatus) => {
    if (task.status === 'blocked' && !isProjectLeader) return false;
    if (isProjectLeader) {
      if (task.status === 'blocked') {
        return targetStatus === 'completed' || targetStatus === 'in-progress';
      }
      return true;
    }
    if (task.assignedTo !== user?.id) return false;
    if (task.status === 'pending' && targetStatus === 'in-progress') return true;
    if (task.status === 'in-progress' && targetStatus === 'blocked') return true;
    return false;
  };

  const handleTasksChange = async (newTasks: Task[]) => {
    const prev = projectTasks;

    const changed = newTasks.filter(nt => {
      const p = prev.find(pt => pt.id === nt.id);
      return p && p.status !== nt.status;
    });

    if (changed.length === 0) {
      setProjectTasks(newTasks);
      return;
    }

    for (const task of changed) {
      const previous = prev.find(pt => pt.id === task.id);

      if (!isProjectLeader) {
        const allowed =
          previous &&
          previous.assignedTo === user?.id &&
          ((previous.status === 'pending' && task.status === 'in-progress') ||
            (previous.status === 'in-progress' && task.status === 'blocked'));
        if (!allowed) {
          alert(
            'Solo puedes mover tus tareas: Pendiente → En progreso, o En progreso → En revisión. El líder aprueba o devuelve desde revisión.'
          );
          setProjectTasks(prev);
          return;
        }
      }

      if (previous && previous.status !== 'blocked' && task.status === 'blocked') {
        const confirmed = window.confirm('¿Quieres pasar esta tarea a En revision para que el lider la revise?');
        if (!confirmed) {
          setProjectTasks(prev);
          return;
        }
      }
    }

    setProjectTasks(newTasks);

    if (!shouldLoadProjectFromApi(currentProject.id)) {
      return;
    }

    try {
      let synced = [...newTasks];

      for (const t of changed) {
        const previous = prev.find((pt) => pt.id === t.id);
        let persistedStatus: TaskStatus = t.status;

        if (
          isProjectLeader &&
          previous?.status === 'blocked' &&
          (t.status === 'completed' || t.status === 'in-progress')
        ) {
          const res = await tasksApi.review(
            t.id,
            t.status === 'completed' ? 'approved' : 'rejected'
          );
          persistedStatus = apiTaskStatusToUi(res.task.status);
        } else {
          const res = await tasksApi.updateStatus(t.id, t.status);
          persistedStatus = apiTaskStatusToUi(res.task.status);
        }

        synced = synced.map((row) =>
          row.id === t.id ? { ...row, status: persistedStatus } : row
        );
      }

      setProjectTasks(synced);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist task status', err);
      const detail =
        err instanceof ApiError
          ? `[${err.status}] ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Error desconocido';
      alert(`No se pudo guardar el estado de la tarea: ${detail}`);
      setProjectTasks(prev);
    }
  };

  const taskAssigneeOptions = Array.from(new Set([
    currentProject.leaderId,
    ...teamMembers.map((tm) => tm.userId),
  ]));

  const resetTaskForm = (override: Partial<TaskForm> = {}) => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: user?.id ?? currentProject.leaderId,
      priority: 'medium',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'pending',
      sprint: currentSprint,
      ...override,
    });
  };

  const openNewTaskDialog = () => {
    setEditingTask(null);
    resetTaskForm({ assignedTo: user?.id ?? currentProject.leaderId });
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: task.dueDate,
      status: task.status,
      sprint: task.sprint ?? currentSprint,
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) return;

    const editingId = editingTask?.id;
    const optimisticTask: Task = {
      id: editingId ?? `task_${Date.now()}`,
      projectId: currentProject.id,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assignedTo: taskForm.assignedTo,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      status: taskForm.status,
      sprint: taskForm.sprint,
      createdDate: editingTask?.createdDate ?? new Date().toISOString(),
    };

    const previousTasks = projectTasks;
    const nextTasks = editingId
      ? projectTasks.map((t) => (t.id === editingId ? optimisticTask : t))
      : [...projectTasks, optimisticTask];

    setProjectTasks(nextTasks);
    setTaskDialogOpen(false);
    setEditingTask(null);
    resetTaskForm();

    if (!shouldLoadProjectFromApi(currentProject.id)) return;

    try {
      if (editingId) {
        const previousStatus = editingTask?.status;
        const saved = await tasksApi.update(editingId, {
          title: optimisticTask.title,
          description: optimisticTask.description,
          assignedUserId: optimisticTask.assignedTo || null,
          sprint: optimisticTask.sprint ?? currentSprint,
        });
        let mapped = mapApiTaskToUi(saved, currentProject.id);
        if (previousStatus !== optimisticTask.status) {
          const statusRes = await tasksApi.updateStatus(editingId, optimisticTask.status);
          mapped = { ...mapped, status: apiTaskStatusToUi(statusRes.task.status) };
        }
        setProjectTasks((tasks) =>
          tasks.map((t) => (t.id === editingId ? mapped : t))
        );
      } else {
        const saved = await projectsApi.createTask(currentProject.id, {
          title: optimisticTask.title,
          description: optimisticTask.description,
          assignedUserId: optimisticTask.assignedTo || null,
          sprint: optimisticTask.sprint ?? currentSprint,
        });
        setProjectTasks((tasks) => [
          ...tasks.filter((t) => t.id !== optimisticTask.id),
          mapApiTaskToUi(saved, currentProject.id),
        ]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save task', err);
      setProjectTasks(previousTasks);
      const detail =
        err instanceof ApiError
          ? `[${err.status}] ${err.message}`
          : err instanceof Error
            ? err.message
            : 'Error desconocido';
      alert(`No se pudo guardar la tarea: ${detail}`);
    }
  };

  const openEditProjectModal = () => {
    setProjectForm({
      name: currentProject.name,
      description: currentProject.description,
      category: currentProject.category,
      difficulty: currentProject.difficulty,
      teamSize: currentProject.teamSize,
      estimatedDuration: currentProject.estimatedDuration,
    });
    setEditProjectOpen(true);
  };

  const handleSaveProject = async () => {
    if (!editableProject) return;

    const trimmedName = projectForm.name.trim();
    const trimmedDescription = projectForm.description.trim();
    if (!trimmedName) return;

    const localUpdates = {
      name: trimmedName,
      description: trimmedDescription,
      category: projectForm.category,
      difficulty: projectForm.difficulty,
      teamSize: projectForm.teamSize,
      estimatedDuration: projectForm.estimatedDuration,
    };

    if (!shouldLoadProjectFromApi(editableProject.id)) {
      setEditableProject({ ...editableProject, ...localUpdates });
      setEditProjectOpen(false);
      return;
    }

    try {
      const result = await projectsApi.update(editableProject.id, {
        title: trimmedName,
        description: trimmedDescription,
      });

      const apiProject = result.project ?? (await projectsApi.get(editableProject.id));
      const mapped = mapApiProjectToUi(apiProject, editableProject);
      setEditableProject({
        ...mapped,
        ...localUpdates,
        name: mapped.name,
        description: mapped.description,
      });
      setProjectForm({
        name: mapped.name,
        description: mapped.description,
        category: projectForm.category,
        difficulty: projectForm.difficulty,
        teamSize: projectForm.teamSize,
        estimatedDuration: projectForm.estimatedDuration,
      });
      setEditProjectOpen(false);
      window.dispatchEvent(new CustomEvent('teammatch:project-updated'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update project', err);
      alert('No se pudo guardar los cambios del proyecto. Revisa tu sesión.');
    }
  };

  const persistKanbanState = async (state: ApiProjectKanbanState) => {
    if (!shouldLoadProjectFromApi(currentProject.id) || !isProjectLeader) return;
    try {
      await projectsApi.updateKanbanState(currentProject.id, state);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist Kanban sprint state', err);
    }
  };

  const toggleSprint = () => {
    const maxSprint = projectTasks.reduce((max, t) => Math.max(max, t.sprint ?? 1), 1);
    const nextActive = !sprintActive;
    const nextSprint = nextActive ? Math.max(currentSprint, maxSprint) : currentSprint;
    setSprintActive(nextActive);
    if (nextActive) {
      setCurrentSprint(nextSprint);
    }
    void persistKanbanState({ sprintActive: nextActive, currentSprint: nextSprint });
  };

  const changeSprint = (nextSprint: number) => {
    const safe = Math.max(1, nextSprint);
    setCurrentSprint(safe);
    void persistKanbanState({ sprintActive, currentSprint: safe });
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>

      {shouldLoadProjectFromApi(currentProject.id) && !isProjectMember && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Vista previa del proyecto</p>
              <p className="text-sm text-muted-foreground">
                {pendingJoin
                  ? 'Tu solicitud de ingreso está pendiente de aprobación por el líder.'
                  : 'Solicita unirte al equipo. El líder validará tu solicitud en Alertas.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRequestJoin}
              disabled={isJoining || pendingJoin}
              variant={pendingJoin ? 'outline' : 'default'}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : pendingJoin ? (
                'Solicitud pendiente'
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Solicitar unirme
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold truncate">{currentProject.name}</h2>
                <Badge className={difficultyColors[currentProject.difficulty]}>
                  {currentProject.difficulty === 'hard' ? 'Difícil' : currentProject.difficulty === 'medium' ? 'Medio' : 'Fácil'}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{currentProject.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Inicio: {new Date(currentProject.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{currentProject.estimatedDuration} semanas</span>
                </div>
                <Badge variant="outline">{currentProject.category}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {currentProject.status === 'open' && !isUserInTeam && spotsLeft > 0 && (
                <Button size="lg" className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Unirme al Proyecto
                </Button>
              )}
              {isUserInTeam && !isProjectLeader && (
                <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => {
                  setTeamMembers((prev) => prev.filter(tm => tm.userId !== user?.id));
                }}>
                  Salir del proyecto
                </Button>
              )}
              {isProjectLeader && (
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={openEditProjectModal}>
                  Editar proyecto
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{effectiveTeamSize}/{currentProject.teamSize}</span>
            </div>
            <p className="text-sm text-muted-foreground">Miembros del Equipo</p>
            <Progress value={(effectiveTeamSize / currentProject.teamSize) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedTasks}/{projectTasks.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Tareas Completadas</p>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{currentProject.requiredRoles.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Roles Requeridos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-cyan-600" />
              <span className="text-2xl font-bold">{currentProject.estimatedDuration}</span>
            </div>
            <p className="text-sm text-muted-foreground">Semanas Estimadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="kanban">
            <Columns3 className="h-4 w-4 mr-2" />
            Tablero
          </TabsTrigger>
          <TabsTrigger value="roles">Roles Requeridos</TabsTrigger>
          <TabsTrigger value="skills">Habilidades</TabsTrigger>
          {currentProject.leaderId === user?.id && (
            <TabsTrigger value="suggestions">
              <Sparkles className="h-4 w-4 mr-2" />
              Sugerencias IA
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          {/* Leader */}
          <Card>
            <CardHeader>
              <CardTitle>Líder del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              {leader && (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-green-500 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">
                      {(leader.name ?? 'L').split(' ').filter(Boolean).map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{leader.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{leader.email}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm">{leader.rating}/5</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        • {leader.completedProjects} proyectos completados
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle>Miembros del Equipo</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{teamMembers.length} miembros</Badge>
                  {(isProjectLeader || isUserInTeam) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTeamModalOpen(true)}
                    >
                      <Users className="h-4 w-4 mr-1.5" />
                      Gestionar equipo
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {teamMembers.map((member) => {
                    const affinity = computeMemberAffinityScore(
                      member.user,
                      currentProject,
                      member.role
                    );
                    return (
                    <div key={member.userId} className="flex items-center justify-between p-4 rounded-lg border gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {member.user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{member.user.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                          <div className="mt-1.5">
                            <AffinityScoreBadge score={affinity.overallScore} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">
                          {member.tasksCompleted}/{member.totalTasks} tareas
                        </p>
                        <Progress 
                          value={member.totalTasks > 0 ? (member.tasksCompleted / member.totalTasks) * 100 : 0} 
                          className="w-24 h-1.5 mt-1"
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">El equipo aún no tiene miembros</p>
                  {isProjectLeader && (
                    <Button variant="outline" size="sm" onClick={() => setTeamModalOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Agregar miembros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {leader && (
            <TeamManagementModal
              open={teamModalOpen}
              onOpenChange={setTeamModalOpen}
              project={currentProject}
              leader={leader}
              members={teamMembers}
              onMembersChange={setTeamMembers}
              canManage={isProjectLeader}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          {!isProjectMember && shouldLoadProjectFromApi(currentProject.id) ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <p className="mb-4">El tablero Kanban solo está disponible para miembros del equipo.</p>
                <Button type="button" onClick={handleRequestJoin} disabled={isJoining || pendingJoin}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {pendingJoin ? 'Solicitud pendiente' : 'Solicitar unirme'}
                </Button>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Tablero Kanban</CardTitle>
                  <CardDescription>
                    {isProjectLeader
                      ? 'Como líder puedes crear tareas por sprint, asignarlas y aprobar o devolver las que están en revisión.'
                      : 'Puedes mover tus tareas: Pendiente → En progreso → En revisión. Solo el líder cambia el estado desde revisión.'}
                  </CardDescription>
                </div>
                {isProjectLeader && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={sprintActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleSprint}
                    >
                      <Zap className="h-4 w-4 mr-1.5" />
                      {sprintActive ? 'Sprint activo' : 'Iniciar sprint'}
                    </Button>
                    <Button type="button" size="sm" onClick={openNewTaskDialog}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Nueva tarea
                    </Button>
                  </div>
                )}
              </div>
              {sprintActive && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Sprint {currentSprint} activo
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeSprint(currentSprint - 1)}
                    disabled={currentSprint <= 1}
                  >
                    Sprint anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeSprint(currentSprint + 1)}
                  >
                    Siguiente sprint
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {projectTasks.length > 0 ? (
                <KanbanBoard
                  tasks={boardTasks}
                  onTasksChange={(updatedBoard) => {
                    if (!sprintActive) {
                      handleTasksChange(updatedBoard);
                      return;
                    }
                    const byId = new Map(updatedBoard.map((t) => [t.id, t]));
                    handleTasksChange(
                      projectTasks.map((t) =>
                        (t.sprint ?? 1) === currentSprint && byId.has(t.id) ? byId.get(t.id)! : t
                      )
                    );
                  }}
                  getAssigneeName={getAssigneeName}
                  canDrag={canDragTask}
                  canDrop={canDropTask}
                  onEditTask={isProjectLeader ? handleEditTask : undefined}
                  onDeleteTask={isProjectLeader ? async (taskId: string) => {
                    if (!window.confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return;
                    const previous = projectTasks;
                    setProjectTasks((prev) => prev.filter((t) => t.id !== taskId));
                    if (!isApiModeEnabled()) return;
                    try {
                      await tasksApi.delete(taskId);
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error('Failed to delete task', taskId, err);
                      setProjectTasks(previous);
                      alert('No se pudo eliminar la tarea.');
                    }
                  } : undefined}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Columns3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="mb-4">Este proyecto aún no tiene tareas en el tablero</p>
                  {isProjectLeader && (
                    <Button type="button" variant="outline" onClick={openNewTaskDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primera tarea
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles del Proyecto</CardTitle>
              <CardDescription>Posiciones necesarias para completar el proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentProject.requiredRoles.map((role) => (
                  <div key={role.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium mb-1">{role.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {role.requiredSkills.map((skill, idx) => (
                            <Badge key={idx} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!isUserInTeam && !isProjectMember && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            applyingRole === role.name || pendingRoles.includes(role.name)
                          }
                          onClick={() => void handleApplyToRole(role.name)}
                        >
                          {pendingRoles.includes(role.name)
                            ? 'Pendiente'
                            : applyingRole === role.name
                              ? 'Enviando…'
                              : 'Postular'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Habilidades Requeridas</CardTitle>
              <CardDescription>Competencias necesarias para el proyecto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {currentProject.requiredSkills.map((skill) => (
                  <div 
                    key={skill.id}
                    className="px-4 py-2 rounded-lg border bg-primary/5"
                  >
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Nivel: {skill.level === 'expert' ? 'Experto' : skill.level === 'advanced' ? 'Avanzado' : skill.level === 'intermediate' ? 'Intermedio' : 'Principiante'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {currentProject.leaderId === user?.id && (
          <TabsContent value="suggestions" className="space-y-4">
            <TeamProposals
              project={currentProject}
              currentMembers={currentMembersForProposals}
              onTeamAccepted={handleTeamAccepted}
              onTeamPersisted={reloadTeamFromApi}
            />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nombre</Label>
              <Input
                id="project-name"
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Descripción</Label>
              <Textarea
                id="project-description"
                rows={4}
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-category">Categoría</Label>
              <Input
                id="project-category"
                value={projectForm.category}
                onChange={(e) => setProjectForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select
                  value={projectForm.difficulty}
                  onValueChange={(v) =>
                    setProjectForm((f) => ({ ...f, difficulty: v as ProjectEditForm['difficulty'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-team-size">Tamaño del equipo</Label>
                <Input
                  id="project-team-size"
                  type="number"
                  min={1}
                  value={projectForm.teamSize}
                  onChange={(e) =>
                    setProjectForm((f) => ({ ...f, teamSize: Number(e.target.value) || 1 }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-duration">Duración estimada (semanas)</Label>
              <Input
                id="project-duration"
                type="number"
                min={1}
                value={projectForm.estimatedDuration}
                onChange={(e) =>
                  setProjectForm((f) => ({
                    ...f,
                    estimatedDuration: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditProjectOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveProject} disabled={!projectForm.name.trim()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Descripción</Label>
              <Textarea
                id="task-description"
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asignado a</Label>
                <Select
                  value={taskForm.assignedTo}
                  onValueChange={(v) => setTaskForm((f) => ({ ...f, assignedTo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskAssigneeOptions.map((uid) => (
                      <SelectItem key={uid} value={uid}>
                        {getAssigneeName(uid)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) =>
                    setTaskForm((f) => ({ ...f, priority: v as TaskForm['priority'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-sprint">Sprint</Label>
                <Input
                  id="task-sprint"
                  type="number"
                  min={1}
                  max={99}
                  value={taskForm.sprint}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      sprint: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Fecha límite</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(v) =>
                    setTaskForm((f) => ({ ...f, status: v as TaskStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in-progress">En progreso</SelectItem>
                    <SelectItem value="blocked">En revisión</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveTask} disabled={!taskForm.title.trim()}>
              {editingTask ? 'Guardar' : 'Crear tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
