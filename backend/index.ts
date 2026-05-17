// Backend principal de TeamMatch
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import jwt, { Secret, VerifyOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

dotenv.config();

const app: Express = express();
const PORT: string | number = process.env.PORT || 3000;
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j';

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

app.use(cors());
app.use(express.json());


function createToken(payload: object) {
  const options = {
    algorithm: 'HS256' as jwt.Algorithm,
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

function verifyToken(token: string) {
  const verifyOptions: VerifyOptions = { algorithms: ['HS256'] };
  return jwt.verify(token, JWT_SECRET, verifyOptions);
}

async function findUserById(userId: string) {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (u:Usuario {userId: $userId}) RETURN u.userId AS userId, u.email AS email',
      { userId }
    );
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];
    return { userId: record.get('userId'), email: record.get('email') };
  } finally {
    await session.close();
  }
}

async function findUserByEmail(email: string) {
  const session = driver.session();
  try {
    const result = await session.run(
      'MATCH (u:Usuario {email: $email}) RETURN u.userId AS userId, u.email AS email, u.passwordHash AS passwordHash',
      { email }
    );
    if (result.records.length === 0) {
      return null;
    }
    const record = result.records[0];
    return {
      userId: record.get('userId'),
      email: record.get('email'),
      passwordHash: record.get('passwordHash')
    };
  } finally {
    await session.close();
  }
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token) as { sub?: string; email?: string };
    if (!payload.sub || !payload.email) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = { userId: user.userId, email: user.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}



app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TeamMatch backend' });
});


//Rutas de autenticación
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { user, email, password } = req.body ?? {};
  if (
    !user ||
    !email ||
    !password ||
    typeof user !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({ error: 'User, Email y Password son requeridos' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password debe tener al menos 8 caracteres' });
  }

  const userName = user.trim();
  const userEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const session = driver.session();
  try {
    const existing = await session.run(
      'MATCH (u:Usuario {email: $email}) RETURN u LIMIT 1',
      { email: userEmail }
    );
    if (existing.records.length > 0) {
      return res.status(409).json({ error: 'Usuario ya existe' });
    }

    await session.run(
      'CREATE (u:Usuario {userId: $userId, user: $user, email: $email, passwordHash: $passwordHash, createdAt: $createdAt})',
      {
        userId: randomUUID(),
        user: userName,
        email: userEmail,
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString()
      }
    );

    return res.status(201).json({ message: 'Usuario registrado' });
  } finally {
    await session.close();
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = createToken({ sub: user.userId, email: user.email });
  return res.json({ token });
});


app.get('/api/protected-route', requireAuth, (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
});


// Rutas de proyectos
app.post('/projects', requireAuth, async (req: Request, res: Response) => {
  const { title, description, roles } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Título es requerido' });
  }

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'Debe definir al menos un rol' });
  }

  const normalizedRoles = roles.map((item: any, index: number) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Rol inválido en la posición ${index}`);
    }
    const roleName = typeof item.role === 'string' ? item.role.trim() : '';
    if (!roleName) {
      throw new Error(`El nombre del rol es requerido en la posición ${index}`);
    }
    if (!Array.isArray(item.skills) || item.skills.length === 0) {
      throw new Error(`El rol '${roleName}' debe incluir al menos una skill`);
    }
    const skills = item.skills
      .filter((skill: any) => typeof skill === 'string' && skill.trim())
      .map((skill: string) => skill.trim());
    if (skills.length === 0) {
      throw new Error(`El rol '${roleName}' debe incluir al menos una skill válida`);
    }
    return { role: roleName, skills };
  });

  const allSkills = Array.from(new Set(normalizedRoles.flatMap((r) => r.skills)));
  const session = driver.session();

  try {
    const skillsResult = await session.run(
      'MATCH (s:Habilidad) WHERE s.name IN $names RETURN s.name AS name',
      { names: allSkills }
    );
    const foundSkills = new Set(skillsResult.records.map((record) => record.get('name')));
    const missingSkills = allSkills.filter((name) => !foundSkills.has(name));
    if (missingSkills.length > 0) {
      return res.status(400).json({ error: `Las siguientes habilidades no existen: ${missingSkills.join(', ')}` });
    }

    const projectId = randomUUID();
    const createdAt = new Date().toISOString();
    const summary = description && typeof description === 'string'
      ? description.trim().slice(0, 160) + (description.trim().length > 160 ? '...' : '')
      : '';

    await session.run(
      `MATCH (leader:Usuario {userId: $leaderId})
       CREATE (project:Proyecto {
         projectId: $projectId,
         title: $title,
         description: $description,
         summary: $summary,
         createdAt: $createdAt
       })
       MERGE (leader)-[:PERTENECE_A]->(project)
       WITH project
       UNWIND $roles AS roleInput
       CREATE (role:Rol { roleId: randomUUID(), name: roleInput.role })
       MERGE (project)-[:TIENE_ROL]->(role)
       WITH role, roleInput
       UNWIND roleInput.skills AS skillName
       MATCH (skill:Habilidad { name: skillName })
       MERGE (role)-[:REQUIERE]->(skill)
       RETURN project.projectId AS projectId`,
      {
        leaderId: req.user!.userId,
        projectId,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        summary,
        createdAt,
        roles: normalizedRoles
      }
    );

    return res.status(201).json({ projectId });
  } catch (error: any) {
    if (error.message?.startsWith('Rol inválido') || error.message?.startsWith('El nombre del rol') || error.message?.startsWith('El rol')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('POST /projects', error);
    return res.status(500).json({ error: 'Error al crear el proyecto' });
  } finally {
    await session.close();
  }
});

app.get('/projects', async (_req: Request, res: Response) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:Proyecto)<-[:PERTENECE_A]-(leader:Usuario)
       OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
       OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
       WITH p, leader, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
       WITH p, leader, collect(DISTINCT { role: r.name, skills: skills }) AS roles
       RETURN p.projectId AS projectId,
              p.title AS title,
              p.summary AS summary,
              p.createdAt AS createdAt,
              leader.userId AS leaderId,
              leader.email AS leaderEmail,
              roles
       ORDER BY p.createdAt DESC`
    );

    const projects = result.records.map((record) => {
      const rawRoles = record.get('roles') as Array<{ role: string; skills: string[] }>;
      const roles = Array.isArray(rawRoles)
        ? rawRoles.filter((role) => role.role != null)
        : [];
      return {
        id: record.get('projectId'),
        title: record.get('title'),
        summary: record.get('summary') || '',
        createdAt: record.get('createdAt'),
        leader: {
          userId: record.get('leaderId'),
          email: record.get('leaderEmail')
        },
        roles
      };
    });

    return res.json({ projects });
  } catch (error) {
    console.error('GET /projects', error);
    return res.status(500).json({ error: 'Error al obtener los proyectos' });
  }
   finally {
    await session.close();
  }
});

app.get('/projects/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:Proyecto {projectId: $projectId})<-[:PERTENECE_A]-(leader:Usuario)
       OPTIONAL MATCH (p)-[:TIENE_ROL]->(r:Rol)
       OPTIONAL MATCH (r)-[:REQUIERE]->(s:Habilidad)
       WITH p, leader, r, [name IN collect(DISTINCT s.name) WHERE name IS NOT NULL] AS skills
       WITH p, leader, collect(DISTINCT { role: r.name, skills: skills }) AS roles
       RETURN p.projectId AS projectId,
              p.title AS title,
              p.description AS description,
              p.summary AS summary,
              p.createdAt AS createdAt,
              leader.userId AS leaderId,
              leader.email AS leaderEmail,
              roles`,
      { projectId: id }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const record = result.records[0];
    const rawRoles = record.get('roles') as Array<{ role: string; skills: string[] }>;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.filter((role) => role.role != null)
      : [];

    return res.json({
      id: record.get('projectId'),
      title: record.get('title'),
      description: record.get('description') || '',
      summary: record.get('summary') || '',
      createdAt: record.get('createdAt'),
      leader: {
        userId: record.get('leaderId'),
        email: record.get('leaderEmail')
      },
      roles
    });
  } finally {
    await session.close();
  }
});



app.listen(PORT, (): void => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
});

export default app;
