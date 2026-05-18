import type {
  CandidateProfile,
  MatchmakingResult,
  ProjectRequirements,
  TeamProposal
} from './matchmaking.types.js';

const MAX_CANDIDATES = 100;
const MAX_TEXT_LENGTH = 2000;
const MAX_ARRAY_LENGTH = 30;

export class ValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} es requerido`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} debe tener ${maxLength} caracteres o menos`);
  }

  return trimmed;
}

function readNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`${field} debe ser un numero entre ${min} y ${max}`);
  }

  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > MAX_ARRAY_LENGTH) {
    throw new ValidationError(`${field} debe ser un arreglo de hasta ${MAX_ARRAY_LENGTH} strings`);
  }

  return value.map((item, index) => readString(item, `${field}[${index}]`, 120));
}

function validateProject(value: unknown): ProjectRequirements {
  if (!isRecord(value)) {
    throw new ValidationError('project es requerido');
  }

  const requiredRoles = value.requiredRoles;
  if (!Array.isArray(requiredRoles) || requiredRoles.length === 0 || requiredRoles.length > MAX_ARRAY_LENGTH) {
    throw new ValidationError('project.requiredRoles debe ser un arreglo no vacio');
  }

  return {
    projectId: readString(value.projectId, 'project.projectId', 120),
    projectName: readString(value.projectName, 'project.projectName', 200),
    description: readString(value.description, 'project.description'),
    teamSize: readNumber(value.teamSize, 'project.teamSize', 1, MAX_CANDIDATES),
    requiredRoles: requiredRoles.map((role, index) => {
      if (!isRecord(role)) {
        throw new ValidationError(`project.requiredRoles[${index}] debe ser un objeto`);
      }

      const priority = readString(role.priority, `project.requiredRoles[${index}].priority`, 20);
      if (!['high', 'medium', 'low'].includes(priority)) {
        throw new ValidationError(`project.requiredRoles[${index}].priority debe ser high, medium o low`);
      }

      return {
        role: readString(role.role, `project.requiredRoles[${index}].role`, 120),
        requiredSkills: readStringArray(role.requiredSkills, `project.requiredRoles[${index}].requiredSkills`),
        priority: priority as ProjectRequirements['requiredRoles'][number]['priority']
      };
    })
  };
}

function validateCandidate(value: unknown, index: number): CandidateProfile {
  if (!isRecord(value)) {
    throw new ValidationError(`candidates[${index}] debe ser un objeto`);
  }

  const skills = Array.isArray(value.skills) ? value.skills : [];
  const experience = Array.isArray(value.experience) ? value.experience : [];
  const feedbackHistory = Array.isArray(value.feedbackHistory) ? value.feedbackHistory : [];
  const availability = isRecord(value.availability) ? value.availability : {};

  if (skills.length > MAX_ARRAY_LENGTH || experience.length > MAX_ARRAY_LENGTH || feedbackHistory.length > MAX_ARRAY_LENGTH) {
    throw new ValidationError(`candidates[${index}] excede el limite de datos permitido`);
  }

  return {
    userId: readString(value.userId, `candidates[${index}].userId`, 120),
    name: readString(value.name, `candidates[${index}].name`, 200),
    skills: skills.map((skill, skillIndex) => {
      if (!isRecord(skill)) {
        throw new ValidationError(`candidates[${index}].skills[${skillIndex}] debe ser un objeto`);
      }

      return {
        name: readString(skill.name, `candidates[${index}].skills[${skillIndex}].name`, 120),
        level: readString(skill.level, `candidates[${index}].skills[${skillIndex}].level`, 60),
        category: readString(skill.category, `candidates[${index}].skills[${skillIndex}].category`, 60)
      };
    }),
    experience: experience.map((item, experienceIndex) => {
      if (!isRecord(item)) {
        throw new ValidationError(`candidates[${index}].experience[${experienceIndex}] debe ser un objeto`);
      }

      return {
        role: readString(item.role, `candidates[${index}].experience[${experienceIndex}].role`, 120),
        years: readNumber(item.years, `candidates[${index}].experience[${experienceIndex}].years`, 0, 80),
        skills: readStringArray(item.skills, `candidates[${index}].experience[${experienceIndex}].skills`)
      };
    }),
    availability: {
      hoursPerWeek: readNumber(availability.hoursPerWeek, `candidates[${index}].availability.hoursPerWeek`, 0, 168),
      schedule: readString(availability.schedule, `candidates[${index}].availability.schedule`, 500)
    },
    feedbackHistory: feedbackHistory.map((item, feedbackIndex) => {
      if (!isRecord(item)) {
        throw new ValidationError(`candidates[${index}].feedbackHistory[${feedbackIndex}] debe ser un objeto`);
      }

      return {
        collaboration: readNumber(item.collaboration, `candidates[${index}].feedbackHistory[${feedbackIndex}].collaboration`, 0, 5),
        communication: readNumber(item.communication, `candidates[${index}].feedbackHistory[${feedbackIndex}].communication`, 0, 5),
        technicalSkills: readNumber(item.technicalSkills, `candidates[${index}].feedbackHistory[${feedbackIndex}].technicalSkills`, 0, 5),
        overallRating: readNumber(item.overallRating, `candidates[${index}].feedbackHistory[${feedbackIndex}].overallRating`, 0, 5)
      };
    })
  };
}

export function validateMatchmakingRequest(value: unknown): {
  project: ProjectRequirements;
  candidates: CandidateProfile[];
} {
  if (!isRecord(value)) {
    throw new ValidationError('El body debe ser un objeto');
  }

  if (!Array.isArray(value.candidates) || value.candidates.length === 0) {
    throw new ValidationError('candidates debe ser un arreglo no vacio');
  }

  if (value.candidates.length > MAX_CANDIDATES) {
    throw new ValidationError(`Maximo ${MAX_CANDIDATES} candidatos por solicitud`);
  }

  return {
    project: validateProject(value.project),
    candidates: value.candidates.map(validateCandidate)
  };
}

function clampScore(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 0;
}

function validateProposal(value: unknown, index: number): TeamProposal {
  if (!isRecord(value)) {
    throw new Error(`Azure OpenAI retorno una propuesta invalida en proposals[${index}]`);
  }

  const members = Array.isArray(value.members) ? value.members : [];
  if (members.length === 0 || members.length > MAX_CANDIDATES) {
    throw new Error(`Azure OpenAI retorno miembros invalidos en proposals[${index}]`);
  }

  return {
    proposalId: readString(value.proposalId, `proposals[${index}].proposalId`, 120),
    teamScore: clampScore(value.teamScore),
    members: members.map((member, memberIndex) => {
      if (!isRecord(member) || !isRecord(member.scoreBreakdown)) {
        throw new Error(`Azure OpenAI retorno un miembro invalido en proposals[${index}].members[${memberIndex}]`);
      }

      return {
        userId: readString(member.userId, `proposals[${index}].members[${memberIndex}].userId`, 120),
        name: readString(member.name, `proposals[${index}].members[${memberIndex}].name`, 200),
        proposedRole: readString(member.proposedRole, `proposals[${index}].members[${memberIndex}].proposedRole`, 120),
        affinityScore: clampScore(member.affinityScore),
        scoreBreakdown: {
          skillMatch: clampScore(member.scoreBreakdown.skillMatch),
          availability: clampScore(member.scoreBreakdown.availability),
          experience: clampScore(member.scoreBreakdown.experience),
          collaborationHistory: clampScore(member.scoreBreakdown.collaborationHistory)
        },
        justification: readString(member.justification, `proposals[${index}].members[${memberIndex}].justification`, 500)
      };
    }),
    complementarityAnalysis: readString(value.complementarityAnalysis, `proposals[${index}].complementarityAnalysis`, 1000),
    risks: readStringArray(value.risks, `proposals[${index}].risks`),
    strengths: readStringArray(value.strengths, `proposals[${index}].strengths`)
  };
}

export function validateMatchmakingResult(value: unknown): Pick<MatchmakingResult, 'proposals'> {
  try {
    if (!isRecord(value) || !Array.isArray(value.proposals)) {
      throw new Error('Azure OpenAI retorno una respuesta sin proposals');
    }

    return {
      proposals: value.proposals.map(validateProposal)
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error('Azure OpenAI retorno una respuesta con estructura invalida');
    }

    throw error;
  }
}
