import app from './src/app.js';
import { env } from './src/config/env.js';

if (env.nodeEnv !== 'test') {
  app.listen(env.port, (): void => {
    console.log(`Backend running on port ${env.port}`);
  });
}

export default app;
