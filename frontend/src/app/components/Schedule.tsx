import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Brain,
  TrendingUp
} from 'lucide-react';
import { mockSubjects, generateAISchedule, predictAcademicLoad, type StudySession } from '../lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function SessionCard({ session, color }: { session: StudySession; color: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && color) ref.current.style.setProperty('--session-color', color);
  }, [color]);
  return (
    <div ref={ref} className="session-card p-2 rounded-lg border text-xs">
      <div className="font-medium mb-1">{session.subjectName}</div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{session.startTime}</span>
      </div>
      <div className="text-muted-foreground">{session.duration} min</div>
      <Badge variant="outline" className="text-xs mt-1 capitalize">
        {session.type.replace('-', ' ')}
      </Badge>
    </div>
  );
}

export function Schedule() {
  const [aiSchedule, setAiSchedule] = useState<StudySession[]>(generateAISchedule(mockSubjects));
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerateSchedule = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setAiSchedule(generateAISchedule(mockSubjects));
      setIsGenerating(false);
    }, 1500);
  };

  const academicLoadData = predictAcademicLoad(mockSubjects);

  // Get sessions for current week
  const today = new Date('2026-03-14');
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + currentWeek * 7);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  const sessionsThisWeek = aiSchedule.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= weekDays[0] && sessionDate <= weekDays[6];
  });

  const totalHoursThisWeek = sessionsThisWeek.reduce((acc, s) => acc + s.duration, 0) / 60;

  // Chart data for weekly distribution
  const weeklyDistribution = weekDays.map(day => {
    const dayStr = day.toISOString().split('T')[0];
    const sessions = aiSchedule.filter(s => s.date === dayStr);
    const hours = sessions.reduce((acc, s) => acc + s.duration, 0) / 60;
    return {
      day: day.toLocaleDateString('es-ES', { weekday: 'short' }),
      hours: parseFloat(hours.toFixed(1)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Horario Inteligente</h2>
          <p className="text-muted-foreground">Generado automáticamente por IA</p>
        </div>
        <Button 
          onClick={handleRegenerateSchedule}
          disabled={isGenerating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generando...' : 'Regenerar Horario'}
        </Button>
      </div>

      {/* AI Optimization Notice */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">Optimizado por IA</h3>
              <p className="text-sm text-muted-foreground">
                Este horario ha sido generado considerando tus exámenes próximos, la dificultad de 
                cada materia y tus patrones de productividad. Las materias más difíciles están 
                programadas en tus mejores horarios.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{totalHoursThisWeek.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">esta semana</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Vista Semanal
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Análisis de Carga
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(currentWeek - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <div className="text-center">
              <p className="font-medium">
                {weekDays[0].toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })} - 
                {' '}{weekDays[6].toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentWeek === 0 ? 'Esta semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(currentWeek + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid gap-4 md:grid-cols-7">
            {weekDays.map((day, dayIndex) => {
              const dayStr = day.toISOString().split('T')[0];
              const daySessions = aiSchedule.filter(s => s.date === dayStr);
              const isToday = dayStr === '2026-03-14';

              return (
                <Card key={dayIndex} className={isToday ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">
                      {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {day.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {isToday && (
                        <Badge variant="default" className="ml-2 text-xs">Hoy</Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {daySessions.length > 0 ? (
                      daySessions.map((session) => {
                        const subject = mockSubjects.find(s => s.id === session.subjectId);
                        return (
                          <SessionCard key={session.id} session={session} color={subject?.color} />
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Sin sesiones
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Weekly Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución Semanal</CardTitle>
              <CardDescription>Horas de estudio por día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} horas`, 'Horas']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Academic Load Prediction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Predicción de Carga Académica
              </CardTitle>
              <CardDescription>
                Proyección basada en tus exámenes y dificultad de materias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={academicLoadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="load" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {academicLoadData.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{week.week}</p>
                      <p className="text-sm text-muted-foreground">
                        {week.subjects.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{week.load}%</p>
                        <p className="text-xs text-muted-foreground">Carga</p>
                      </div>
                      <Badge
                        variant={week.load >= 80 ? 'destructive' : week.load >= 60 ? 'default' : 'secondary'}
                      >
                        {week.load >= 80 ? 'Alta' : week.load >= 60 ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Study Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones de Planificación</CardTitle>
              <CardDescription>Consejos personalizados de la IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">📚 Distribución Equilibrada</p>
                <p className="text-sm text-blue-700">
                  Tu horario está bien distribuido a lo largo de la semana, evitando días sobrecargados.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-1">⚠️ Pico de Carga - Semana 4</p>
                <p className="text-sm text-amber-700">
                  La carga aumentará significativamente durante el período de exámenes. Considera adelantar 
                  algunos temas en las próximas 2 semanas.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-900 mb-1">✅ Materias Prioritarias</p>
                <p className="text-sm text-green-700">
                  Cálculo y Física tienen mayor prioridad por sus exámenes próximos y están programadas 
                  en tus mejores horarios de productividad.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
