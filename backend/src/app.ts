import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import authRoutes, { requireAuth } from './modules/auth/auth.routes.js';
import availabilityRoutes from './modules/availability/availability.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import skillsRoutes from './modules/skills/skills.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';
import matchmakingRoutes from './modules/matchmaking/matchmaking.routes.js';
import feedbackRoutes from './modules/feedback/feedback.routes.js';
import matchRoutes from './modules/match/match.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import { env, isProduction } from './config/env.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { securityHeaders } from './shared/middlewares/securityHeaders.js';

function createCorsOptions(): CorsOptions {
  if (!isProduction) {
    return { origin: true };
  }

  return {
    origin(origin, callback): void {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    }
  };
}

const app: Express = express();

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TeamMatch backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', skillsRoutes);
app.use('/api', availabilityRoutes);
app.use('/api', feedbackRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/match', matchRoutes);
app.use('/projects', projectsRoutes);
app.use('/projects', matchmakingRoutes);
app.use('/tasks', tasksRoutes);
app.use('/teams', teamsRoutes);

app.get('/api/protected-route', requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

app.use(errorHandler);

export default app;
