import type { Project, User } from './mockData';

export interface AffinityBreakdown {
  skills: number;
  availability: number;
  experience: number;
  feedback: number;
}

export interface MemberAffinityScore {
  user: User;
  role: string;
  overallScore: number;
  breakdown: AffinityBreakdown;
  matchedSkills: string[];
  justification: string;
  aiJustification: string;
}

export interface TeamAffinitySummary {
  overallScore: number;
  complementarity: number;
  availabilityMatch: number;
  experienceBalance: number;
  teamJustification: string;
  aiJustification: string;
}

export const SCORE_WEIGHTS = {
  skills: 0.45,
  availability: 0.25,
  experience: 0.2,
  feedback: 0.1,
} as const;

export const SCORE_CRITERIA = [
  { key: 'skills' as const, label: 'Habilidades', weight: '45%' },
  { key: 'availability' as const, label: 'Disponibilidad', weight: '25%' },
  { key: 'experience' as const, label: 'Experiencia', weight: '20%' },
  { key: 'feedback' as const, label: 'Retroalimentación', weight: '10%' },
];

const levelWeight: Record<string, number> = {
  expert: 1,
  advanced: 0.85,
  intermediate: 0.65,
  beginner: 0.4,
};

export function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}

export function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export function scoreBadgeColor(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function buildMemberAiJustification(
  member: User,
  role: string,
  matched: string[],
  breakdown: AffinityBreakdown,
  overall: number
): string {
  const parts: string[] = [];

  if (overall >= 85) {
    parts.push(
      `La IA recomienda a ${member.name.split(' ')[0]} como candidato ideal para ${role}.`
    );
  } else if (overall >= 70) {
    parts.push(
      `La IA identifica a ${member.name.split(' ')[0]} como un buen encaje para ${role}.`
    );
  } else {
    parts.push(
      `La IA sugiere evaluar a ${member.name.split(' ')[0]} para ${role} con mentoría inicial.`
    );
  }

  if (matched.length > 0) {
    parts.push(
      `Cubre ${matched.slice(0, 3).join(', ')}${matched.length > 3 ? ` y ${matched.length - 3} habilidades más` : ''} requeridas por el proyecto.`
    );
  } else {
    parts.push('Aporta perfil complementario aunque con brechas técnicas menores.');
  }

  if (breakdown.availability >= 80) {
    parts.push('Su disponibilidad horaria encaja con la carga del sprint actual.');
  } else if (breakdown.availability < 55) {
    parts.push('Su disponibilidad limitada podría requerir ajuste de entregables.');
  }

  if (breakdown.feedback >= 85) {
    parts.push('Historial de colaboración sobresaliente en proyectos previos.');
  }

  return parts.join(' ');
}

export function computeMemberAffinityScore(
  member: User,
  project: Project,
  role: string
): MemberAffinityScore {
  const requiredSkillNames = project.requiredSkills.map((s) => s.name.toLowerCase());

  const matchedSkills = (member.skills ?? []).filter((s) =>
    requiredSkillNames.some(
      (r) =>
        r.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(r)
    )
  );

  const skillsScore =
    requiredSkillNames.length === 0
      ? 75
      : Math.min(
          100,
          Math.round(
            (matchedSkills.reduce(
              (acc, s) => acc + (levelWeight[s.level] ?? 0.5),
              0
            ) /
              requiredSkillNames.length) *
              100
          )
        );

  const hours = member.availability?.hoursPerWeek ?? 0;
  const availScore =
    hours >= 20 ? 95 : hours >= 10 ? 75 : hours >= 5 ? 55 : 30;

  const exp = member.experience ?? 0;
  const expScore = exp >= 5 ? 95 : exp >= 3 ? 80 : exp >= 1 ? 65 : 45;

  const feedbackScore =
    member.rating > 0 ? Math.round((member.rating / 5) * 100) : 70;

  const breakdown: AffinityBreakdown = {
    skills: skillsScore,
    availability: availScore,
    experience: expScore,
    feedback: feedbackScore,
  };

  const overall = Math.round(
    breakdown.skills * SCORE_WEIGHTS.skills +
      breakdown.availability * SCORE_WEIGHTS.availability +
      breakdown.experience * SCORE_WEIGHTS.experience +
      breakdown.feedback * SCORE_WEIGHTS.feedback
  );

  const matched = matchedSkills.map((s) => s.name);

  const justification = [
    matched.length > 0
      ? `Domina ${matched.slice(0, 2).join(' y ')}${matched.length > 2 ? ` y ${matched.length - 2} más` : ''}`
      : 'Perfil con habilidades complementarias',
    hours > 0 ? `Disponible ${hours}h/semana` : null,
    exp > 0 ? `${exp} año${exp !== 1 ? 's' : ''} de experiencia` : null,
    member.rating > 0 ? `Rating ${member.rating}/5` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const aiJustification = buildMemberAiJustification(
    member,
    role,
    matched,
    breakdown,
    overall
  );

  return {
    user: member,
    role,
    overallScore: overall,
    breakdown,
    matchedSkills: matched,
    justification,
    aiJustification,
  };
}

function buildTeamAiJustification(
  overall: number,
  complementarity: number,
  availabilityMatch: number,
  experienceBalance: number,
  memberCount: number
): string {
  const parts: string[] = [
    `Análisis de IA sobre el equipo (${memberCount} miembros): score global ${overall}%.`,
  ];

  if (complementarity >= 80) {
    parts.push(
      'Las habilidades del grupo son altamente complementarias y cubren los requisitos del proyecto.'
    );
  } else if (complementarity >= 65) {
    parts.push(
      'Existe buen balance de competencias con algunas áreas por reforzar.'
    );
  } else {
    parts.push(
      'Se detectan brechas de skills; conviene priorizar capacitación o un perfil adicional.'
    );
  }

  if (availabilityMatch >= 75) {
    parts.push('La disponibilidad conjunta permite cumplir los hitos planificados.');
  } else {
    parts.push('Revisar calendarios: la disponibilidad media del equipo es ajustada.');
  }

  if (experienceBalance >= 80) {
    parts.push('El balance de experiencia favorece mentoría junior-senior.');
  }

  return parts.join(' ');
}

export function computeTeamAffinity(
  members: MemberAffinityScore[]
): TeamAffinitySummary {
  if (members.length === 0) {
    return {
      overallScore: 0,
      complementarity: 0,
      availabilityMatch: 0,
      experienceBalance: 0,
      teamJustification: 'Sin miembros en el equipo.',
      aiJustification: 'Agrega miembros para obtener un análisis de afinidad del equipo.',
    };
  }

  const avg = (arr: number[]) =>
    Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const overallScore = avg(members.map((m) => m.overallScore));
  const complementarity = avg(members.map((m) => m.breakdown.skills));
  const availabilityMatch = avg(members.map((m) => m.breakdown.availability));
  const experienceBalance = avg(members.map((m) => m.breakdown.experience));

  const teamJustification =
    overallScore >= 80
      ? 'Equipo altamente complementario con excelente disponibilidad y experiencia balanceada.'
      : overallScore >= 65
        ? 'Buen equilibrio de habilidades. Algunas brechas menores pueden resolverse con capacitación.'
        : 'Equipo funcional con potencial de crecimiento. Se recomienda mentoría en áreas clave.';

  const aiJustification = buildTeamAiJustification(
    overallScore,
    complementarity,
    availabilityMatch,
    experienceBalance,
    members.length
  );

  return {
    overallScore,
    complementarity,
    availabilityMatch,
    experienceBalance,
    teamJustification,
    aiJustification,
  };
}
