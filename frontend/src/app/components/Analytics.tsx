import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  Brain, 
  Clock, 
  Target,
  Calendar,
  Award,
  Zap,
  Activity,
  BarChart3,
  Download,
  Sparkles
} from 'lucide-react';
import { 
  mockSubjects, 
  mockProductivityStats, 
  mockRecommendations,
  predictAcademicLoad 
} from '../lib/mockData';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function Analytics() {
  const tooltipContentStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
  };

  const avgFocusScore = mockProductivityStats.reduce((acc, stat) => acc + stat.focusScore, 0) / 
    mockProductivityStats.filter(s => s.hoursStudied > 0).length;
  const totalHours = mockProductivityStats.reduce((acc, stat) => acc + stat.hoursStudied, 0);
  const totalSessions = mockProductivityStats.reduce((acc, stat) => acc + stat.sessionsCompleted, 0);
  const totalDistractions = mockProductivityStats.reduce((acc, stat) => acc + stat.distractions, 0);

  // Calculate trends
  const recentStats = mockProductivityStats.slice(-3);
  const olderStats = mockProductivityStats.slice(-6, -3);
  const recentAvg = recentStats.reduce((acc, s) => acc + s.focusScore, 0) / recentStats.length;
  const olderAvg = olderStats.reduce((acc, s) => acc + s.focusScore, 0) / olderStats.length;
  const focusTrend = recentAvg - olderAvg;

  // Subject performance data
  const subjectPerformance = mockSubjects.map(subject => ({
    name: subject.name,
    progress: (subject.completedHours / subject.weeklyHours) * 100,
    difficulty: subject.difficulty === 'hard' ? 90 : subject.difficulty === 'medium' ? 60 : 30,
    efficiency: 70 + Math.random() * 25, // Mock efficiency
  }));

  // Time distribution
  const timeDistribution = mockSubjects.map(subject => ({
    name: subject.name,
    value: subject.completedHours,
    color: subject.color,
  }));

  // Radar chart data for study habits
  const studyHabitsData = [
    { habit: 'Consistencia', score: 85 },
    { habit: 'Concentración', score: avgFocusScore },
    { habit: 'Planificación', score: 78 },
    { habit: 'Organización', score: 82 },
    { habit: 'Productividad', score: 88 },
  ];

  const academicLoad = predictAcademicLoad(mockSubjects);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análisis de Productividad</h2>
          <p className="text-muted-foreground">Insights y estadísticas de tu rendimiento académico</p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${focusTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {focusTrend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(focusTrend).toFixed(1)}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Score de Concentración</p>
            <p className="text-3xl font-bold">{avgFocusScore.toFixed(0)}%</p>
            <Progress value={avgFocusScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Horas</p>
            <p className="text-3xl font-bold">{totalHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground mt-1">Últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Sesiones Completadas</p>
            <p className="text-3xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Racha Actual</p>
            <p className="text-3xl font-bold">7</p>
            <p className="text-xs text-muted-foreground mt-1">días consecutivos 🔥</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="habits">
            <Activity className="h-4 w-4 mr-2" />
            Hábitos de Estudio
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="h-4 w-4 mr-2" />
            Recomendaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {/* Focus Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Concentración</CardTitle>
              <CardDescription>Evolución de tu score de concentración esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockProductivityStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { weekday: 'short' })}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      contentStyle={tooltipContentStyle}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="focusScore" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                      name="Concentración"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Hours Study */}
            <Card>
              <CardHeader>
                <CardTitle>Horas de Estudio</CardTitle>
                <CardDescription>Distribución semanal de tiempo dedicado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockProductivityStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { weekday: 'short' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                        formatter={(value: number) => [`${value} horas`, 'Tiempo']}
                        contentStyle={tooltipContentStyle}
                      />
                      <Bar dataKey="hoursStudied" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Time Distribution by Subject */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Materia</CardTitle>
                <CardDescription>Tiempo dedicado a cada materia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={timeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {timeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} horas`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Materia</CardTitle>
              <CardDescription>Progreso y eficiencia en cada materia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectPerformance.map((subject, index) => {
                  const subjectData = mockSubjects[index];
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"
                          data-subject-color={subjectData.color}
                        >
                          <div className="subject-color-dot h-3 w-3 rounded-full" />
                          <span className="font-medium">{subject.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Progreso: {subject.progress.toFixed(0)}%
                          </span>
                          <span className="text-muted-foreground">
                            Eficiencia: {subject.efficiency.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Progress value={subject.progress} />
                        <Progress value={subject.efficiency} className="opacity-60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Study Habits Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Hábitos</CardTitle>
                <CardDescription>Evaluación multidimensional de tu estudio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={studyHabitsData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="habit" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Distractions Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Distracciones</CardTitle>
                <CardDescription>Identificación de patrones de interrupción</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockProductivityStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { weekday: 'short' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                        contentStyle={tooltipContentStyle}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="distractions" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--destructive))' }}
                        name="Distracciones"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Insight IA</p>
                  <p className="text-sm text-muted-foreground">
                    Tus niveles de distracción son más bajos durante las mañanas. Programa 
                    tus materias más difíciles entre 9:00 AM y 12:00 PM para maximizar tu concentración.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best Study Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Mejores Momentos para Estudiar
              </CardTitle>
              <CardDescription>Basado en tu historial de productividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                      <span className="text-white">🥇</span>
                    </div>
                    <div>
                      <p className="text-sm text-amber-900">Mejor Momento</p>
                      <p className="font-bold text-amber-900">9:00 - 12:00</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">
                    Score promedio: 92% • Mínimas distracciones
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
                      <span className="text-white">🥈</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Segundo Mejor</p>
                      <p className="font-bold text-gray-900">14:00 - 17:00</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Score promedio: 85% • Buena concentración
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-orange-100/50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-orange-400 flex items-center justify-center">
                      <span className="text-white">🥉</span>
                    </div>
                    <div>
                      <p className="text-sm text-orange-700">Tercer Mejor</p>
                      <p className="font-bold text-orange-900">19:00 - 21:00</p>
                    </div>
                  </div>
                  <p className="text-xs text-orange-600">
                    Score promedio: 78% • Concentración moderada
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {/* All AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Recomendaciones Personalizadas de IA
              </CardTitle>
              <CardDescription>
                Sugerencias basadas en análisis de tu rendimiento y hábitos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecommendations.map((rec) => {
                const priorityStyles = {
                  high: 'border-red-200 bg-red-50',
                  medium: 'border-amber-200 bg-amber-50',
                  low: 'border-blue-200 bg-blue-50',
                };
                const priorityBadge = {
                  high: { variant: 'destructive' as const, label: 'Alta Prioridad' },
                  medium: { variant: 'default' as const, label: 'Prioridad Media' },
                  low: { variant: 'secondary' as const, label: 'Baja Prioridad' },
                };

                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-lg border ${priorityStyles[rec.priority]}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge variant={priorityBadge[rec.priority].variant}>
                            {priorityBadge[rec.priority].label}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-90">{rec.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs opacity-70">
                        {new Date(rec.timestamp).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <Button size="sm" variant="outline">
                        Aplicar Sugerencia
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Academic Load Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Pronóstico de Carga Académica</CardTitle>
              <CardDescription>Predicción de tu carga de trabajo próximas semanas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {academicLoad.map((week, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{week.week}</div>
                    <div className="flex-1">
                      <Progress value={week.load} className="h-3" />
                    </div>
                    <div className="w-16 text-right">
                      <span className="font-bold">{week.load}%</span>
                    </div>
                    <Badge
                      variant={week.load >= 80 ? 'destructive' : week.load >= 60 ? 'default' : 'secondary'}
                    >
                      {week.load >= 80 ? 'Alta' : week.load >= 60 ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">💡 Recomendación Proactiva</p>
                <p className="text-sm text-muted-foreground">
                  La Semana 4 tendrá una carga muy alta debido al período de exámenes. 
                  Te sugerimos adelantar al menos 5 horas de estudio en las próximas 2 semanas 
                  para reducir el estrés durante los exámenes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
