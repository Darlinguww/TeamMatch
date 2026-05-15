import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Brain, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings,
  Volume2,
  VolumeX,
  Coffee,
  CheckCircle2,
  Timer,
  Ban
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { mockSubjects, mockStudySessions } from '../lib/mockData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

function SubjectDot({ color, className }: { color: string | undefined; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && color) {
      ref.current.style.setProperty('--subject-color', color);
    }
  }, [color]);
  return <div ref={ref} className={`subject-color-dot ${className}`} />;
}

function SubjectIconBg({ color, children }: { color: string | undefined; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && color) {
      ref.current.style.setProperty('--icon-bg', `${color}20`);
    }
  }, [color]);
  return (
    <div ref={ref} className="subject-icon-bg h-10 w-10 rounded-lg flex items-center justify-center">
      {children}
    </div>
  );
}

export function FocusMode() {
  const [selectedSubject, setSelectedSubject] = useState(mockSubjects[0].id);
  const [duration, setDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [distractionsBlocked, setDistractionsBlocked] = useState(0);
  
  // Settings
  const [breakDuration, setBreakDuration] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blockDistractions, setBlockDistractions] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsActive(false);
            setCompletedSessions((prev) => prev + 1);
            if (soundEnabled) {
              // Play completion sound (simulated)
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);

      // Simulate blocking distractions
      if (blockDistractions) {
        const distractionInterval = setInterval(() => {
          setDistractionsBlocked((prev) => prev + 1);
        }, 15000); // Simulate blocking a distraction every 15 seconds

        return () => {
          if (interval) clearInterval(interval);
          clearInterval(distractionInterval);
        };
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, timeLeft, soundEnabled, blockDistractions]);

  const handleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(duration * 60);
    }
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(duration * 60);
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (!isActive) {
      setTimeLeft(newDuration * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100;
  const currentSubject = mockSubjects.find(s => s.id === selectedSubject);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Modo Concentración</h2>
        <p className="text-muted-foreground">
          Mantén el foco y elimina distracciones con temporizador Pomodoro
        </p>
      </div>

      {/* Main Timer Card */}
      <Card className={`border-2 ${isActive && !isPaused ? 'border-primary focus-mode-active' : ''}`}>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Subject Selection */}
            <div className="flex items-center justify-center gap-4">
              <SubjectDot color={currentSubject?.color} className="h-4 w-4 rounded-full" />
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timer Display */}
            <div>
              <div className="relative">
                <div className="text-8xl font-bold tabular-nums mb-4">
                  {formatTime(timeLeft)}
                </div>
                {isActive && !isPaused && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white animate-pulse">
                      En progreso
                    </Badge>
                  </div>
                )}
              </div>
              <Progress value={progress} className="h-2 mb-4" />
              <p className="text-sm text-muted-foreground">
                {duration} minutos • {completedSessions} sesiones completadas hoy
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {!isActive ? (
                <Button size="lg" onClick={handleStart} className="gap-2 px-8">
                  <Play className="h-5 w-5" />
                  Comenzar
                </Button>
              ) : (
                <>
                  <Button size="lg" variant="outline" onClick={handlePause} className="gap-2">
                    <Pause className="h-5 w-5" />
                    {isPaused ? 'Reanudar' : 'Pausar'}
                  </Button>
                  <Button size="lg" variant="outline" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Reiniciar
                  </Button>
                </>
              )}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="gap-2">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configuración del Temporizador</DialogTitle>
                    <DialogDescription>
                      Personaliza tu experiencia de concentración
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label>Duración de sesión (minutos)</Label>
                      <Select 
                        value={duration.toString()} 
                        onValueChange={(val) => handleDurationChange(parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="25">25 minutos (Pomodoro)</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Duración de descanso (minutos)</Label>
                      <Select 
                        value={breakDuration.toString()} 
                        onValueChange={(val) => setBreakDuration(parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutos</SelectItem>
                          <SelectItem value="10">10 minutos</SelectItem>
                          <SelectItem value="15">15 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sound">Sonido de finalización</Label>
                      <div className="flex items-center gap-2">
                        {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        <Switch
                          id="sound"
                          checked={soundEnabled}
                          onCheckedChange={setSoundEnabled}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="block">Bloquear distracciones</Label>
                      <Switch
                        id="block"
                        checked={blockDistractions}
                        onCheckedChange={setBlockDistractions}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto">Iniciar descansos automáticamente</Label>
                      <Switch
                        id="auto"
                        checked={autoStartBreaks}
                        onCheckedChange={setAutoStartBreaks}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Sesiones Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-600" />
              Tiempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(completedSessions * duration / 60).toFixed(1)}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">En concentración</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              Distracciones Bloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{distractionsBlocked}</p>
            <p className="text-xs text-muted-foreground mt-1">Esta sesión</p>
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Consejos para Máxima Concentración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span>1</span>
            </div>
            <div>
              <p className="font-medium">Elimina todas las distracciones</p>
              <p className="text-sm text-muted-foreground">
                Silencia tu teléfono y cierra pestañas innecesarias del navegador
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span>2</span>
            </div>
            <div>
              <p className="font-medium">Usa la técnica Pomodoro</p>
              <p className="text-sm text-muted-foreground">
                Trabaja en bloques de 25 minutos con descansos de 5 minutos
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span>3</span>
            </div>
            <div>
              <p className="font-medium">Toma descansos activos</p>
              <p className="text-sm text-muted-foreground">
                Levántate, estírate o camina durante tus pausas para renovar energía
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sesiones Programadas Hoy</CardTitle>
          <CardDescription>Tus actividades de estudio planificadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockStudySessions.filter(s => s.date === '2026-03-14').map((session) => {
              const subject = mockSubjects.find(s => s.id === session.subjectId);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <SubjectIconBg color={subject?.color}>
                      <SubjectDot color={subject?.color} className="h-3 w-3 rounded-full" />
                    </SubjectIconBg>
                    <div>
                      <p className="font-medium">{session.subjectName}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.startTime} - {session.endTime} ({session.duration} min)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {session.type.replace('-', ' ')}
                    </Badge>
                    {session.completed && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
