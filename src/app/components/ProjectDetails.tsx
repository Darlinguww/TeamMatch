import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, Users, Clock, Target, Sparkles,
  UserPlus, Star, Calendar, CheckCircle2, Columns3
} from 'lucide-react';
import { mockProjects, mockUsers, mockTeamMembers, mockTasks, type Task } from '../lib/mockData';
import { TeamProposals, type TeamProposal } from './TeamProposals';
import { KanbanBoard } from './KanbanBoard';
import {
  TeamManagementModal,
  type TeamMemberWithUser,
} from './TeamManagementModal';
import { useAuth } from '../lib/authContext';
import { computeMemberAffinityScore } from '../lib/affinityScore';
import { AffinityScoreBadge } from './AffinityScore';

export function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const project = mockProjects.find(p => p.id === id);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithUser[]>([]);

  useEffect(() => {
    if (project) {
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

  const leader = mockUsers.find(u => u.id === project.leaderId);
  const isProjectLeader = project.leaderId === user?.id;

  const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
  const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0;

  const getAssigneeName = (userId: string) =>
    mockUsers.find(u => u.id === userId)?.name ?? 'Sin asignar';

  const isUserInTeam =
    isProjectLeader || teamMembers.some((tm) => tm.userId === user?.id);
  const effectiveTeamSize = 1 + teamMembers.length;
  const spotsLeft = project.teamSize - effectiveTeamSize;

  const handleTeamAccepted = (proposal: TeamProposal) => {
    const newMembers: TeamMemberWithUser[] = proposal.members.map((ms) => ({
      userId: ms.user.id,
      projectId: project.id,
      role: ms.role,
      joinedDate: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      totalTasks: 0,
      user: ms.user,
    }));
    setTeamMembers(newMembers);
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-3xl font-bold">{project.name}</h2>
                <Badge className={difficultyColors[project.difficulty]}>
                  {project.difficulty === 'hard' ? 'Difícil' : project.difficulty === 'medium' ? 'Medio' : 'Fácil'}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{project.description}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Inicio: {new Date(project.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{project.estimatedDuration} semanas</span>
                </div>
                <Badge variant="outline">{project.category}</Badge>
              </div>
            </div>
            {!isUserInTeam && project.status === 'open' && spotsLeft > 0 && (
              <Button size="lg" className="ml-4">
                <UserPlus className="h-4 w-4 mr-2" />
                Unirme al Proyecto
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{effectiveTeamSize}/{project.teamSize}</span>
            </div>
            <p className="text-sm text-muted-foreground">Miembros del Equipo</p>
            <Progress value={(effectiveTeamSize / project.teamSize) * 100} className="mt-2" />
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
              <span className="text-2xl font-bold">{project.requiredRoles.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Roles Requeridos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-cyan-600" />
              <span className="text-2xl font-bold">{project.estimatedDuration}</span>
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
          {project.leaderId === user?.id && (
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
                      project,
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
              project={project}
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
                  onTasksChange={setProjectTasks}
                  getAssigneeName={getAssigneeName}
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
                {project.requiredRoles.map((role) => (
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
                      {!isUserInTeam && project.status === 'open' && (
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
                {project.requiredSkills.map((skill) => (
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

        {project.leaderId === user?.id && (
          <TabsContent value="suggestions" className="space-y-4">
            <TeamProposals project={project} onTeamAccepted={handleTeamAccepted} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}