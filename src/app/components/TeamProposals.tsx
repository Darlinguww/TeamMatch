import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  Sparkles, Users, Clock, Star, ChevronDown, ChevronUp,
  CheckCircle2, Zap, Brain, Calendar, TrendingUp, RefreshCw,
  Shield, Target, Award,
} from 'lucide-react';
import { mockUsers, mockProjects, type User, type Project } from '../lib/mockData';
import { useAuth } from '../lib/authContext';

// ─── types ────────────────────────────────────────────────────────────────────

interface MemberScore {
  user: User;
  role: string;
  overallScore: number;
  breakdown: {
    skills: number;
    availability: number;
    experience: number;
    feedback: number;
  };
  matchedSkills: string[];
  justification: string;
}

interface TeamProposal {
  id: string;
  members: MemberScore[];
  teamAffinityScore: number;
  complementarity: number;
  availabilityMatch: number;
  experienceBalance: number;
  teamJustification: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBadgeColor(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

const levelWeight: Record<string, number> = {
  expert: 1, advanced: 0.85, intermediate: 0.65, beginner: 0.4,
};

// ─── score engine ─────────────────────────────────────────────────────────────

function computeMemberScore(member: User, project: Project, role: string): MemberScore {
  const requiredSkillNames = project.requiredSkills.map(s => s.name.toLowerCase());
  const memberSkillNames   = (member.skills ?? []).map(s => s.name.toLowerCase());

  // Skills score
  const matchedSkills = (member.skills ?? []).filter(s =>
    requiredSkillNames.some(r => r.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(r))
  );
  const skillsScore = requiredSkillNames.length === 0 ? 75
    : Math.min(100, Math.round(
        matchedSkills.reduce((acc, s) => acc + (levelWeight[s.level] ?? 0.5), 0)
        / requiredSkillNames.length * 100
      ));

  // Availability score
  const hours = member.availability?.hoursPerWeek ?? 0;
  const availScore = hours >= 20 ? 95 : hours >= 10 ? 75 : hours >= 5 ? 55 : 30;

  // Experience score
  const exp = member.experience ?? 0;
  const expScore = exp >= 5 ? 95 : exp >= 3 ? 80 : exp >= 1 ? 65 : 45;

  // Feedback score (from past rating)
  const feedbackScore = member.rating > 0 ? Math.round((member.rating / 5) * 100) : 70;

  const overall = Math.round(
    skillsScore * 0.45 + availScore * 0.25 + expScore * 0.20 + feedbackScore * 0.10
  );

  const matched = matchedSkills.map(s => s.name);

  const justifications = [
    matched.length > 0
      ? `Domina ${matched.slice(0, 2).join(' y ')}${matched.length > 2 ? ` y ${matched.length - 2} más` : ''}`
      : 'Perfil con habilidades complementarias',
    hours > 0 ? `Disponible ${hours}h/semana` : null,
    exp > 0 ? `${exp} año${exp !== 1 ? 's' : ''} de experiencia` : null,
    member.rating > 0 ? `Rating ${member.rating}/5` : null,
  ].filter(Boolean);

  return {
    user: member,
    role,
    overallScore: overall,
    breakdown: { skills: skillsScore, availability: availScore, experience: expScore, feedback: feedbackScore },
    matchedSkills: matched,
    justification: justifications.join(' · '),
  };
}

function generateProposals(project: Project, authUserId: string): TeamProposal[] {
  const roles = project.requiredRoles.length > 0
    ? project.requiredRoles.map(r => r.name)
    : ['Frontend Dev', 'Backend Dev', 'QA Engineer', 'Designer'].slice(0, project.teamSize - 1);

  const candidates = mockUsers.filter(u => u.id !== authUserId && u.id !== project.leaderId);

  // Shuffle candidates for variety across proposals
  const shuffled = (arr: User[], seed: number) =>
    [...arr].sort((a, b) => ((parseInt(a.id) * seed) % 7) - ((parseInt(b.id) * seed) % 7));

  return [1, 2, 3].map((seed, pi) => {
    const pool    = shuffled(candidates, seed * 3 + pi);
    const members = roles.map((role, i) => {
      const candidate = pool[i % pool.length];
      return computeMemberScore(candidate, project, role);
    });

    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const teamScore     = avg(members.map(m => m.overallScore));
    const complementarity = Math.min(100, avg(members.map(m => m.breakdown.skills)) + Math.floor(Math.random() * 10));
    const availMatch    = avg(members.map(m => m.breakdown.availability));
    const expBalance    = avg(members.map(m => m.breakdown.experience));

    return {
      id: `proposal_${pi}`,
      members,
      teamAffinityScore: teamScore,
      complementarity,
      availabilityMatch: availMatch,
      experienceBalance: expBalance,
      teamJustification: teamScore >= 80
        ? 'Equipo altamente complementario con excelente disponibilidad horaria y experiencia balanceada.'
        : teamScore >= 65
        ? 'Buen equilibrio de habilidades. Algunas brechas menores pueden resolverse con capacitación rápida.'
        : 'Equipo funcional con potencial de crecimiento. Se recomienda mentoría en áreas técnicas clave.',
    };
  });
}

// ─── member card ─────────────────────────────────────────────────────────────

function MemberCard({ ms }: { ms: MemberScore }) {
  const [expanded, setExpanded] = useState(false);

  const breakdown = [
    { label: 'Habilidades',    icon: Target,   value: ms.breakdown.skills       },
    { label: 'Disponibilidad', icon: Calendar,  value: ms.breakdown.availability },
    { label: 'Experiencia',    icon: TrendingUp, value: ms.breakdown.experience  },
    { label: 'Retroalim.',     icon: Star,      value: ms.breakdown.feedback     },
  ];

  return (
    <div className="rounded-xl border bg-card transition-all duration-200 hover:shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0 overflow-hidden">
            {ms.user.avatar
              ? <img src={ms.user.avatar} alt={ms.user.name} className="h-full w-full object-cover" />
              : <span className="text-sm font-bold text-white">{getInitials(ms.user.name)}</span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm truncate">{ms.user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{ms.role}</p>
              </div>
              {/* Overall score badge */}
              <div className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-bold ${scoreBadgeColor(ms.overallScore)}`}>
                <Sparkles className="h-3 w-3" />
                {ms.overallScore}%
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-2.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(ms.overallScore)}`}
                  style={{ width: `${ms.overallScore}%` }}
                />
              </div>
            </div>

            {/* Matched skills */}
            {ms.matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {ms.matchedSkills.slice(0, 3).map(s => (
                  <span key={s} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                    <CheckCircle2 className="h-2.5 w-2.5" />{s}
                  </span>
                ))}
                {ms.matchedSkills.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{ms.matchedSkills.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Justification */}
        <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">{ms.justification}</p>
      </div>

      {/* Expandable breakdown */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-medium text-muted-foreground"
      >
        <span>Ver desglose de score</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2.5 border-t bg-muted/20">
          {breakdown.map(b => (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <b.icon className="h-3 w-3" />
                  {b.label}
                </div>
                <span className={`text-xs font-bold ${scoreColor(b.value)}`}>{b.value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(b.value)}`}
                  style={{ width: `${b.value}%` }}
                />
              </div>
            </div>
          ))}

          {/* Extra info */}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground border-t mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ms.user.availability?.hoursPerWeek ?? 0}h/semana
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {ms.user.experience ?? 0} años exp.
            </span>
            {ms.user.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {ms.user.rating}/5 rating
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── proposal card ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal, index, onAccept,
}: {
  proposal: TeamProposal;
  index: number;
  onAccept: () => void;
}) {
  const metrics = [
    { label: 'Complementariedad', icon: Brain,  value: proposal.complementarity   },
    { label: 'Disponibilidad',    icon: Clock,   value: proposal.availabilityMatch },
    { label: 'Balance exp.',      icon: Shield,  value: proposal.experienceBalance },
  ];

  return (
    <Card className="overflow-hidden">
      {/* Proposal header */}
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-cyan-500/5 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Propuesta {index + 1}
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed">
              {proposal.teamJustification}
            </CardDescription>
          </div>

          {/* Team affinity score */}
          <div className="shrink-0 text-center">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/30" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeDasharray={`${proposal.teamAffinityScore} 100`}
                  strokeLinecap="round"
                  className={scoreColor(proposal.teamAffinityScore)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-sm font-bold leading-none ${scoreColor(proposal.teamAffinityScore)}`}>
                  {proposal.teamAffinityScore}
                </span>
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric bars */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {metrics.map(m => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <m.icon className="h-3 w-3" />{m.label}
                </span>
                <span className={`text-xs font-bold ${scoreColor(m.value)}`}>{m.value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBarColor(m.value)}`}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Member cards */}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Miembros sugeridos ({proposal.members.length})</span>
        </div>
        {proposal.members.map((ms, i) => (
          <MemberCard key={`${ms.user.id}_${i}`} ms={ms} />
        ))}
      </CardContent>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Button
          onClick={onAccept}
          className="flex-1 bg-gradient-to-r from-primary to-cyan-500 text-white hover:opacity-90 gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Aceptar esta propuesta
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Zap className="h-3.5 w-3.5" />
          Ajustar
        </Button>
      </div>
    </Card>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface TeamProposalsProps {
  project: Project;
  onClose?: () => void;
  onTeamAccepted?: (proposal: TeamProposal) => void;
}

export function TeamProposals({ project, onClose, onTeamAccepted }: TeamProposalsProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<TeamProposal[]>(() =>
    generateProposals(project, user?.id ?? '')
  );
  const [accepted, setAccepted]   = useState<string | null>(null);
  const [loading,  setLoading]    = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setProposals(generateProposals(project, user?.id ?? ''));
    setAccepted(null);
    setLoading(false);
  };

  const handleAccept = (proposal: TeamProposal) => {
    setAccepted(proposal.id);
    onTeamAccepted?.(proposal);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-xl font-bold">Motor de Matchmaking</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Propuestas generadas para <span className="font-medium text-foreground">{project.name}</span> · {proposals.length} alternativas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading} className="gap-2 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generando...' : 'Regenerar'}
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">¿Cómo funciona el score de afinidad?</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Cada miembro recibe un score 0–100 calculado con 4 criterios:
            <strong> Habilidades (45%)</strong> — coincidencia con los requisitos del proyecto,
            <strong> Disponibilidad (25%)</strong> — horas semanales disponibles,
            <strong> Experiencia (20%)</strong> — años trabajados,
            <strong> Retroalimentación (10%)</strong> — rating histórico de proyectos anteriores.
          </p>
        </div>
      </div>

      {/* Accepted banner */}
      {accepted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">¡Propuesta aceptada!</p>
            <p className="text-xs text-green-700">El equipo ha sido confirmado. Puedes asignar tareas desde la vista del proyecto.</p>
          </div>
        </div>
      )}

      {/* Proposal cards */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-4/5" />
              <div className="space-y-2">
                {[1,2,3].map(j => <div key={j} className="h-20 bg-muted rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {proposals.map((p, i) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              index={i}
              onAccept={() => handleAccept(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}