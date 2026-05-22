import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  Loader2,
} from 'lucide-react';
import {
  currentUser,
  mockProjects,
  mockTeamMembers,
  mockTasks,
  mockUsers,
  type Project,
  type Task,
} from '../lib/mockData';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../lib/authContext';
import { isApiModeEnabled, loadDashboardProjectData, projectsApi } from '../lib/projectApi';

type TeamMembership = {
  role: string;
  tasksCompleted: number;
  totalTasks: number;
  rating?: number;
};

type ProjectWithMembership = Project & { membership: TeamMembership };

export function MyTeams() {
  const { user } = useAuth();
  const location = useLocation();
  const apiMode = isApiModeEnabled();
  const effectiveUser = apiMode ? user : currentUser;

  const [apiProjects, setApiProjects] = useState<ProjectWithMembership[]>([]);
  const [apiMyTasks, setApiMyTasks] = useState<Task[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiMode || !effectiveUser?.id) {
      setApiProjects([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingApi(true);
      setApiError(null);
      try {
        const { projects: apiProjects } = await projectsApi.list();
        if (cancelled) return;

        const { projects, progressByProject, myTasks } = await loadDashboardProjectData(
          apiProjects,
          effectiveUser.id
        );

        const mapped = projects.map((project) => {
          const isLeader = project.leaderId === effectiveUser.id;
          const stats = progressByProject[project.id] ?? { completed: 0, total: 0, percent: 0 };
          return {
            ...project,
            status: project.status === 'open' && isLeader ? 'in-progress' : project.status,
            membership: {
              role: isLeader ? 'Líder' : 'Miembro',
              tasksCompleted: stats.completed,
              totalTasks: stats.total,
            },
          } satisfies ProjectWithMembership;
        });

        setApiProjects(mapped);
        setApiMyTasks(myTasks);
      } catch (error) {
        if (!cancelled) {
          setApiError(error instanceof Error ? error.message : 'No se pudieron cargar tus equipos');
          setApiProjects([]);
        }
      } finally {
        if (!cancelled) setLoadingApi(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiMode, effectiveUser?.id, location.pathname]);

  const myTeamMemberships = apiMode ? [] : mockTeamMembers.filter((tm) => tm.userId === effectiveUser?.id);
  const mockProjectsWithMembership: ProjectWithMembership[] = apiMode
    ? []
    : myTeamMemberships.map((tm) => ({
        ...mockProjects.find((p) => p.id === tm.projectId)!,
        membership: tm,
      }));

  const myProjects = apiMode ? apiProjects : mockProjectsWithMembership;

  const activeProjects = myProjects.filter((p) => p.status === 'in-progress' || p.status === 'open');
  const completedProjects = myProjects.filter((p) => p.status === 'completed');

  if (apiMode && loadingApi) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        <p>Cargando tus equipos…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mis Equipos</h2>
          <p className="text-muted-foreground">Proyectos en los que colaboras</p>
        </div>
      </div>

      {apiError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {apiError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{activeProjects.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Proyectos Activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedProjects.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Proyectos Completados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">
                {apiMode
                  ? apiProjects.reduce((acc, p) => acc + p.membership.tasksCompleted, 0)
                  : myTeamMemberships.reduce((acc, tm) => acc + tm.tasksCompleted, 0)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Tareas Completadas</p>
          </CardContent>
        </Card>
      </div>

      {activeProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Activos</CardTitle>
            <CardDescription>Equipos en los que estás trabajando actualmente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeProjects.map((project) => {
                const progress =
                  project.membership.totalTasks > 0
                    ? (project.membership.tasksCompleted / project.membership.totalTasks) * 100
                    : 0;
                const teamMembers = apiMode
                  ? []
                  : mockTeamMembers
                      .filter((tm) => tm.projectId === project.id)
                      .map((tm) => mockUsers.find((u) => u.id === tm.userId)!);
                const projectTasks = apiMode
                  ? []
                  : mockTasks.filter((t) => t.projectId === project.id);
                const myTasks = apiMode
                  ? apiMyTasks.filter((t) => t.projectId === project.id)
                  : projectTasks.filter((t) => t.assignedTo === effectiveUser?.id);
                const pendingTasks = myTasks.filter((t) => t.status !== 'completed');

                return (
                  <Card key={project.id} className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{project.name}</h3>
                            <Badge variant="outline">{project.membership.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>
                                {apiMode
                                  ? `${project.currentTeamSize}/${project.teamSize} miembros`
                                  : `${teamMembers.length} miembros`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{project.estimatedDuration} semanas</span>
                            </div>
                            {project.categories.map((c) => (
                              <Badge key={c} variant="outline">{c}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button asChild>
                          <Link to={`/projects/${project.id}`}>
                            Ver Proyecto
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-2">Progreso del proyecto</p>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl font-bold">{progress.toFixed(0)}%</span>
                              <span className="text-sm text-muted-foreground">
                                {project.membership.tasksCompleted}/{project.membership.totalTasks}
                              </span>
                            </div>
                            <Progress value={progress} />
                          </div>

                          <div className="p-4 rounded-lg bg-muted/50">
                            <p className="text-sm text-muted-foreground mb-2">Tareas Pendientes</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold">{pendingTasks.length}</span>
                              <Badge variant={pendingTasks.length > 3 ? 'destructive' : 'secondary'}>
                                {pendingTasks.length > 3 ? 'Alta carga' : 'Normal'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {pendingTasks.length > 0
                                ? `${pendingTasks.filter((t) => t.priority === 'high').length} de alta prioridad`
                                : '¡Todo al día!'}
                            </p>
                          </div>

                          {!apiMode && (
                            <div className="p-4 rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground mb-2">Equipo</p>
                              <div className="flex -space-x-2 mb-2">
                                {teamMembers.slice(0, 4).map((member) => (
                                  <div
                                    key={member.id}
                                    className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"
                                    title={member.name}
                                  >
                                    <span className="text-xs text-primary font-medium">
                                      {member.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">{teamMembers.length} colaboradores</p>
                            </div>
                          )}
                        </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proyectos Completados</CardTitle>
            <CardDescription>Tu historial de colaboraciones exitosas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {completedProjects.map((project) => (
                <Card key={project.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium mb-1">{project.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {project.membership.role}
                        </Badge>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>{project.membership.tasksCompleted} tareas</span>
                      {project.membership.rating && (
                        <div className="flex items-center gap-1">
                          <span>Rating: {project.membership.rating}/5</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/projects/${project.id}`}>Ver Detalles</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {myProjects.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Aún no eres parte de ningún equipo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explora proyectos disponibles o crea uno nuevo para formar tu equipo
            </p>
            <Button asChild>
              <Link to="/projects">
                Explorar Proyectos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
