import express, { Express } from 'express';
import cors from 'cors';
import authRoutes, { requireAuth } from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import projectsRoutes from '../routes/projects.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TeamMatch backend' });
});

app.use('/api/auth', authRoutes);
app.use(profileRoutes);
app.use('/projects', projectsRoutes);

app.get('/api/protected-route', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

app.use(errorHandler);

export default app;
