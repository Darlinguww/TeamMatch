import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Award,
  Plus
} from 'lucide-react';
import { currentUser, mockFeedback, mockUsers, mockProjects, mockTeamMembers } from '../lib/mockData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

export function Feedback() {
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

  // Get feedback received
  const feedbackReceived = mockFeedback.filter(f => f.toUserId === currentUser.id);
  
  // Get feedback given
  const feedbackGiven = mockFeedback.filter(f => f.fromUserId === currentUser.id);

  // Calculate average ratings
  const avgRating = feedbackReceived.length > 0
    ? feedbackReceived.reduce((acc, f) => acc + f.rating, 0) / feedbackReceived.length
    : 0;
  
  const avgCollaboration = feedbackReceived.length > 0
    ? feedbackReceived.reduce((acc, f) => acc + f.collaboration, 0) / feedbackReceived.length
    : 0;

  const avgCommunication = feedbackReceived.length > 0
    ? feedbackReceived.reduce((acc, f) => acc + f.communication, 0) / feedbackReceived.length
    : 0;

  const avgTechnical = feedbackReceived.length > 0
    ? feedbackReceived.reduce((acc, f) => acc + f.technicalSkills, 0) / feedbackReceived.length
    : 0;

  // Get my active projects for feedback
  const myProjects = mockProjects.filter(p => 
    mockTeamMembers.some(tm => tm.userId === currentUser.id && tm.projectId === p.id)
  );

  // Get team members from selected project
  const projectTeamMembers = selectedProject
    ? mockTeamMembers
        .filter(tm => tm.projectId === selectedProject && tm.userId !== currentUser.id)
        .map(tm => mockUsers.find(u => u.id === tm.userId)!)
    : [];

  const handleSubmitFeedback = () => {
    // In a real app, this would submit to the backend
    console.log('Submitting feedback:', {
      projectId: selectedProject,
      toUserId: selectedUser,
      ratings,
      comment,
    });
    
    // Reset form
    setSelectedProject('');
    setSelectedUser('');
    setRatings({
      overall: 5,
      collaboration: 5,
      communication: 5,
      technicalSkills: 5,
    });
    setComment('');
    setIsGiveFeedbackOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Evaluar Compañero de Equipo</DialogTitle>
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
                    {myProjects.map(project => (
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
                      {projectTeamMembers.map(member => (
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
                        <Label>Evaluación General</Label>
                        <span className="text-sm font-medium">{ratings.overall}/5</span>
                      </div>
                      <Slider
                        value={[ratings.overall]}
                        onValueChange={(value) => setRatings({ ...ratings, overall: value[0] })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Colaboración</Label>
                        <span className="text-sm font-medium">{ratings.collaboration}/5</span>
                      </div>
                      <Slider
                        value={[ratings.collaboration]}
                        onValueChange={(value) => setRatings({ ...ratings, collaboration: value[0] })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Comunicación</Label>
                        <span className="text-sm font-medium">{ratings.communication}/5</span>
                      </div>
                      <Slider
                        value={[ratings.communication]}
                        onValueChange={(value) => setRatings({ ...ratings, communication: value[0] })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Habilidades Técnicas</Label>
                        <span className="text-sm font-medium">{ratings.technicalSkills}/5</span>
                      </div>
                      <Slider
                        value={[ratings.technicalSkills]}
                        onValueChange={(value) => setRatings({ ...ratings, technicalSkills: value[0] })}
                        min={1}
                        max={5}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Comentarios (Opcional)</Label>
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
              <Button variant="outline" className="flex-1" onClick={() => setIsGiveFeedbackOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSubmitFeedback}
                disabled={!selectedProject || !selectedUser}
              >
                Enviar Evaluación
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Star className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Rating Promedio</p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= avgRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                  }`}
                />
              ))}
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
              {avgCollaboration >= 4.5 ? 'Excelente' : avgCollaboration >= 4 ? 'Muy buena' : 'Buena'}
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
              {avgCommunication >= 4.5 ? 'Excelente' : avgCommunication >= 4 ? 'Muy buena' : 'Buena'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{avgTechnical.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">Habilidades Técnicas</p>
            <p className="text-xs text-muted-foreground mt-2">
              {avgTechnical >= 4.5 ? 'Experto' : avgTechnical >= 4 ? 'Avanzado' : 'Competente'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Received */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Feedback Recibido
          </CardTitle>
          <CardDescription>
            Evaluaciones de tus compañeros de equipo ({feedbackReceived.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackReceived.length > 0 ? (
            <div className="space-y-4">
              {feedbackReceived.map((feedback) => {
                const fromUser = mockUsers.find(u => u.id === feedback.fromUserId);
                const project = mockProjects.find(p => p.id === feedback.projectId);

                return (
                  <div key={feedback.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm text-primary font-medium">
                            {fromUser?.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{fromUser?.name}</h4>
                          <p className="text-sm text-muted-foreground">{project?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{feedback.rating}/5</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(feedback.date).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
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

                    {feedback.comment && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm italic">"{feedback.comment}"</p>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Feedback Given */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Enviado
          </CardTitle>
          <CardDescription>
            Evaluaciones que has dado a tus compañeros ({feedbackGiven.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedbackGiven.length > 0 ? (
            <div className="space-y-4">
              {feedbackGiven.map((feedback) => {
                const toUser = mockUsers.find(u => u.id === feedback.toUserId);
                const project = mockProjects.find(p => p.id === feedback.projectId);

                return (
                  <div key={feedback.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <span className="text-sm text-green-700 font-medium">
                            {toUser?.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{toUser?.name}</h4>
                          <p className="text-sm text-muted-foreground">{project?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{feedback.rating}/5</span>
                      </div>
                    </div>
                    {feedback.comment && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{feedback.comment}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No has enviado evaluaciones aún</p>
              <Button className="mt-4" onClick={() => setIsGiveFeedbackOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dar Primera Evaluación
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
