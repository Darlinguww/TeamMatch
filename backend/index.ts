import { createServer } from 'http';
import app from './src/app.js';
import { env } from './src/config/env.js';
import { verifyConnectivity } from './src/config/neo4j.config.js';
import { initSocketServer } from './src/sockets/index.js';

if (env.nodeEnv !== 'test') {
  void (async (): Promise<void> => {
    await verifyConnectivity();

    const httpServer = createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(env.port, (): void => {
      console.log(`Backend running on port ${env.port} (REST + WebSocket /socket.io)`);
    });
  })().catch((error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

export default app;
