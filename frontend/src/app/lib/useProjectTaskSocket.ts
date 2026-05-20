import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Task, TaskStatus } from './mockData';
import { getAuthToken } from './apiClient';
import { getApiBaseUrl } from './config';
import {
  apiTaskToKanban,
  kanbanStatusToApi,
  type ApiTask,
} from './taskStatusMap';

interface StatusUpdatedPayload {
  projectId: string;
  task: ApiTask;
  updatedBy: string;
}

export function useProjectTaskSocket(
  projectId: string | undefined,
  onTasksPatch: (updater: (prev: Task[]) => Task[]) => void,
  onReload: () => void,
) {
  const socketRef = useRef<Socket | null>(null);

  const emitStatusUpdate = useCallback(
    (task: Task, newStatus: TaskStatus): Promise<boolean> => {
      const socket = socketRef.current;
      if (!socket?.connected || !projectId) {
        return Promise.resolve(false);
      }

      return new Promise((resolve) => {
        socket.emit(
          'task:updateStatus',
          {
            projectId,
            taskId: task.id,
            expectedStatus: kanbanStatusToApi(task.status),
            expectedVersion: task.version ?? 0,
            newStatus: kanbanStatusToApi(newStatus),
          },
          (response: { ok?: boolean }) => {
            resolve(Boolean(response?.ok));
          },
        );
      });
    },
    [projectId],
  );

  useEffect(() => {
    const token = getAuthToken();
    const base = getApiBaseUrl();
    if (!projectId || !token || !base) {
      return;
    }

    const socket = io(base, {
      auth: { token },
      path: '/socket.io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('project:join', { projectId });
    });

    socket.on('task:statusUpdated', (event: StatusUpdatedPayload) => {
      if (event.projectId !== projectId) return;
      const kanban = apiTaskToKanban(event.task, projectId);
      onTasksPatch((prev) =>
        prev.map((t) => (t.id === kanban.id ? { ...t, ...kanban } : t)),
      );
    });

    socket.on('task:conflict', () => {
      onReload();
    });

    return () => {
      socket.emit('project:leave', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, onTasksPatch, onReload]);

  return { emitStatusUpdate };
}
