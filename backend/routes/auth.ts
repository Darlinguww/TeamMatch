import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { driver, findUserByEmail } from '../utils/db';
import { createToken } from '../middleware/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
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

router.post('/login', async (req: Request, res: Response) => {
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

export default router;
