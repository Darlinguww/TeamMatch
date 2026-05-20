import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Star,
  Clock,
  Target,
  ArrowRight,
  Sparkles,
  Award,
  CheckCircle2,
  UserCircle2
} from 'lucide-react';
import { mockProjects, mockTeamMembers, mockTasks } from '../lib/mockData';
import { Link } from 'react-router';
import { useAuth } from '../lib/authContext';

export function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const myProjects = mockProjects.filter(p =>
    mockTeamMembers.some(tm => tm.userId === user.id && tm.projectId === p.id)
  );

  const myTasks = mockTasks.filter(t => t.assignedTo === user.id);
  const pendingTasks = myTasks.filter(t => t.status !== 'completed').length;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;

  const openProjects = mockProjects.filter(p => p.status === 'open');
  const recommendedProjects = openProjects.slice(0, 3);

  const advancedSkills = user.skills?.filter(
    s => s.level === 'advanced' || s.level === 'expert'
  ).length ?? 0;

  const skillCount = user.skills?.length ?? 0;
  const hoursPerWeek = user.availability?.hoursPerWeek ?? 0;
  const rating = user.rating ?? 0;
  const completedProjects = user.completedProjects ?? 0;

  // Profile completeness indicator for new users with empty profiles
  const isProfileEmpty = skillCount === 0 && !user.bio;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-green-500/10 to-cyan-500/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              ¡Hola, {user.name}! 👋
            </h2>
            <p className="text-muted-foreground mb-4">
              {pendingTasks > 0 || myProjects.length > 0
                ? `Tienes ${pendingTasks} tareas pendientes y ${myProjects.length} proyectos activos`
                : 'Bienvenido a TeamMatch. ¡Explora proyectos y forma tu equipo!'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {rating > 0 && (
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                  <Star className="h-3 w-3 fill-current" />
                  <span>Rating: {rating}/5</span>
                </div>
              )}
              {completedProjects > 0 && (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  <Award className="h-3 w-3" />
                  <span>{completedProjects} proyectos completados</span>
                </div>
              )}
              {isProfileEmpty && (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <UserCircle2 className="h-3 w-3" />
                  <span>Completa tu perfil para mejores matches</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile incomplete nudge */}
      {isProfileEmpty && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Tu perfil está vacío</p>
              <p className="text-xs text-muted-foreground">Agrega habilidades y disponibilidad para que el motor de IA pueda encontrarte proyectos compatibles.</p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/profile">Completar perfil</Link>
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Proyectos Activos</p>
                <p className="text-2xl font-bold">{myProjects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas Completadas</p>
                <p className="text-2xl font-bold">
                  {myTasks.length > 0 ? `${completedTasks}/${myTasks.length}` : '—'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            {myTasks.length > 0 && (
              <Progress value={(completedTasks / myTasks.length) * 100} className="mt-3" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Habilidades</p>
                <p className="text-2xl font-bold">{skillCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {skillCount === 0
                ? <Link to="/profile" className="text-primary hover:underline">Agregar habilidades →</Link>
                : `${advancedSkills} avanzadas`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponibilidad</p>
                <p className="text-2xl font-bold">
                  {hoursPerWeek > 0 ? `${hoursPerWeek}h` : '—'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {hoursPerWeek > 0 ? 'por semana' : (
                <Link to="/profile" className="text-primary hover:underline">Definir disponibilidad →</Link>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Mis Tareas Pendientes
            </CardTitle>
            <CardDescription>Tareas asignadas en tus proyectos activos</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.filter(t => t.status !== 'completed').length > 0 ? (
              <div className="space-y-3">
                {myTasks.filter(t => t.status !== 'completed').map((task) => {
                  const project = mockProjects.find(p => p.id === task.projectId);
                  const priorityColors = {
                    high: 'bg-red-100 text-red-700',
                    medium: 'bg-amber-100 text-amber-700',
                    low: 'bg-blue-100 text-blue-700',
                  };

                  return (
                    <div key={task.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{task.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {project?.name}
                            </Badge>
                            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                              {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          Vence: {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1">
                          {task.status === 'pending' ? 'Iniciar' : 'Continuar'}
                        </Button>
                        <Button size="sm" variant="outline">
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {myTasks.length === 0
                    ? 'Únete a un proyecto para ver tus tareas aquí'
                    : '¡Todo al día! No tienes tareas pendientes'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Mis Proyectos
            </CardTitle>
            <CardDescription>Equipos en los que participas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myProjects.map((project) => {
                const teamMember = mockTeamMembers.find(tm =>
                  tm.userId === user.id && tm.projectId === project.id
                );
                const progress = teamMember
                  ? (teamMember.tasksCompleted / teamMember.totalTasks) * 100
                  : 0;

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium mb-1">{project.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {teamMember?.role}
                        </Badge>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progreso</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </Link>
                );
              })}
              {myProjects.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Aún no eres parte de ningún equipo
                  </p>
                  <Button asChild size="sm">
                    <Link to="/projects">Explorar Proyectos</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Projects */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Proyectos Recomendados para Ti
          </CardTitle>
          <CardDescription>
            {skillCount > 0
              ? 'Basado en tus habilidades y experiencia'
              : 'Completa tu perfil para recibir recomendaciones personalizadas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendedProjects.map((project) => {
              const matchScore = skillCount > 0
                ? 75 + Math.floor(Math.random() * 20)
                : null;

              return (
                <div key={project.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    {matchScore ? (
                      <Badge className="bg-primary/10 text-primary">
                        {matchScore}% Match
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Sin perfil
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {project.difficulty === 'hard' ? 'Difícil' : project.difficulty === 'medium' ? 'Medio' : 'Fácil'}
                    </Badge>
                  </div>
                  <h4 className="font-medium mb-2">{project.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{project.currentTeamSize}/{project.teamSize} miembros</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{project.estimatedDuration} semanas</span>
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <Link to={`/projects/${project.id}`}>
                      Ver Detalles
                      <ArrowRight className="h-3 w-3 ml-2" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/projects">
                Ver Todos los Proyectos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}