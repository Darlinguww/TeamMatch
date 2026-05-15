import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Briefcase, 
  Search, 
  Users,
  Clock,
  Filter,
  Sparkles,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { mockProjects, currentUser, generateTeamSuggestions } from '../lib/mockData';
import { Link } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function Projects() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in-progress' | 'completed'>('all');

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || project.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus;
  });

  const openProjects = filteredProjects.filter(p => p.status === 'open');
  const inProgressProjects = filteredProjects.filter(p => p.status === 'in-progress');

  const categories = ['all', ...new Set(mockProjects.map(p => p.category))];

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-red-100 text-red-700',
  };

  const difficultyLabels = {
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
  };

  const statusColors = {
    open: 'bg-green-100 text-green-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  const statusLabels = {
    open: 'Abierto',
    'in-progress': 'En Progreso',
    completed: 'Completado',
  };

  const calculateMatchScore = (projectId: string): number => {
    // Mock calculation based on user skills
    const project = mockProjects.find(p => p.id === projectId);
    if (!project) return 0;

    const userSkillNames = currentUser.skills.map(s => s.name.toLowerCase());
    const requiredSkillNames = project.requiredSkills.map(s => s.name.toLowerCase());
    
    const matchingSkills = userSkillNames.filter(skill => 
      requiredSkillNames.some(required => required.includes(skill) || skill.includes(required))
    );

    return Math.min(Math.round((matchingSkills.length / requiredSkillNames.length) * 100), 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Explorar Proyectos</h2>
          <p className="text-muted-foreground">Encuentra el equipo perfecto para ti</p>
        </div>
        <Button>
          <Briefcase className="h-4 w-4 mr-2" />
          Crear Proyecto
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proyectos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dificultad</label>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Abiertos</SelectItem>
                    <SelectItem value="in-progress">En Progreso</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({filteredProjects.length})
          </TabsTrigger>
          <TabsTrigger value="open">
            <Sparkles className="h-4 w-4 mr-2" />
            Disponibles ({openProjects.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            En Progreso ({inProgressProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ProjectList 
            projects={filteredProjects}
            calculateMatchScore={calculateMatchScore}
            difficultyColors={difficultyColors}
            difficultyLabels={difficultyLabels}
            statusColors={statusColors}
            statusLabels={statusLabels}
          />
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          <ProjectList 
            projects={openProjects}
            calculateMatchScore={calculateMatchScore}
            difficultyColors={difficultyColors}
            difficultyLabels={difficultyLabels}
            statusColors={statusColors}
            statusLabels={statusLabels}
          />
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <ProjectList 
            projects={inProgressProjects}
            calculateMatchScore={calculateMatchScore}
            difficultyColors={difficultyColors}
            difficultyLabels={difficultyLabels}
            statusColors={statusColors}
            statusLabels={statusLabels}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectList({ 
  projects, 
  calculateMatchScore,
  difficultyColors,
  difficultyLabels,
  statusColors,
  statusLabels
}: { 
  projects: any[];
  calculateMatchScore: (id: string) => number;
  difficultyColors: any;
  difficultyLabels: any;
  statusColors: any;
  statusLabels: any;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const matchScore = calculateMatchScore(project.id);
        const spotsLeft = project.teamSize - project.currentTeamSize;

        return (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className={statusColors[project.status]}>
                  {statusLabels[project.status]}
                </Badge>
                {project.status === 'open' && matchScore > 60 && (
                  <Badge className="bg-primary/10 text-primary">
                    {matchScore}% Match
                  </Badge>
                )}
              </div>
              <CardTitle className="line-clamp-1">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{project.currentTeamSize}/{project.teamSize} miembros</span>
                  </div>
                  <Badge className={difficultyColors[project.difficulty]}>
                    {difficultyLabels[project.difficulty]}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{project.estimatedDuration} semanas</span>
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {project.category}
                    </Badge>
                  </div>
                </div>

                {project.status === 'open' && spotsLeft > 0 && (
                  <div className="p-2 rounded bg-green-50 border border-green-200 text-xs text-green-700">
                    {spotsLeft} {spotsLeft === 1 ? 'lugar disponible' : 'lugares disponibles'}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Habilidades requeridas:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.requiredSkills.slice(0, 3).map((skill: any) => (
                      <Badge key={skill.id} variant="outline" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                    {project.requiredSkills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.requiredSkills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button asChild className="w-full">
                  <Link to={`/projects/${project.id}`}>
                    Ver Detalles
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {projects.length === 0 && (
        <div className="col-span-full text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No se encontraron proyectos</p>
        </div>
      )}
    </div>
  );
}
