import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Briefcase, Search, Users, Clock, Filter, Sparkles, ArrowRight,
  Plus, X, ChevronRight, ChevronLeft, Check, Layers, Target,
  Calendar, Zap, FolderOpen,
} from 'lucide-react';
import { mockProjects, type Project, type Skill } from '../lib/mockData';
import { Link } from 'react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../lib/authContext';

// ─── constants ───────────────────────────────────────────────────────────────

const SKILL_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'TypeScript', 'Java', 'SQL', 'Docker',
  'AWS', 'Machine Learning', 'Flutter', 'Vue.js', 'GraphQL', 'MongoDB',
  'Spring Boot', 'Kubernetes', 'TensorFlow', 'FastAPI', 'Next.js', 'C#', 'Go',
  'Liderazgo', 'Comunicación', 'Gestión de proyectos', 'Scrum', 'UX/UI',
];

const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'DevOps Engineer', 'UX/UI Designer', 'QA Engineer',
  'Product Manager', 'ML Engineer', 'Mobile Developer',
];

const CATEGORIES = [
  'Web Platform', 'Mobile App', 'AI/ML', 'Data Science',
  'DevOps', 'Blockchain', 'IoT', 'Education', 'FinTech', 'Salud Digital',
];

const WIZARD_STEPS = ['Básico', 'Equipo', 'Habilidades', 'Confirmar'];

// ─── types ────────────────────────────────────────────────────────────────────

interface RoleEntry { id: string; name: string; description: string; }
interface SkillEntry { id: string; name: string; }

interface NewProjectForm {
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  teamSize: number;
  roles: RoleEntry[];
  requiredSkills: SkillEntry[];
  objectives: string;
}

// ─── diff / label maps ───────────────────────────────────────────────────────

const difficultyColors: Record<string, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
};
const difficultyLabels: Record<string, string> = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };
const statusColors: Record<string, string> = {
  open:        'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed:   'bg-gray-100 text-gray-700',
};
const statusLabels: Record<string, string> = {
  open: 'Abierto', 'in-progress': 'En Progreso', completed: 'Completado',
};

// ─── step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
            i < current  ? 'bg-primary text-white'
            : i === current ? 'bg-primary text-white ring-4 ring-primary/20'
            : 'bg-muted text-muted-foreground'
          }`}>
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`hidden sm:block text-xs font-medium ${i === current ? 'text-primary' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 mx-1 ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── create project modal ─────────────────────────────────────────────────────

function CreateProjectModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Project) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<NewProjectForm>({
    name: '', description: '', category: '', difficulty: 'medium',
    estimatedDuration: 4, teamSize: 3, roles: [], requiredSkills: [], objectives: '',
  });

  const [roleInput, setRoleInput]   = useState('');
  const [roleDesc,  setRoleDesc]    = useState('');
  const [skillInput, setSkillInput] = useState('');

  const set = (patch: Partial<NewProjectForm>) => setForm(prev => ({ ...prev, ...patch }));

  const addRole = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || form.roles.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) return;
    set({ roles: [...form.roles, { id: `r_${Date.now()}`, name: trimmed, description: roleDesc.trim() }] });
    setRoleInput(''); setRoleDesc('');
  };

  const addSkill = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || form.requiredSkills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    set({ requiredSkills: [...form.requiredSkills, { id: `sk_${Date.now()}`, name: trimmed }] });
    setSkillInput('');
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 1 && form.description.trim().length > 10 && form.category !== '';
    if (step === 1) return form.teamSize >= 1 && form.roles.length > 0;
    if (step === 2) return form.requiredSkills.length > 0;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const newProject: Project = {
      id:                `p_${Date.now()}`,
      name:              form.name,
      description:       form.description,
      status:            'open',
      leaderId:          user?.id ?? '1',
      requiredSkills:    form.requiredSkills.map((s, i) => ({ id: s.id, name: s.name, category: 'technical' as const, level: 'intermediate' as const })),
      requiredRoles:     form.roles.map(r => ({ id: r.id, name: r.name, description: r.description, requiredSkills: [] })),
      teamSize:          form.teamSize,
      currentTeamSize:   1,
      startDate:         new Date().toISOString().split('T')[0],
      estimatedDuration: form.estimatedDuration,
      category:          form.category,
      difficulty:        form.difficulty,
    };
    setSaving(false);
    onCreated(newProject);
    // reset
    setStep(0);
    setForm({ name: '', description: '', category: '', difficulty: 'medium', estimatedDuration: 4, teamSize: 3, roles: [], requiredSkills: [], objectives: '' });
  };

  const filteredSkillSuggestions = SKILL_SUGGESTIONS
    .filter(s => !form.requiredSkills.some(sk => sk.name.toLowerCase() === s.toLowerCase())
      && (skillInput === '' || s.toLowerCase().includes(skillInput.toLowerCase())))
    .slice(0, 10);

  const filteredRoleSuggestions = ROLE_SUGGESTIONS
    .filter(r => !form.roles.some(ro => ro.name.toLowerCase() === r.toLowerCase())
      && (roleInput === '' || r.toLowerCase().includes(roleInput.toLowerCase())))
    .slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            Crear Nuevo Proyecto
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} steps={WIZARD_STEPS} />

        {/* ── Step 0: Básico ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Nombre del proyecto <span className="text-destructive">*</span></Label>
              <Input id="proj-name" placeholder="Ej: SmartHealth – Plataforma de Telemedicina" value={form.name}
                onChange={e => set({ name: e.target.value })} className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-desc">Descripción <span className="text-destructive">*</span></Label>
              <Textarea id="proj-desc" placeholder="¿Qué problema resuelve este proyecto? ¿Cuál es el objetivo principal?" value={form.description}
                onChange={e => set({ description: e.target.value })} rows={3} />
              <p className="text-xs text-muted-foreground">{form.description.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-obj">Objetivos específicos (opcional)</Label>
              <Textarea id="proj-obj" placeholder="Lista los objetivos o entregables del proyecto..." value={form.objectives}
                onChange={e => set({ objectives: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría <span className="text-destructive">*</span></Label>
                <Select value={form.category} onValueChange={v => set({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificultad</Label>
                <Select value={form.difficulty} onValueChange={(v: any) => set({ difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">🟢 Fácil</SelectItem>
                    <SelectItem value="medium">🟡 Medio</SelectItem>
                    <SelectItem value="hard">🔴 Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duración estimada: <span className="font-semibold text-primary">{form.estimatedDuration} semanas</span></Label>
              <input type="range" min={1} max={52} value={form.estimatedDuration}
                onChange={e => set({ estimatedDuration: Number(e.target.value) })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>1 semana</span><span>52 semanas</span></div>
            </div>
          </div>
        )}

        {/* ── Step 1: Equipo ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tamaño del equipo: <span className="font-semibold text-primary">{form.teamSize} personas</span></Label>
              <input type="range" min={1} max={20} value={form.teamSize}
                onChange={e => set({ teamSize: Number(e.target.value) })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>20</span></div>
            </div>

            <div className="space-y-3">
              <Label>Roles requeridos <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input placeholder="Nombre del rol..." value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRole(roleInput); } }}
                  className="h-10" />
                <Button type="button" variant="outline" size="sm" className="h-10 px-4 shrink-0" onClick={() => addRole(roleInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Input placeholder="Descripción del rol (opcional)..." value={roleDesc}
                onChange={e => setRoleDesc(e.target.value)} className="h-9 text-sm" />

              {/* Role suggestions */}
              {filteredRoleSuggestions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Sugerencias:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredRoleSuggestions.map(r => (
                      <button key={r} onClick={() => { setRoleInput(r); addRole(r); }}
                        className="px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 text-xs transition-all">
                        + {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.roles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Roles agregados ({form.roles.length})</p>
                  <div className="space-y-1.5">
                    {form.roles.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                        <button type="button" onClick={() => set({ roles: form.roles.filter(x => x.id !== r.id) })}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Habilidades ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-3">
              <Label>Habilidades requeridas <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">El motor de IA usará estas habilidades para encontrar los mejores candidatos.</p>

              <div className="flex gap-2">
                <Input placeholder="Escribe o selecciona una habilidad..." value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                  className="h-10" />
                <Button type="button" variant="outline" size="sm" className="h-10 px-4 shrink-0" onClick={() => addSkill(skillInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {filteredSkillSuggestions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Sugerencias rápidas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSkillSuggestions.map(s => (
                      <button key={s} onClick={() => addSkill(s)}
                        className="px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 text-xs transition-all">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.requiredSkills.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Habilidades seleccionadas ({form.requiredSkills.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {form.requiredSkills.map(s => (
                      <div key={s.id} className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-medium">
                        {s.name}
                        <button type="button" onClick={() => set({ requiredSkills: form.requiredSkills.filter(x => x.id !== s.id) })}
                          className="hover:opacity-70 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-900">Motor de matchmaking</p>
                  <p className="text-xs text-cyan-700 mt-0.5 leading-relaxed">
                    El motor de IA cruzará estas habilidades contra los perfiles registrados en la plataforma para sugerir los mejores candidatos para cada rol.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirmar ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Revisa los detalles antes de publicar el proyecto.</p>

            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold">{form.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { icon: Layers,    label: 'Categoría',   value: form.category },
                  { icon: Target,    label: 'Dificultad',  value: difficultyLabels[form.difficulty] },
                  { icon: Calendar,  label: 'Duración',    value: `${form.estimatedDuration} semanas` },
                  { icon: Users,     label: 'Equipo',      value: `${form.teamSize} personas` },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">ROLES ({form.roles.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.roles.map(r => <Badge key={r.id} variant="outline">{r.name}</Badge>)}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">HABILIDADES REQUERIDAS ({form.requiredSkills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.requiredSkills.map(s => (
                    <Badge key={s.id} className="bg-primary/10 text-primary border-primary/20">{s.name}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">¿Qué pasa después?</p>
                <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                  El proyecto quedará publicado como <strong>Abierto</strong>. El motor de IA buscará automáticamente candidatos compatibles y podrás revisar las sugerencias de equipo desde la vista del proyecto.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-6 pt-4 border-t gap-3 ${step === 0 ? 'justify-end' : 'justify-between'}`}>
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" />Atrás
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-1">
              Continuar<ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving}
              className="gap-2 bg-gradient-to-r from-primary to-cyan-500 text-white">
              {saving
                ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Publicando...</>
                : <><Check className="h-4 w-4" />Publicar Proyecto</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, matchScore }: { project: Project; matchScore: number }) {
  const spotsLeft = project.teamSize - project.currentTeamSize;
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2 gap-2">
          <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
          {project.status === 'open' && matchScore > 0 && (
            <Badge className="bg-primary/10 text-primary shrink-0">{matchScore}% Match</Badge>
          )}
        </div>
        <CardTitle className="line-clamp-1 text-base">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{project.currentTeamSize}/{project.teamSize} miembros</span>
            </div>
            <Badge className={`text-xs ${difficultyColors[project.difficulty]}`}>
              {difficultyLabels[project.difficulty]}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{project.estimatedDuration} semanas</div>
            <Badge variant="outline" className="text-xs">{project.category}</Badge>
          </div>

          {project.status === 'open' && spotsLeft > 0 && (
            <div className="p-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 font-medium">
              {spotsLeft} {spotsLeft === 1 ? 'lugar disponible' : 'lugares disponibles'}
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Habilidades requeridas:</p>
            <div className="flex flex-wrap gap-1">
              {project.requiredSkills.slice(0, 3).map(s => (
                <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
              ))}
              {project.requiredSkills.length > 3 && (
                <Badge variant="outline" className="text-xs">+{project.requiredSkills.length - 3}</Badge>
              )}
            </div>
          </div>
        </div>

        <Button asChild className="w-full mt-2" size="sm">
          <Link to={`/projects/${project.id}`}>
            Ver Detalles <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function Projects() {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>(mockProjects);
  const [showCreate,  setShowCreate]  = useState(false);

  const [searchTerm,       setSearchTerm]       = useState('');
  const [categoryFilter,   setCategoryFilter]   = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter,     setStatusFilter]     = useState<'all' | 'open' | 'in-progress' | 'completed'>('all');

  const filtered = allProjects.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) &&
      (categoryFilter   === 'all' || p.category   === categoryFilter)   &&
      (difficultyFilter === 'all' || p.difficulty === difficultyFilter) &&
      (statusFilter     === 'all' || p.status     === statusFilter)
    );
  });

  const openProjects       = filtered.filter(p => p.status === 'open');
  const inProgressProjects = filtered.filter(p => p.status === 'in-progress');
  const categories         = ['all', ...new Set(allProjects.map(p => p.category))];

  const calcMatch = (project: Project) => {
    if (!user?.skills?.length) return 0;
    const userSkills = user.skills.map(s => s.name.toLowerCase());
    const needed     = project.requiredSkills.map(s => s.name.toLowerCase());
    if (!needed.length) return 0;
    const hits = userSkills.filter(sk => needed.some(n => n.includes(sk) || sk.includes(n)));
    return Math.min(Math.round((hits.length / needed.length) * 100), 100);
  };

  const handleCreated = (p: Project) => {
    setAllProjects(prev => [p, ...prev]);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Explorar Proyectos</h2>
          <p className="text-muted-foreground">Encuentra el equipo perfecto para ti</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-to-r from-primary to-cyan-500 text-white hover:opacity-90">
          <Plus className="h-4 w-4" />Crear Proyecto
        </Button>
      </div>

      {/* Search & filters */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar proyectos..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: 'Categoría', value: categoryFilter, onChange: setCategoryFilter,
                options: [['all', 'Todas las categorías'], ...categories.filter(c => c !== 'all').map(c => [c, c])] },
              { label: 'Dificultad', value: difficultyFilter, onChange: setDifficultyFilter,
                options: [['all','Todas'], ['easy','Fácil'], ['medium','Medio'], ['hard','Difícil']] },
              { label: 'Estado', value: statusFilter, onChange: (v: any) => setStatusFilter(v),
                options: [['all','Todos'], ['open','Abiertos'], ['in-progress','En Progreso'], ['completed','Completados']] },
            ].map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label}</label>
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {f.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos ({filtered.length})</TabsTrigger>
          <TabsTrigger value="open"><Sparkles className="h-3.5 w-3.5 mr-1" />Disponibles ({openProjects.length})</TabsTrigger>
          <TabsTrigger value="in-progress">En Progreso ({inProgressProjects.length})</TabsTrigger>
        </TabsList>

        {[
          { key: 'all',         list: filtered         },
          { key: 'open',        list: openProjects       },
          { key: 'in-progress', list: inProgressProjects },
        ].map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4">
            {tab.list.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tab.list.map(p => <ProjectCard key={p.id} project={p} matchScore={calcMatch(p)} />)}
              </div>
            ) : (
              <div className="text-center py-16">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">No se encontraron proyectos</p>
                <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-2" />Crear el primero
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal */}
      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
    </div>
  );
}