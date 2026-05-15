// Mock data for TeamMatch

export interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'domain';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio: string;
  skills: Skill[];
  interests: string[];
  experience: number; // years
  availability: {
    hoursPerWeek: number;
    preferredTimes: string[];
  };
  completedProjects: number;
  rating: number; // 0-5
  joinedDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'open' | 'in-progress' | 'completed';
  leaderId: string;
  requiredSkills: Skill[];
  requiredRoles: Role[];
  teamSize: number;
  currentTeamSize: number;
  startDate: string;
  estimatedDuration: number; // weeks
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
}

export interface TeamMember {
  userId: string;
  projectId: string;
  role: string;
  joinedDate: string;
  tasksCompleted: number;
  totalTasks: number;
  rating?: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdDate: string;
}

export interface Feedback {
  id: string;
  fromUserId: string;
  toUserId: string;
  projectId: string;
  rating: number;
  collaboration: number;
  communication: number;
  technicalSkills: number;
  comment: string;
  date: string;
}

export interface TeamSuggestion {
  projectId: string;
  members: User[];
  affinityScore: number;
  reasoning: string;
  complementarity: number;
  availability: number;
}

// Current user (mock)
export const currentUser: User = {
  id: '1',
  name: 'María García',
  email: 'maria.garcia@example.com',
  bio: 'Desarrolladora Full Stack apasionada por crear soluciones innovadoras',
  skills: [
    { id: 's1', name: 'React', category: 'technical', level: 'advanced' },
    { id: 's2', name: 'Node.js', category: 'technical', level: 'intermediate' },
    { id: 's3', name: 'Liderazgo', category: 'soft', level: 'intermediate' },
    { id: 's4', name: 'Comunicación', category: 'soft', level: 'advanced' },
    { id: 's5', name: 'Python', category: 'technical', level: 'intermediate' },
  ],
  interests: ['Web Development', 'IA', 'UX Design', 'Startups'],
  experience: 3,
  availability: {
    hoursPerWeek: 20,
    preferredTimes: ['Tardes', 'Fines de semana'],
  },
  completedProjects: 8,
  rating: 4.7,
  joinedDate: '2023-01-15',
};

export const mockUsers: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Carlos Rodríguez',
    email: 'carlos.r@example.com',
    bio: 'Backend developer con experiencia en arquitecturas escalables',
    skills: [
      { id: 's6', name: 'Java', category: 'technical', level: 'expert' },
      { id: 's7', name: 'Docker', category: 'technical', level: 'advanced' },
      { id: 's8', name: 'SQL', category: 'technical', level: 'expert' },
      { id: 's9', name: 'Trabajo en equipo', category: 'soft', level: 'advanced' },
    ],
    interests: ['Microservicios', 'Cloud', 'DevOps'],
    experience: 5,
    availability: { hoursPerWeek: 15, preferredTimes: ['Mañanas'] },
    completedProjects: 12,
    rating: 4.9,
    joinedDate: '2022-06-20',
  },
  {
    id: '3',
    name: 'Ana Martínez',
    email: 'ana.m@example.com',
    bio: 'Diseñadora UX/UI enfocada en experiencias centradas en el usuario',
    skills: [
      { id: 's10', name: 'Figma', category: 'technical', level: 'expert' },
      { id: 's11', name: 'User Research', category: 'technical', level: 'advanced' },
      { id: 's12', name: 'Creatividad', category: 'soft', level: 'expert' },
      { id: 's13', name: 'Adobe XD', category: 'technical', level: 'advanced' },
    ],
    interests: ['UX Design', 'Accesibilidad', 'Design Systems'],
    experience: 4,
    availability: { hoursPerWeek: 18, preferredTimes: ['Tardes', 'Noches'] },
    completedProjects: 10,
    rating: 4.8,
    joinedDate: '2022-09-10',
  },
  {
    id: '4',
    name: 'Diego López',
    email: 'diego.l@example.com',
    bio: 'Data Scientist especializado en Machine Learning',
    skills: [
      { id: 's14', name: 'Python', category: 'technical', level: 'expert' },
      { id: 's15', name: 'Machine Learning', category: 'technical', level: 'advanced' },
      { id: 's16', name: 'TensorFlow', category: 'technical', level: 'advanced' },
      { id: 's17', name: 'Análisis crítico', category: 'soft', level: 'advanced' },
    ],
    interests: ['IA', 'Deep Learning', 'Data Visualization'],
    experience: 6,
    availability: { hoursPerWeek: 12, preferredTimes: ['Mañanas', 'Tardes'] },
    completedProjects: 15,
    rating: 4.9,
    joinedDate: '2021-03-05',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'EcoTrack - App de Sostenibilidad',
    description: 'Aplicación móvil para rastrear y reducir la huella de carbono personal',
    status: 'open',
    leaderId: '2',
    requiredSkills: [
      { id: 's1', name: 'React Native', category: 'technical', level: 'intermediate' },
      { id: 's18', name: 'UI Design', category: 'technical', level: 'intermediate' },
      { id: 's19', name: 'API Development', category: 'technical', level: 'intermediate' },
    ],
    requiredRoles: [
      { id: 'r1', name: 'Frontend Developer', description: 'Desarrollar la interfaz móvil', requiredSkills: ['React Native', 'JavaScript'] },
      { id: 'r2', name: 'UX Designer', description: 'Diseñar la experiencia de usuario', requiredSkills: ['Figma', 'User Research'] },
      { id: 'r3', name: 'Backend Developer', description: 'Crear APIs y gestionar datos', requiredSkills: ['Node.js', 'MongoDB'] },
    ],
    teamSize: 4,
    currentTeamSize: 1,
    startDate: '2026-04-20',
    estimatedDuration: 12,
    category: 'Mobile App',
    difficulty: 'medium',
  },
  {
    id: 'p2',
    name: 'SmartHealth - Plataforma de Telemedicina',
    description: 'Sistema de consultas médicas en línea con historial clínico digital',
    status: 'in-progress',
    leaderId: '4',
    requiredSkills: [
      { id: 's6', name: 'Java', category: 'technical', level: 'advanced' },
      { id: 's20', name: 'Security', category: 'technical', level: 'advanced' },
      { id: 's1', name: 'React', category: 'technical', level: 'advanced' },
    ],
    requiredRoles: [
      { id: 'r4', name: 'Full Stack Developer', description: 'Desarrollo completo', requiredSkills: ['React', 'Java', 'SQL'] },
      { id: 'r5', name: 'Security Specialist', description: 'Garantizar seguridad HIPAA', requiredSkills: ['Security', 'Encryption'] },
      { id: 'r6', name: 'Product Manager', description: 'Gestionar producto', requiredSkills: ['Liderazgo', 'Comunicación'] },
    ],
    teamSize: 5,
    currentTeamSize: 3,
    startDate: '2026-03-01',
    estimatedDuration: 20,
    category: 'Web Platform',
    difficulty: 'hard',
  },
  {
    id: 'p3',
    name: 'LearnHub - Plataforma Educativa',
    description: 'Marketplace de cursos online con gamificación y seguimiento de progreso',
    status: 'open',
    leaderId: '1',
    requiredSkills: [
      { id: 's1', name: 'React', category: 'technical', level: 'intermediate' },
      { id: 's2', name: 'Node.js', category: 'technical', level: 'intermediate' },
      { id: 's10', name: 'Figma', category: 'technical', level: 'intermediate' },
    ],
    requiredRoles: [
      { id: 'r7', name: 'Frontend Developer', description: 'Interfaz de usuario', requiredSkills: ['React', 'CSS'] },
      { id: 'r8', name: 'Backend Developer', description: 'API y base de datos', requiredSkills: ['Node.js', 'MongoDB'] },
      { id: 'r9', name: 'UI/UX Designer', description: 'Diseño visual', requiredSkills: ['Figma', 'User Research'] },
    ],
    teamSize: 4,
    currentTeamSize: 2,
    startDate: '2026-05-01',
    estimatedDuration: 16,
    category: 'Education',
    difficulty: 'medium',
  },
  {
    id: 'p4',
    name: 'AI Assistant - Chatbot Inteligente',
    description: 'Asistente virtual con procesamiento de lenguaje natural para soporte al cliente',
    status: 'open',
    leaderId: '4',
    requiredSkills: [
      { id: 's14', name: 'Python', category: 'technical', level: 'advanced' },
      { id: 's15', name: 'Machine Learning', category: 'technical', level: 'advanced' },
      { id: 's21', name: 'NLP', category: 'technical', level: 'intermediate' },
    ],
    requiredRoles: [
      { id: 'r10', name: 'ML Engineer', description: 'Entrenar modelos de IA', requiredSkills: ['Python', 'TensorFlow', 'NLP'] },
      { id: 'r11', name: 'Data Engineer', description: 'Pipelines de datos', requiredSkills: ['Python', 'SQL', 'ETL'] },
      { id: 'r12', name: 'Frontend Developer', description: 'Interfaz del chatbot', requiredSkills: ['React', 'JavaScript'] },
    ],
    teamSize: 3,
    currentTeamSize: 1,
    startDate: '2026-04-15',
    estimatedDuration: 10,
    category: 'AI/ML',
    difficulty: 'hard',
  },
];

export const mockTeamMembers: TeamMember[] = [
  {
    userId: '1',
    projectId: 'p2',
    role: 'Full Stack Developer',
    joinedDate: '2026-03-01',
    tasksCompleted: 8,
    totalTasks: 12,
  },
  {
    userId: '2',
    projectId: 'p2',
    role: 'Backend Lead',
    joinedDate: '2026-03-01',
    tasksCompleted: 10,
    totalTasks: 10,
    rating: 5,
  },
  {
    userId: '3',
    projectId: 'p2',
    role: 'UX Designer',
    joinedDate: '2026-03-05',
    tasksCompleted: 6,
    totalTasks: 8,
  },
];

export const mockTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p2',
    title: 'Diseñar sistema de autenticación',
    description: 'Crear flujo de login/registro con recuperación de contraseña',
    assignedTo: '1',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2026-04-18',
    createdDate: '2026-04-01',
  },
  {
    id: 't2',
    projectId: 'p2',
    title: 'Implementar API de consultas',
    description: 'Desarrollar endpoints para programar y gestionar consultas médicas',
    assignedTo: '2',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-04-15',
    createdDate: '2026-03-28',
  },
  {
    id: 't3',
    projectId: 'p2',
    title: 'Prototipar dashboard médico',
    description: 'Crear mockups interactivos del panel del doctor',
    assignedTo: '3',
    status: 'completed',
    priority: 'medium',
    dueDate: '2026-04-12',
    createdDate: '2026-03-25',
  },
  {
    id: 't4',
    projectId: 'p2',
    title: 'Integrar videollamadas',
    description: 'Implementar WebRTC para consultas en vivo',
    assignedTo: '1',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-04-25',
    createdDate: '2026-04-05',
  },
];

export const mockFeedback: Feedback[] = [
  {
    id: 'f1',
    fromUserId: '2',
    toUserId: '1',
    projectId: 'p2',
    rating: 5,
    collaboration: 5,
    communication: 4,
    technicalSkills: 5,
    comment: 'Excelente compañera de equipo, siempre dispuesta a ayudar y con gran dominio técnico',
    date: '2026-04-08',
  },
  {
    id: 'f2',
    fromUserId: '1',
    toUserId: '3',
    projectId: 'p2',
    rating: 5,
    collaboration: 5,
    communication: 5,
    technicalSkills: 5,
    comment: 'Ana es increíble, sus diseños son siempre impecables y muy centrados en el usuario',
    date: '2026-04-08',
  },
];

// Matchmaking algorithm (mock)
export function generateTeamSuggestions(projectId: string): TeamSuggestion {
  const project = mockProjects.find(p => p.id === projectId);
  if (!project) throw new Error('Project not found');

  // Simple mock algorithm - in reality this would be much more complex
  const availableUsers = mockUsers.filter(u => u.id !== project.leaderId);
  const neededMembers = project.teamSize - project.currentTeamSize;
  const selectedMembers = availableUsers.slice(0, neededMembers);

  return {
    projectId,
    members: selectedMembers,
    affinityScore: 87,
    reasoning: 'Este equipo tiene una excelente complementariedad de habilidades técnicas y disponibilidad compatible',
    complementarity: 92,
    availability: 85,
  };
}

export function calculateAffinityScore(user1: User, user2: User): number {
  // Mock calculation - would be more sophisticated in production
  let score = 50;

  // Check skill complementarity
  const commonSkills = user1.skills.filter(s1 => 
    user2.skills.some(s2 => s2.name === s1.name)
  );
  score += commonSkills.length * 5;

  // Check common interests
  const commonInterests = user1.interests.filter(i => user2.interests.includes(i));
  score += commonInterests.length * 3;

  // Consider experience levels
  const expDiff = Math.abs(user1.experience - user2.experience);
  if (expDiff <= 2) score += 10;

  return Math.min(score, 100);
}

export interface Subject {
  id: string;
  name: string;
  weeklyHours: number;
  completedHours: number;
  difficulty: 'easy' | 'medium' | 'hard';
  color: string;
  priority?: number;
  examDate?: string;
}

export interface ProductivityStat {
  date: string;
  focusScore: number;
  hoursStudied: number;
  sessionsCompleted: number;
  distractions: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

export const mockSubjects: Subject[] = [
  { id: 'sub1', name: 'Matemáticas', weeklyHours: 8, completedHours: 6, difficulty: 'hard', color: '#0ea5e9' },
  { id: 'sub2', name: 'Programación', weeklyHours: 10, completedHours: 9, difficulty: 'medium', color: '#10b981' },
  { id: 'sub3', name: 'Física', weeklyHours: 6, completedHours: 3, difficulty: 'hard', color: '#8b5cf6' },
  { id: 'sub4', name: 'Historia', weeklyHours: 4, completedHours: 4, difficulty: 'easy', color: '#f59e0b' },
  { id: 'sub5', name: 'Inglés', weeklyHours: 3, completedHours: 2, difficulty: 'easy', color: '#ef4444' },
];

export const mockProductivityStats: ProductivityStat[] = [
  { date: '2026-04-07', focusScore: 72, hoursStudied: 3.5, sessionsCompleted: 3, distractions: 8 },
  { date: '2026-04-08', focusScore: 68, hoursStudied: 2.0, sessionsCompleted: 2, distractions: 12 },
  { date: '2026-04-09', focusScore: 80, hoursStudied: 4.0, sessionsCompleted: 4, distractions: 5 },
  { date: '2026-04-10', focusScore: 85, hoursStudied: 5.0, sessionsCompleted: 5, distractions: 3 },
  { date: '2026-04-11', focusScore: 78, hoursStudied: 3.0, sessionsCompleted: 3, distractions: 7 },
  { date: '2026-04-12', focusScore: 90, hoursStudied: 6.0, sessionsCompleted: 6, distractions: 2 },
  { date: '2026-04-13', focusScore: 88, hoursStudied: 4.5, sessionsCompleted: 4, distractions: 4 },
];

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec1',
    title: 'Aumenta tus sesiones de Física',
    description: 'Solo has completado el 50% de tus horas semanales de Física. Programa 2 sesiones adicionales esta semana.',
    priority: 'high',
    timestamp: '2026-04-13T09:00:00',
  },
  {
    id: 'rec2',
    title: 'Aprovecha tu pico de concentración',
    description: 'Tus datos muestran que rindes mejor entre 9:00 y 12:00. Reserva ese bloque para Matemáticas.',
    priority: 'medium',
    timestamp: '2026-04-13T10:30:00',
  },
  {
    id: 'rec3',
    title: 'Toma descansos más frecuentes',
    description: 'Reducir sesiones a bloques de 45 minutos con descansos de 10 minutos puede mejorar tu concentración.',
    priority: 'low',
    timestamp: '2026-04-13T11:00:00',
  },
];

export function predictAcademicLoad(subjects: Subject[]): { week: string; load: number; subjects: string[] }[] {
  const baseLoad = subjects.reduce((acc, s) => acc + s.weeklyHours, 0);
  const allNames = subjects.map(s => s.name);
  const hardNames = subjects.filter(s => s.difficulty === 'hard').map(s => s.name);
  return [
    { week: 'Semana 1', load: Math.min(Math.round((baseLoad / 40) * 65), 100), subjects: allNames.slice(0, 3) },
    { week: 'Semana 2', load: Math.min(Math.round((baseLoad / 40) * 72), 100), subjects: allNames.slice(1, 4) },
    { week: 'Semana 3', load: Math.min(Math.round((baseLoad / 40) * 78), 100), subjects: allNames.slice(0, 4) },
    { week: 'Semana 4', load: Math.min(Math.round((baseLoad / 40) * 95), 100), subjects: hardNames.length ? hardNames : allNames },
  ];
}

export function generateAISchedule(subjects: Subject[]): StudySession[] {
  const baseDate = new Date('2026-03-10');
  const sessions: StudySession[] = [];
  const times = ['09:00', '11:00', '14:00', '16:00', '19:00'];
  const types: StudySession['type'][] = ['pomodoro', 'deep-work', 'review', 'practice'];
  let sessionIndex = 0;

  subjects.forEach((subject, subjectIdx) => {
    const sessionsCount = subject.difficulty === 'hard' ? 3 : subject.difficulty === 'medium' ? 2 : 1;
    for (let i = 0; i < sessionsCount; i++) {
      const dayOffset = (subjectIdx * 2 + i) % 7;
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];
      const startTime = times[(sessionIndex) % times.length];
      const duration = subject.difficulty === 'hard' ? 60 : subject.difficulty === 'medium' ? 45 : 30;
      const [h, m] = startTime.split(':').map(Number);
      const endDate = new Date(0, 0, 0, h, m + duration);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      sessions.push({
        id: `ai-${sessionIndex++}`,
        date: dateStr,
        subjectId: subject.id,
        subjectName: subject.name,
        startTime,
        endTime,
        duration,
        type: types[subjectIdx % types.length],
        completed: false,
      });
    }
  });

  return sessions;
}

export interface StudySession {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  type: 'pomodoro' | 'deep-work' | 'review' | 'practice';
  completed: boolean;
}

export const mockStudySessions: StudySession[] = [
  { id: 'ss1', date: '2026-03-14', subjectId: 'sub1', subjectName: 'Matemáticas', startTime: '09:00', endTime: '09:25', duration: 25, type: 'pomodoro', completed: true },
  { id: 'ss2', date: '2026-03-14', subjectId: 'sub2', subjectName: 'Programación', startTime: '10:00', endTime: '11:00', duration: 60, type: 'deep-work', completed: true },
  { id: 'ss3', date: '2026-03-14', subjectId: 'sub3', subjectName: 'Física', startTime: '14:00', endTime: '14:25', duration: 25, type: 'pomodoro', completed: false },
  { id: 'ss4', date: '2026-03-14', subjectId: 'sub4', subjectName: 'Historia', startTime: '15:00', endTime: '15:30', duration: 30, type: 'review', completed: false },
];
