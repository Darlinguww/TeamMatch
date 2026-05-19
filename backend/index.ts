import app from './src/app.js';
import { env } from './src/config/env.js';
import { verifyConnectivity } from './src/config/neo4j.config.js';

if (env.nodeEnv !== 'test') {
  void (async (): Promise<void> => {
    await verifyConnectivity();
    app.listen(env.port, (): void => {
      console.log(`Backend running on port ${env.port}`);
    });
  })().catch((error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

export default app;
