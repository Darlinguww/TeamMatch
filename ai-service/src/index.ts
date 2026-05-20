import './load-env.js';
import express, { Express, Request, Response, NextFunction } from 'express';
import { isAzureOpenAIConfigured } from './config/ai.config.js';
import { initAzureOpenAIClient } from './services/llm/azure-openai.client.js';
import aiRoutes from './routes/ai.routes.js';
import matchmakingRoutes from './routes/matchmaking.routes.js';
import { DocumentoDemasiadoGrandeError } from './services/llm/document-size.validator.js';
import { AzureOpenAIUnavailableError } from './services/llm/azure-openai.errors.js';

// Azure OpenAI (gpt-4.1-mini) — extracción, disponibilidad y matchmaking
if (isAzureOpenAIConfigured()) {
  initAzureOpenAIClient();
} else {
  console.warn(
    '[ai-service] Azure OpenAI no configurado. El servicio arrancará con extracción heurística/manual donde aplique.',
  );
}

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'teammatch-ai-service',
    modules: {
      azureOpenAI: {
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4.1-mini',
      },
    },
  });
});

app.use('/api/ai', aiRoutes);
app.use('/api/matchmaking', matchmakingRoutes);

// Middleware centralizado de errores
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof DocumentoDemasiadoGrandeError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof AzureOpenAIUnavailableError) {
    res.status(503).json({ error: err.message });
    return;
  }

  console.error('[ai-service]', err.message);
  res.status(500).json({ error: err.message || 'Error interno del servicio de IA.' });
});

app.listen(PORT, () => {
  console.log(`🧠 AI Service escuchando en el puerto ${PORT}`);
});

export default app;
