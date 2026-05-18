import './load-env.js';
import express, { Express, Request, Response, NextFunction } from 'express';
import { getRequiredEnv } from './config/env.js';
import { initGeminiClient } from './services/gemini.service.js';
import { initAzureOpenAIClient } from './services/llm/azure-openai.client.js';
import { requireInternalServiceToken } from './middlewares/internal-auth.middleware.js';
import { aiApiRateLimiter } from './middlewares/rateLimit.js';
import aiRoutes from './routes/ai.routes.js';
import matchmakingRoutes from './routes/matchmaking.routes.js';

// M2 — Gemini (habilidades)
getRequiredEnv('GEMINI_API_KEY');
getRequiredEnv('INTERNAL_AI_SERVICE_TOKEN');
initGeminiClient();

// M3 — Azure OpenAI (matchmaking)
initAzureOpenAIClient();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'teammatch-ai-service',
    modules: {
      gemini: { model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' },
      azureOpenAI: { deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4.1-mini' },
    },
  });
});

app.use('/api', requireInternalServiceToken, aiApiRateLimiter);
app.use('/api/ai', aiRoutes);
app.use('/api/matchmaking', matchmakingRoutes);

// Middleware centralizado de errores
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ai-service]', err.message);
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Error interno del servicio de IA.' });
});

app.listen(PORT, () => {
  console.log(`AI Service escuchando en el puerto ${PORT}`);
});

export default app;
