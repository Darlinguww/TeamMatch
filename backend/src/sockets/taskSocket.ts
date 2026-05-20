import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../shared/utils/jwt.js';
import { Neo4jTaskRepository } from '../modules/tasks/repositories/task.repository.js';
import { TaskService } from '../modules/tasks/task.service.js';
import { AppError } from '../shared/errors/AppError.js';
import { ConflictError } from '../shared/errors/HttpErrors.js';
import { projectRoom } from './rooms.js';

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
  };
}

const taskService = new TaskService(new Neo4jTaskRepository());

function socketErrorPayload(error: unknown): { code: string; message: string } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: 'SOCKET_ERROR', message: error.message };
  }
  return { code: 'SOCKET_ERROR', message: 'Error inesperado' };
}

export function registerTaskSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token.trim()) {
        next(new Error('Token requerido'));
        return;
      }
      const payload = verifyAccessToken(token.trim());
      (socket as AuthenticatedSocket).data = {
        userId: payload.sub,
        email: payload.email,
      };
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    socket.on('project:join', async (payload: unknown, ack?: (response: unknown) => void) => {
      try {
        const projectId = parseProjectId(payload);
        await taskService.ensureProjectAccessForSocket(authSocket.data.userId, projectId);
        await socket.join(projectRoom(projectId));
        ack?.({ ok: true, projectId, room: projectRoom(projectId) });
      } catch (error) {
        ack?.({ ok: false, ...socketErrorPayload(error) });
      }
    });

    socket.on('project:leave', (payload: unknown) => {
      const projectId = parseProjectId(payload);
      void socket.leave(projectRoom(projectId));
    });

    socket.on('task:updateStatus', async (payload: unknown, ack?: (response: unknown) => void) => {
      try {
        const input = parseUpdateStatusPayload(payload);
        const task = await taskService.updateTaskStatusViaSocket(authSocket.data.userId, input);

        const event = {
          projectId: input.projectId,
          task,
          updatedBy: authSocket.data.userId,
        };
        io.to(projectRoom(input.projectId)).emit('task:statusUpdated', event);
        // Confirmación al emisor (útil en Postman / Thunder Client)
        ack?.({ ok: true, task });
      } catch (error) {
        if (error instanceof ConflictError) {
          socket.emit('task:conflict', {
            code: 'CONFLICT',
            message: error.message,
            taskId: typeof payload === 'object' && payload && 'taskId' in payload
              ? String((payload as { taskId: unknown }).taskId)
              : undefined,
          });
        }
        ack?.({ ok: false, ...socketErrorPayload(error) });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket desconectado (${authSocket.data.userId}): ${reason}`);
    });
  });
}

function parseProjectId(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || !('projectId' in payload)) {
    throw new AppError('projectId requerido', 400, 'BAD_REQUEST');
  }
  const projectId = (payload as { projectId: unknown }).projectId;
  if (typeof projectId !== 'string' || !projectId.trim()) {
    throw new AppError('projectId invalido', 400, 'BAD_REQUEST');
  }
  return projectId.trim();
}

function parseUpdateStatusPayload(payload: unknown): {
  projectId: string;
  taskId: string;
  expectedStatus: string;
  expectedVersion: number;
  newStatus: string;
} {
  if (!payload || typeof payload !== 'object') {
    throw new AppError('Payload invalido', 400, 'BAD_REQUEST');
  }
  const body = payload as Record<string, unknown>;
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
  const expectedStatus = typeof body.expectedStatus === 'string' ? body.expectedStatus : '';
  const newStatus = typeof body.newStatus === 'string' ? body.newStatus : '';
  const expectedVersion = Number(body.expectedVersion);

  if (!projectId || !taskId || !expectedStatus || !newStatus) {
    throw new AppError('Faltan campos obligatorios', 400, 'BAD_REQUEST');
  }
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new AppError('expectedVersion debe ser un entero >= 0', 400, 'BAD_REQUEST');
  }

  return { projectId, taskId, expectedStatus, expectedVersion, newStatus };
}
