import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Network, Sparkles, Briefcase, GraduationCap, Code2, Users, Clock,
  ChevronRight, ChevronLeft, Check, Plus, X, ArrowRight, Zap,
  BookOpen, Wrench, Heart, Globe, Star
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useAuth } from '../lib/authContext';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type UserType = 'student' | 'professional' | null;
type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
type SkillCategory = 'technical' | 'soft' | 'domain';

interface SkillEntry {
  id: string;
  name: string;
  level: SkillLevel;
  category: SkillCategory;
}

interface OnboardingData {
  userType: UserType;
  bio: string;
  roleOrProgram: string;
  yearsExperience: number;
  skills: SkillEntry[];
  interests: string[];
  hoursPerWeek: number;
  preferredTimes: string[];
  workTypes: string[];
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TECHNICAL_SUGGESTIONS = [
  'React', 'Node.js', 'Python', 'TypeScript', 'Java', 'SQL', 'Docker',
  'AWS', 'Machine Learning', 'Flutter', 'Vue.js', 'GraphQL', 'MongoDB',
  'Spring Boot', 'Kubernetes', 'TensorFlow', 'FastAPI', 'Next.js', 'C#', 'Go'
];

const SOFT_SUGGESTIONS = [
  'Liderazgo', 'Comunicación', 'Trabajo en equipo', 'Gestión de proyectos',
  'Resolución de problemas', 'Creatividad', 'Adaptabilidad', 'Pensamiento crítico',
  'Empatía', 'Negociación', 'Presentaciones', 'Scrum / Agile'
];

const DOMAIN_SUGGESTIONS = [
  'FinTech', 'Salud Digital', 'Educación', 'E-commerce', 'IoT', 'Ciberseguridad',
  'Diseño UX/UI', 'Data Science', 'Blockchain', 'Inteligencia Artificial',
  'Desarrollo móvil', 'DevOps', 'Gestión de datos', 'Marketing digital'
];

const WORK_TYPES = [
  { id: 'frontend', label: 'Frontend', icon: '🎨' },
  { id: 'backend', label: 'Backend', icon: '⚙️' },
  { id: 'fullstack', label: 'Full Stack', icon: '🔧' },
  { id: 'data', label: 'Data / IA', icon: '📊' },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'devops', label: 'DevOps / Infra', icon: '☁️' },
  { id: 'design', label: 'Diseño UX/UI', icon: '✏️' },
  { id: 'qa', label: 'QA / Testing', icon: '🧪' },
  { id: 'pm', label: 'Gestión / PM', icon: '📋' },
  { id: 'research', label: 'Investigación', icon: '🔬' },
];

const PREFERRED_TIMES = ['Mañanas', 'Tardes', 'Noches', 'Fines de semana', 'Flexible'];

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-blue-100 text-blue-700 border-blue-200',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
  advanced: 'bg-green-100 text-green-700 border-green-200',
};

const STEPS = ['Bienvenida', 'Perfil', 'Habilidades', 'Disponibilidad', '¡Listo!'];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < current
              ? 'bg-primary w-6'
              : i === current
              ? 'bg-primary w-8'
              : 'bg-border w-4'
          }`}
        />
      ))}
    </div>
  );
}

function SkillTag({ skill, onRemove }: { skill: SkillEntry; onRemove: () => void }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${LEVEL_COLORS[skill.level]}`}>
      <span>{skill.name}</span>
      <span className="opacity-60">· {LEVEL_LABELS[skill.level]}</span>
      <button onClick={onRemove} className="ml-0.5 hover:opacity-70 transition-opacity">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user, updateOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    userType: null,
    bio: '',
    roleOrProgram: '',
    yearsExperience: 0,
    skills: [],
    interests: [],
    hoursPerWeek: 10,
    preferredTimes: [],
    workTypes: [],
  });

  // Skill input state
  const [skillInput, setSkillInput] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [skillCategory, setSkillCategory] = useState<SkillCategory>('technical');
  const [interestInput, setInterestInput] = useState('');

  const firstName = user?.name?.split(' ')[0] ?? 'Bienvenido';

  // ── Handlers ──

  const addSkill = (name: string, cat?: SkillCategory) => {
    const trimmed = name.trim();
    if (!trimmed || data.skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setData(prev => ({
      ...prev,
      skills: [...prev.skills, {
        id: `sk_${Date.now()}`,
        name: trimmed,
        level: skillLevel,
        category: cat ?? skillCategory,
      }]
    }));
    setSkillInput('');
  };

  const removeSkill = (id: string) =>
    setData(prev => ({ ...prev, skills: prev.skills.filter(s => s.id !== id) }));

  const addInterest = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || data.interests.includes(trimmed)) return;
    setData(prev => ({ ...prev, interests: [...prev.interests, trimmed] }));
    setInterestInput('');
  };

  const toggleTime = (t: string) =>
    setData(prev => ({
      ...prev,
      preferredTimes: prev.preferredTimes.includes(t)
        ? prev.preferredTimes.filter(x => x !== t)
        : [...prev.preferredTimes, t],
    }));

  const toggleWorkType = (id: string) =>
    setData(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(id)
        ? prev.workTypes.filter(x => x !== id)
        : [...prev.workTypes, id],
    }));

  const handleFinish = async () => {
    setSaving(true);
    await updateOnboarding(data);
    setSaving(false);
    navigate('/');
  };

  const canProceed = () => {
    if (step === 0) return data.userType !== null;
    if (step === 1) return data.roleOrProgram.trim().length > 0;
    if (step === 2) return data.skills.length > 0;
    if (step === 3) return data.hoursPerWeek > 0;
    return true;
  };

  // ── Render steps ──

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Welcome + user type ──
      case 0:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg shadow-primary/30 mb-2">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold">¡Hola, {firstName}! 🎉</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Estás a unos pasos de que la IA encuentre tu equipo ideal. Primero cuéntanos un poco sobre ti.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-center text-foreground/70 uppercase tracking-wider">¿Cómo te describes?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    type: 'student' as UserType,
                    icon: GraduationCap,
                    title: 'Soy estudiante',
                    desc: 'Busco ganar experiencia y colaborar en proyectos universitarios o personales.',
                    color: 'from-violet-500 to-purple-600',
                    glow: 'shadow-violet-200',
                  },
                  {
                    type: 'professional' as UserType,
                    icon: Briefcase,
                    title: 'Soy profesional',
                    desc: 'Tengo experiencia laboral y quiero aportar a proyectos con mayor impacto.',
                    color: 'from-sky-500 to-cyan-600',
                    glow: 'shadow-sky-200',
                  },
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => setData(prev => ({ ...prev, userType: opt.type }))}
                    className={`relative group rounded-2xl border-2 p-6 text-left transition-all duration-200 hover:shadow-lg ${
                      data.userType === opt.type
                        ? `border-primary bg-primary/5 shadow-md ${opt.glow}`
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${opt.color} mb-4 shadow-md`}>
                      <opt.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-base mb-1">{opt.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{opt.desc}</p>
                    {data.userType === opt.type && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      // ── Step 1: Basic profile ──
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tu perfil</h2>
              <p className="text-muted-foreground text-sm">Esta información ayuda al motor a entender quién eres.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleOrProgram">
                  {data.userType === 'student' ? 'Programa / Carrera que estudias' : 'Tu rol o título profesional'}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="roleOrProgram"
                  placeholder={data.userType === 'student'
                    ? 'Ej: Ingeniería de Sistemas, Diseño Gráfico...'
                    : 'Ej: Full Stack Developer, Data Engineer...'}
                  value={data.roleOrProgram}
                  onChange={e => setData(prev => ({ ...prev, roleOrProgram: e.target.value }))}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Una breve descripción tuya</Label>
                <Textarea
                  id="bio"
                  placeholder="Cuéntanos qué te apasiona, qué tipo de proyectos te interesan, cuáles son tus metas..."
                  value={data.bio}
                  onChange={e => setData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{data.bio.length}/300 caracteres</p>
              </div>

              {data.userType === 'professional' && (
                <div className="space-y-2">
                  <Label>Años de experiencia</Label>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3, 5, 7, 10].map(yr => (
                      <button
                        key={yr}
                        onClick={() => setData(prev => ({ ...prev, yearsExperience: yr }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          data.yearsExperience === yr
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'border-border hover:border-primary/50 text-muted-foreground'
                        }`}
                      >
                        {yr === 0 ? '<1' : yr === 10 ? '10+' : yr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipos de trabajo que realizas</Label>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPES.map(wt => (
                    <button
                      key={wt.id}
                      onClick={() => toggleWorkType(wt.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                        data.workTypes.includes(wt.id)
                          ? 'bg-primary/10 border-primary text-primary font-medium'
                          : 'border-border hover:border-primary/40 text-muted-foreground'
                      }`}
                    >
                      <span>{wt.icon}</span>
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 2: Skills ──
      case 2:
        const suggestions =
          skillCategory === 'technical' ? TECHNICAL_SUGGESTIONS
          : skillCategory === 'soft' ? SOFT_SUGGESTIONS
          : DOMAIN_SUGGESTIONS;

        const filteredSuggestions = suggestions.filter(
          s => !data.skills.some(sk => sk.name.toLowerCase() === s.toLowerCase())
            && (skillInput === '' || s.toLowerCase().includes(skillInput.toLowerCase()))
        ).slice(0, 12);

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tus habilidades</h2>
              <p className="text-muted-foreground text-sm">Agrega las habilidades que defines como tuyas. El motor las usará para matchearte.</p>
            </div>

            {/* Category selector */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {([
                { id: 'technical', label: 'Técnicas', icon: Code2 },
                { id: 'soft', label: 'Blandas', icon: Heart },
                { id: 'domain', label: 'Dominio', icon: Globe },
              ] as { id: SkillCategory; label: string; icon: typeof Code2 }[]).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSkillCategory(cat.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    skillCategory === cat.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Level selector */}
            <div className="space-y-2">
              <Label>Nivel de dominio</Label>
              <div className="flex gap-2">
                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(lv => (
                  <button
                    key={lv}
                    onClick={() => setSkillLevel(lv)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      skillLevel === lv
                        ? `${LEVEL_COLORS[lv]} border-current shadow-sm`
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {LEVEL_LABELS[lv]}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Escribe o selecciona una habilidad..."
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                className="h-10"
              />
              <Button variant="outline" size="sm" className="h-10 px-4 shrink-0" onClick={() => addSkill(skillInput)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestions */}
            {filteredSuggestions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Sugerencias rápidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => addSkill(s, skillCategory)}
                      className="px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 text-xs transition-all"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Added skills */}
            {data.skills.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Habilidades agregadas ({data.skills.length})</p>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map(skill => (
                    <SkillTag key={skill.id} skill={skill} onRemove={() => removeSkill(skill.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Interests */}
            <div className="space-y-2 border-t pt-4">
              <Label>Áreas de interés (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Startups, IA, Sostenibilidad..."
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(interestInput); } }}
                  className="h-10"
                />
                <Button variant="outline" size="sm" className="h-10 px-4 shrink-0" onClick={() => addInterest(interestInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.interests.map(int => (
                  <Badge key={int} variant="secondary" className="gap-1">
                    {int}
                    <button onClick={() => setData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== int) }))}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      // ── Step 3: Availability ──
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tu disponibilidad</h2>
              <p className="text-muted-foreground text-sm">El motor usará esto para asignarte proyectos compatibles con tu tiempo.</p>
            </div>

            <div className="space-y-2">
              <Label>¿Cuántas horas por semana puedes dedicar a proyectos?</Label>
              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={data.hoursPerWeek}
                  onChange={e => setData(prev => ({ ...prev, hoursPerWeek: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">1h</span>
                  <div className="px-4 py-1.5 bg-primary/10 text-primary rounded-full font-bold text-sm">
                    {data.hoursPerWeek}h / semana
                  </div>
                  <span className="text-xs text-muted-foreground">40h</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horarios preferidos</Label>
              <div className="flex flex-wrap gap-2">
                {PREFERRED_TIMES.map(t => (
                  <button
                    key={t}
                    onClick={() => toggleTime(t)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${
                      data.preferredTimes.includes(t)
                        ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-900">¿Por qué es importante?</p>
                  <p className="text-xs text-cyan-700 mt-0.5 leading-relaxed">
                    El motor de emparejamiento cruza tu disponibilidad con la de los demás para que todos en el equipo coincidan en horarios. Cuanto más preciso seas, mejores serán los resultados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      // ── Step 4: Done ──
      case 4:
        const skillCount = data.skills.length;
        const workTypeCount = data.workTypes.length;
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-200 mx-auto">
                <Check className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">¡Todo listo, {firstName}!</h2>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  Tu perfil está configurado. El motor de IA ya puede encontrar los equipos y proyectos perfectos para ti.
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              {[
                { icon: data.userType === 'student' ? GraduationCap : Briefcase, label: 'Perfil', value: data.userType === 'student' ? 'Estudiante' : 'Profesional', color: 'bg-violet-100 text-violet-700' },
                { icon: Star, label: 'Habilidades', value: `${skillCount} registradas`, color: 'bg-amber-100 text-amber-700' },
                { icon: Wrench, label: 'Roles', value: `${workTypeCount} tipos`, color: 'bg-sky-100 text-sky-700' },
                { icon: Clock, label: 'Disponibilidad', value: `${data.hoursPerWeek}h/semana`, color: 'bg-green-100 text-green-700' },
              ].map(card => (
                <div key={card.label} className="rounded-xl border bg-card p-3 space-y-2">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-sm font-semibold">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-cyan-500/10 border border-primary/20 p-5">
              <div className="flex items-start gap-3 text-left">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">¿Qué sigue?</p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>→ Explora proyectos disponibles en la plataforma</li>
                    <li>→ El motor ya buscará coincidencias para tu perfil</li>
                    <li>→ Puedes editar tu perfil en cualquier momento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-400">
              <Network className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground/70">TeamMatch</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Paso {step + 1} de {STEPS.length}</p>
            <StepIndicator current={step} total={STEPS.length} />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl border shadow-xl shadow-black/5 p-8">
          {renderStep()}

          {/* Navigation */}
          <div className={`flex mt-8 pt-6 border-t ${step === 0 ? 'justify-end' : 'justify-between'}`}>
            {step > 0 && step < 4 && (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Atrás
              </Button>
            )}

            {step < 3 && (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={() => setStep(4)}
                disabled={!canProceed()}
                className="gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white"
              >
                Ver resumen
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 4 && (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-500/90 hover:to-emerald-500/90 text-white h-12 text-base"
              >
                {saving ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</>
                ) : (
                  <>¡Ir a TeamMatch! <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>

          {/* Skip link */}
          {step < 4 && (
            <div className="text-center mt-3">
              <button
                onClick={() => { setStep(4); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Completar más tarde
              </button>
            </div>
          )}
        </div>

        {/* Step labels */}
        <div className="flex justify-between mt-4 px-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`text-xs transition-colors ${
                i === step ? 'text-primary font-semibold' : i < step ? 'text-foreground/40' : 'text-foreground/20'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
