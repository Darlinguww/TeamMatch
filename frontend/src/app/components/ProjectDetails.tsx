import { useEffect, useState } from 'react';
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
  UserPlus, Star, Calendar, CheckCircle2, Columns3
} from 'lucide-react';
import { mockProjects, mockUsers, mockTeamMembers, mockTasks, type Project, type Task, type TaskStatus } from '../lib/mockData';
import { TeamProposals, type TeamProposal } from './TeamProposals';
import { KanbanBoard } from './KanbanBoard';
import { getStoredToken } from '../lib/apiClient';
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

  useEffect(() => {
    if (project) {
      setEditableProject(project);
      setProjectTasks(mockTasks.filter(t => t.projectId === project.id));
      setTeamMembers(
        mockTeamMembers
          .filter((tm) => tm.projectId === project.id)
          .map((tm) => ({
            ...tm,
            user: mockUsers.find((u) => u.id === tm.userId)!,
          }))
          .filter((tm) => tm.user)
      );
      setProjectForm({
        name: project.name,
        description: project.description,
        category: project.category,
        difficulty: project.difficulty,
        teamSize: project.teamSize,
        estimatedDuration: project.estimatedDuration,
      });
      setSprintActive(false);
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Proyecto no encontrado</h2>
        <Button asChild>
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proyectos
          </Link>
        </Button>
      </div>
    );
  }

  const currentProject = editableProject ?? project!;
  const leader = mockUsers.find(u => u.id === currentProject.leaderId);
  const isProjectLeader = currentProject.leaderId === user?.id;

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

  const getAssigneeName = (userId: string) =>
    mockUsers.find(u => u.id === userId)?.name ?? 'Sin asignar';

  const isUserInTeam =
    isProjectLeader || teamMembers.some((tm) => tm.userId === user?.id);
  const effectiveTeamSize = 1 + teamMembers.length;
  const spotsLeft = currentProject.teamSize - effectiveTeamSize;

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
    setTeamMembers(newMembers);
  };

  // Persist task status changes to backend when Kanban updates
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

    // Confirm when moving a task into "En revisión" because that is a permanent review phase.
    for (const task of changed) {
      const previous = prev.find(pt => pt.id === task.id);
      if (previous && previous.status !== 'blocked' && task.status === 'blocked') {
        const confirmed = window.confirm('¿Estás seguro de pasar esta tarea a En revisión? No podrás revertirla fácilmente desde el tablero.');
        if (!confirmed) {
          setProjectTasks(prev);
          return;
        }
      }
    }

    setProjectTasks(newTasks);

    const token = getStoredToken();
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (const t of changed) {
      try {
        await fetch(`http://localhost:3000/tasks/${t.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: t.status }) });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist task status', t.id, err);
      }
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
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    const nextTask: Task = {
      id: editingTask?.id ?? `task_${Date.now()}`,
      projectId: currentProject.id,
      title: taskForm.title,
      description: taskForm.description,
      assignedTo: taskForm.assignedTo,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      status: taskForm.status,
      createdDate: editingTask?.createdDate ?? new Date().toISOString(),
    };

    const nextTasks = editingTask
      ? projectTasks.map((t) => (t.id === editingTask.id ? nextTask : t))
      : [...projectTasks, nextTask];

    setProjectTasks(nextTasks);
    setTaskDialogOpen(false);
    setEditingTask(null);
    resetTaskForm();

    const token = getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      if (editingTask) {
        await fetch(`http://localhost:3000/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(nextTask),
        });
      } else {
        await fetch(`http://localhost:3000/projects/${currentProject.id}/tasks`, {
          method: 'POST',
          headers,
          body: JSON.stringify(nextTask),
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save task', err);
    }
  };

  const handleSaveProject = () => {
    if (!editableProject) return;
    setEditableProject({
      ...editableProject,
      name: projectForm.name,
      description: projectForm.description,
      category: projectForm.category,
      difficulty: projectForm.difficulty,
      teamSize: projectForm.teamSize,
      estimatedDuration: projectForm.estimatedDuration,
    });
    setEditProjectOpen(false);
  };

  const toggleSprint = () => {
    setSprintActive((prev) => !prev);
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
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => setEditProjectOpen(true)}>
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
                      {leader.name.split(' ').map(n => n[0]).join('')}
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
          <Card>
            <CardHeader>
              <CardTitle>Tablero Kanban</CardTitle>
              <CardDescription>
                Arrastra las tareas entre columnas para actualizar su estado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projectTasks.length > 0 ? (
                <KanbanBoard
                  tasks={projectTasks}
                  onTasksChange={handleTasksChange}
                  getAssigneeName={getAssigneeName}
                  canDrag={(task) => {
                    if (!user) return false;
                    return isProjectLeader;
                  }}
                  onDeleteTask={isProjectLeader ? async (taskId: string) => {
                    if (!confirm('¿Eliminar esta tarea? Esta acción no se puede deshacer.')) return;
                    setProjectTasks(prev => prev.filter(t => t.id !== taskId));
                    const token = getStoredToken();
                    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    try {
                      await fetch(`http://localhost:3000/tasks/${taskId}`, { method: 'DELETE', headers });
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error('Failed to delete task', taskId, err);
                    }
                  } : undefined}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Columns3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Este proyecto aún no tiene tareas en el tablero</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                      {!isUserInTeam && currentProject.status === 'open' && (
                        <Button size="sm">Postular</Button>
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
            <TeamProposals project={currentProject} onTeamAccepted={handleTeamAccepted} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}