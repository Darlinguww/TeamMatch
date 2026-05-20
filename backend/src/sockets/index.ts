import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env, isProduction } from '../config/env.js';
import type { TaskStatusUpdatedEvent } from '../modules/tasks/types/task.types.js';
import { projectRoom } from './rooms.js';
import { registerTaskSocketHandlers } from './taskSocket.js';

let io: Server | null = null;

export { projectRoom } from './rooms.js';

/** Inicializa Socket.io sobre el servidor HTTP de Express (SCRUM-202). */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: isProduction ? env.corsOrigins : true,
      credentials: true,
    },
    path: '/socket.io',
  });

  registerTaskSocketHandlers(io);
  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.io no inicializado. Llama initSocketServer() al arrancar.');
  }
  return io;
}

/** Emite desde otros módulos (ej. matchmaking completado). */
export function emitTaskStatusUpdated(payload: TaskStatusUpdatedEvent): void {
  getIo().to(projectRoom(payload.projectId)).emit('task:statusUpdated', payload);
}
