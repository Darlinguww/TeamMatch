/** Catálogo de habilidades y roles para sugerencias en la UI (alineado con backend). */
export const SKILL_SUGGESTIONS = [
  'Java', 'JavaScript', 'TypeScript', 'Python', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift',
  'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Spring Boot', 'Django', 'FastAPI',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Neo4j', 'GraphQL', 'REST API',
  'Docker', 'Kubernetes', 'Terraform', 'AWS', 'Azure', 'Google Cloud', 'CI/CD', 'Git',
  'Ciberseguridad', 'Redes de computadoras', 'Firewall', 'VPN', 'Pentesting', 'SOC', 'Criptografía',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Power BI', 'Tableau', 'Análisis de datos',
  'Figma', 'UX', 'UI', 'User Research', 'Adobe XD', 'Photoshop',
  'QA', 'Selenium', 'Cypress', 'Playwright', 'Jest',
  'Contabilidad', 'Finanzas', 'Excel', 'SAP', 'ERP', 'CRM', 'Marketing digital', 'SEO',
  'Product Management', 'Análisis de negocio', 'Scrum', 'Kanban', 'Metodologías Ágiles', 'Gestión de Proyectos',
  'Liderazgo', 'Comunicación', 'Negociación', 'Trabajo en equipo', 'Resolución de conflictos',
  'Pensamiento crítico', 'Creatividad', 'Empatía', 'Mentoría', 'Presentaciones',
  'Inglés', 'Francés', 'Portugués',
  'Recursos Humanos', 'Logística', 'IoT', 'Blockchain', 'Telemedicina',
] as const;

export const ROLE_SUGGESTIONS = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Mobile Developer',
  'DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer',
  'Data Scientist', 'Data Analyst', 'ML Engineer', 'BI Analyst',
  'QA Engineer', 'Test Automation Engineer', 'Security Engineer', 'Network Engineer',
  'Cybersecurity Analyst', 'SOC Analyst', 'UX/UI Designer', 'Product Designer',
  'Product Manager', 'Scrum Master', 'Tech Lead', 'Software Architect',
  'Accountant', 'Financial Analyst', 'HR Specialist', 'Marketing Specialist',
  'Content Writer', 'Business Analyst', 'Project Manager', 'Community Manager',
  'IoT Developer', 'Blockchain Developer', 'Support Engineer', 'Database Administrator',
] as const;

export interface SuggestedSkillPayload {
  name: string;
  category?: string;
  level?: string;
  yearsOfExperience?: number;
}

export function levelToYears(level?: string): number {
  switch (level) {
    case 'expert': return 8;
    case 'advanced': return 5;
    case 'intermediate': return 2;
    case 'beginner': return 1;
    default: return 0;
  }
}

export function mapApiCategory(category?: string): 'technical' | 'soft' | 'language' | 'domain' {
  const c = (category ?? '').toLowerCase();
  if (c.includes('bland') || c === 'soft') return 'soft';
  if (c.includes('idioma') || c === 'language') return 'language';
  if (c.includes('dominio') || c === 'domain') return 'domain';
  return 'technical';
}
