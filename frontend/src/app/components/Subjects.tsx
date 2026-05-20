import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Plus, 
  BookOpen, 
  Calendar, 
  Clock, 
  TrendingUp,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { mockSubjects, type Subject } from '../lib/mockData';

function SubjectCardItem({
  subject,
  progress,
  daysUntilExam,
  difficultyColors,
  onDelete,
}: {
  subject: Subject;
  progress: number;
  daysUntilExam: number | null;
  difficultyColors: Record<string, { bg: string; text: string; label: string }>;
  onDelete: (id: string) => void;
}) {
  const iconBgRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (iconBgRef.current) iconBgRef.current.style.setProperty('--icon-bg', `${subject.color}20`);
    if (iconRef.current) iconRef.current.style.setProperty('color', subject.color);
    if (progressRef.current) progressRef.current.style.setProperty('--progress-color', subject.color);
  }, [subject.color]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div ref={iconBgRef} className="subject-icon-bg h-12 w-12 rounded-xl flex items-center justify-center">
              <BookOpen ref={iconRef} className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>{subject.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${difficultyColors[subject.difficulty].bg} ${difficultyColors[subject.difficulty].text} border-0`}>
                  {difficultyColors[subject.difficulty].label}
                </Badge>
                {subject.examDate && daysUntilExam !== null && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {daysUntilExam} días
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(subject.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progreso Semanal</span>
              <span className="text-sm font-medium">{subject.completedHours}h / {subject.weeklyHours}h</span>
            </div>
            <Progress ref={progressRef} value={progress} className="subject-progress h-2" />
          </div>
          {subject.examDate && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Examen</span>
                <span className="text-sm font-medium">
                  {new Date(subject.examDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ColorPickerButton({ color, selected, onSelect }: { color: string; selected: boolean; onSelect: (color: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.setProperty('--swatch-color', color);
  }, [color]);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Seleccionar color ${color}`}
      className={`chart-legend-swatch h-8 w-8 rounded-full border-2 transition-all ${
        selected ? 'border-foreground scale-110' : 'border-transparent'
      }`}
      onClick={() => onSelect(color)}
    />
  );
}

export function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<Partial<Subject>>({
    name: '',
    color: '#6366f1',
    difficulty: 'medium',
    weeklyHours: 5,
    completedHours: 0,
  });

  const difficultyColors = {
    easy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Fácil' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media' },
    hard: { bg: 'bg-red-100', text: 'text-red-700', label: 'Difícil' },
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
    '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
  ];

  const handleAddSubject = () => {
    if (newSubject.name && newSubject.weeklyHours) {
      const subject: Subject = {
        id: Date.now().toString(),
        name: newSubject.name,
        color: newSubject.color || '#6366f1',
        difficulty: newSubject.difficulty || 'medium',
        weeklyHours: newSubject.weeklyHours,
        completedHours: 0,
        priority: subjects.length + 1,
        examDate: newSubject.examDate,
      };
      setSubjects([...subjects, subject]);
      setNewSubject({
        name: '',
        color: '#6366f1',
        difficulty: 'medium',
        weeklyHours: 5,
        completedHours: 0,
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const totalWeeklyHours = subjects.reduce((acc, s) => acc + s.weeklyHours, 0);
  const totalCompletedHours = subjects.reduce((acc, s) => acc + s.completedHours, 0);
  const overallProgress = (totalCompletedHours / totalWeeklyHours) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mis Materias</h2>
          <p className="text-muted-foreground">Gestiona tus materias y objetivos de estudio</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Materia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Materia</DialogTitle>
              <DialogDescription>
                Crea una nueva materia y define tus objetivos de estudio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Materia</Label>
                <Input
                  id="name"
                  placeholder="Ej: Cálculo, Programación"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Dificultad</Label>
                <Select
                  value={newSubject.difficulty}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    setNewSubject({ ...newSubject, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weeklyHours">Horas Semanales Objetivo</Label>
                <Input
                  id="weeklyHours"
                  type="number"
                  min="1"
                  max="40"
                  value={newSubject.weeklyHours}
                  onChange={(e) => setNewSubject({ ...newSubject, weeklyHours: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="examDate">Fecha de Examen (Opcional)</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={newSubject.examDate || ''}
                  onChange={(e) => setNewSubject({ ...newSubject, examDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <ColorPickerButton
                      key={color}
                      color={color}
                      selected={newSubject.color === color}
                      onSelect={(c) => setNewSubject({ ...newSubject, color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAddSubject}>
                Agregar Materia
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline">{subjects.length} materias</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Progreso Total</p>
            <p className="text-2xl font-bold mb-2">{overallProgress.toFixed(0)}%</p>
            <Progress value={overallProgress} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Horas Esta Semana</p>
            <p className="text-2xl font-bold">
              {totalCompletedHours}h / {totalWeeklyHours}h
            </p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">En buen camino</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Próximo Examen</p>
            <p className="text-2xl font-bold">
              {subjects.filter(s => s.examDate).length > 0
                ? `${Math.ceil(
                    (new Date(subjects.filter(s => s.examDate).sort((a, b) => 
                      new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime()
                    )[0].examDate!).getTime() - new Date('2026-03-14').getTime()) / 
                    (1000 * 60 * 60 * 24)
                  )} días`
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {subjects.filter(s => s.examDate).length > 0
                ? subjects.filter(s => s.examDate).sort((a, b) => 
                    new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime()
                  )[0].name
                : 'Sin exámenes programados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Recomendación IA</h3>
              <p className="text-sm text-muted-foreground">
                Tu carga académica está bien balanceada. Considera aumentar 1 hora semanal en 
                Química para adelantar el temario antes del examen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((subject) => {
          const progress = (subject.completedHours / subject.weeklyHours) * 100;
          const daysUntilExam = subject.examDate
            ? Math.ceil((new Date(subject.examDate).getTime() - new Date('2026-03-14').getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return (
            <SubjectCardItem
              key={subject.id}
              subject={subject}
              progress={progress}
              daysUntilExam={daysUntilExam}
              difficultyColors={difficultyColors}
              onDelete={handleDeleteSubject}
            />
          );
        })}
      </div>

      {subjects.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No tienes materias</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega tu primera materia para comenzar a organizar tu estudio
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Materia
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
