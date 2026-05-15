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
  CheckCircle2
} from 'lucide-react';
import { currentUser, mockProjects, mockTeamMembers, mockTasks, mockUsers } from '../lib/mockData';
import { Link } from 'react-router';

export function Dashboard() {
  const myProjects = mockProjects.filter(p => 
    mockTeamMembers.some(tm => tm.userId === currentUser.id && tm.projectId === p.id)
  );
  
  const myTasks = mockTasks.filter(t => t.assignedTo === currentUser.id);
  const pendingTasks = myTasks.filter(t => t.status !== 'completed').length;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;

  const openProjects = mockProjects.filter(p => p.status === 'open');

  // Calculate recommended matches
  const recommendedProjects = openProjects.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-green-500/10 to-cyan-500/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              ¡Hola, {currentUser.name}! 👋
            </h2>
            <p className="text-muted-foreground mb-4">
              Tienes {pendingTasks} tareas pendientes y {myProjects.length} proyectos activos
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm">
                <Star className="h-3 w-3 fill-current" />
                <span>Rating: {currentUser.rating}/5</span>
              </div>
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                <Award className="h-3 w-3" />
                <span>{currentUser.completedProjects} proyectos completados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <p className="text-2xl font-bold">{completedTasks}/{myTasks.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={(completedTasks / myTasks.length) * 100} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Habilidades</p>
                <p className="text-2xl font-bold">{currentUser.skills.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {currentUser.skills.filter(s => s.level === 'advanced' || s.level === 'expert').length} avanzadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponibilidad</p>
                <p className="text-2xl font-bold">{currentUser.availability.hoursPerWeek}h</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">por semana</p>
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
                <p className="text-muted-foreground">¡Todo al día! No tienes tareas pendientes</p>
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
                  tm.userId === currentUser.id && tm.projectId === project.id
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
            Basado en tus habilidades y experiencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendedProjects.map((project) => {
              const matchScore = 75 + Math.floor(Math.random() * 20); // Mock score
              
              return (
                <div key={project.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-primary/10 text-primary">
                      {matchScore}% Match
                    </Badge>
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
