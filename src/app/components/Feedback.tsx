import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Award,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import {
  mockFeedback,
  mockUsers,
  mockProjects,
  mockTeamMembers,
  type Feedback as FeedbackItem,
} from '../lib/mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Slider } from './ui/slider';
import { useAuth } from '../lib/authContext';
import { toast } from 'sonner';
import { cn } from './ui/utils';

const EXTRA_FEEDBACK_KEY = 'teammatch_extra_feedback';

function loadExtraFeedback(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(EXTRA_FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as FeedbackItem[]) : [];
  } catch {
    return [];
  }
}

function saveExtraFeedback(items: FeedbackItem[]) {
  try {
    localStorage.setItem(EXTRA_FEEDBACK_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

function FeedbackCard({
  feedback,
  variant,
  highlighted,
}: {
  feedback: FeedbackItem;
  variant: 'received' | 'given';
  highlighted?: boolean;
}) {
  const otherUser =
    variant === 'received'
      ? mockUsers.find((u) => u.id === feedback.fromUserId)
      : mockUsers.find((u) => u.id === feedback.toUserId);
  const project = mockProjects.find((p) => p.id === feedback.projectId);

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all duration-500',
        highlighted && 'ring-2 ring-primary border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
              variant === 'received' ? 'bg-primary/20' : 'bg-green-500/20'
            )}
          >
            <span
              className={cn(
                'text-sm font-medium',
                variant === 'received' ? 'text-primary' : 'text-green-700 dark:text-green-400'
              )}
            >
              {otherUser?.name
                .split(' ')
                .map((n) => n[0])
                .join('') ?? '?'}
            </span>
          </div>
          <div>
            <h4 className="font-medium">{otherUser?.name}</h4>
            <p className="text-sm text-muted-foreground">{project?.name}</p>
            {variant === 'given' && (
              <p className="text-xs text-muted-foreground mt-0.5">Evaluación enviada</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 mb-1 justify-end">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{feedback.rating}/5</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(feedback.date).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Colaboración</p>
          <p className="font-medium">{feedback.collaboration}/5</p>
        </div>
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Comunicación</p>
          <p className="font-medium">{feedback.communication}/5</p>
        </div>
        <div className="text-center p-2 rounded bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Técnicas</p>
          <p className="font-medium">{feedback.technicalSkills}/5</p>
        </div>
      </div>

      {feedback.comment ? (
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm italic">&ldquo;{feedback.comment}&rdquo;</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sin comentario adicional</p>
      )}
    </div>
  );
}

export function Feedback() {
  const { user } = useAuth();
  const [isGiveFeedbackOpen, setIsGiveFeedbackOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [ratings, setRatings] = useState({
    overall: 5,
    collaboration: 5,
    communication: 5,
    technicalSkills: 5,
  });
  const [comment, setComment] = useState('');
  const [extraFeedback, setExtraFeedback] = useState<FeedbackItem[]>(loadExtraFeedback);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const givenSectionRef = useRef<HTMLDivElement>(null);

  const allFeedback = useMemo(
    () => [...mockFeedback, ...extraFeedback],
    [extraFeedback]
  );

  useEffect(() => {
    if (!lastSubmittedId) return;
    const t = setTimeout(() => setLastSubmittedId(null), 4000);
    return () => clearTimeout(t);
  }, [lastSubmittedId]);

  if (!user) return null;

  const feedbackReceived = allFeedback.filter((f) => f.toUserId === user.id);
  const feedbackGiven = allFeedback
    .filter((f) => f.fromUserId === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const avgRating =
    feedbackReceived.length > 0
      ? feedbackReceived.reduce((acc, f) => acc + f.rating, 0) / feedbackReceived.length
      : 0;

  const avgCollaboration =
    feedbackReceived.length > 0
      ? feedbackReceived.reduce((acc, f) => acc + f.collaboration, 0) /
        feedbackReceived.length
      : 0;

  const avgCommunication =
    feedbackReceived.length > 0
      ? feedbackReceived.reduce((acc, f) => acc + f.communication, 0) /
        feedbackReceived.length
      : 0;

  const avgTechnical =
    feedbackReceived.length > 0
      ? feedbackReceived.reduce((acc, f) => acc + f.technicalSkills, 0) /
        feedbackReceived.length
      : 0;

  const myProjects = mockProjects.filter((p) =>
    mockTeamMembers.some((tm) => tm.userId === user.id && tm.projectId === p.id)
  );

  const projectTeamMembers = selectedProject
    ? mockTeamMembers
        .filter((tm) => tm.projectId === selectedProject && tm.userId !== user.id)
        .map((tm) => mockUsers.find((u) => u.id === tm.userId)!)
    : [];

  const resetForm = () => {
    setSelectedProject('');
    setSelectedUser('');
    setRatings({
      overall: 5,
      collaboration: 5,
      communication: 5,
      technicalSkills: 5,
    });
    setComment('');
  };

  const handleSubmitFeedback = () => {
    if (!selectedProject || !selectedUser) return;

    const newFeedback: FeedbackItem = {
      id: `f_${Date.now()}`,
      fromUserId: user.id,
      toUserId: selectedUser,
      projectId: selectedProject,
      rating: ratings.overall,
      collaboration: ratings.collaboration,
      communication: ratings.communication,
      technicalSkills: ratings.technicalSkills,
      comment: comment.trim(),
      date: new Date().toISOString().split('T')[0],
    };

    const updated = [...extraFeedback, newFeedback];
    setExtraFeedback(updated);
    saveExtraFeedback(updated);
    setLastSubmittedId(newFeedback.id);
    resetForm();
    setIsGiveFeedbackOpen(false);

    const toUser = mockUsers.find((u) => u.id === selectedUser);
    toast.success('Evaluación enviada', {
      description: `Tu feedback para ${toUser?.name ?? 'tu compañero'} ya aparece en Feedback enviado.`,
    });

    requestAnimationFrame(() => {
      givenSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Evaluaciones</h2>
          <p className="text-muted-foreground">Feedback recibido y enviado</p>
        </div>
        <Dialog open={isGiveFeedbackOpen} onOpenChange={setIsGiveFeedbackOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dar Feedback
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Evaluar compañero de equipo</DialogTitle>
              <DialogDescription>
                Proporciona feedback constructivo sobre la colaboración
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Proyecto</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {myProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <div className="space-y-2">
                  <Label>Evaluar a</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un compañero" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTeamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedUser && (
                <>
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Evaluación general</Label>
                        <span className="text-sm font-medium">{ratings.overall}/5</span>
                      </div>
                      <Slider
                        value={[ratings.overall]}
                        onValueChange={(value) =>
                          setRatings({ ...ratings, overall: value[0] })
                        }
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Colaboración</Label>
                        <span className="text-sm font-medium">
                          {ratings.collaboration}/5
                        </span>
                      </div>
                      <Slider
                        value={[ratings.collaboration]}
                        onValueChange={(value) =>
                          setRatings({ ...ratings, collaboration: value[0] })
                        }
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Comunicación</Label>
                        <span className="text-sm font-medium">
                          {ratings.communication}/5
                        </span>
                      </div>
                      <Slider
                        value={[ratings.communication]}
                        onValueChange={(value) =>
                          setRatings({ ...ratings, communication: value[0] })
                        }
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Habilidades técnicas</Label>
                        <span className="text-sm font-medium">
                          {ratings.technicalSkills}/5
                        </span>
                      </div>
                      <Slider
                        value={[ratings.technicalSkills]}
                        onValueChange={(value) =>
                          setRatings({ ...ratings, technicalSkills: value[0] })
                        }
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Comentarios (opcional)</Label>
                    <Textarea
                      placeholder="Comparte tu experiencia trabajando con este compañero..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetForm();
                  setIsGiveFeedbackOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitFeedback}
                disabled={!selectedProject || !selectedUser}
              >
                Enviar evaluación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {lastSubmittedId && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              ¡Evaluación enviada correctamente!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              Puedes verla en la sección &quot;Feedback enviado&quot; más abajo.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Rating promedio</p>
            <div className="flex mt-2">
              <StarRating value={Math.round(avgRating)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{avgCollaboration.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Colaboración</p>
            <p className="text-xs text-muted-foreground mt-2">
              {avgCollaboration >= 4.5
                ? 'Excelente'
                : avgCollaboration >= 4
                  ? 'Muy buena'
                  : 'Buena'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{avgCommunication.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Comunicación</p>
            <p className="text-xs text-muted-foreground mt-2">
              {avgCommunication >= 4.5
                ? 'Excelente'
                : avgCommunication >= 4
                  ? 'Muy buena'
                  : 'Buena'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{avgTechnical.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Habilidades técnicas</p>
            <p className="text-xs text-muted-foreground mt-2">
              {avgTechnical >= 4.5
                ? 'Experto'
                : avgTechnical >= 4
                  ? 'Avanzado'
                  : 'Competente'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Feedback recibido
          </CardTitle>
          <CardDescription>
            Evaluaciones de tus compañeros de equipo ({feedbackReceived.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackReceived.length > 0 ? (
            <div className="space-y-4">
              {feedbackReceived.map((feedback) => (
                <FeedbackCard key={feedback.id} feedback={feedback} variant="received" />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aún no has recibido evaluaciones</p>
              <p className="text-sm text-muted-foreground mt-2">
                Completa proyectos para recibir feedback de tus compañeros
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card ref={givenSectionRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback enviado
          </CardTitle>
          <CardDescription>
            Evaluaciones que has dado a tus compañeros ({feedbackGiven.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackGiven.length > 0 ? (
            <div className="space-y-4">
              {feedbackGiven.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  variant="given"
                  highlighted={feedback.id === lastSubmittedId}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No has enviado evaluaciones aún</p>
              <Button className="mt-4" onClick={() => setIsGiveFeedbackOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dar primera evaluación
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
