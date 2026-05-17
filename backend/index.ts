// Backend principal de TeamMatch
import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import projectsRoutes from './routes/projects';

dotenv.config();

const app: Express = express();
const PORT: string | number = process.env.PORT || 3000;

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TeamMatch backend' });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de proyectos
app.use('/projects', projectsRoutes);

app.listen(PORT, (): void => {
  console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
});

export default app;
