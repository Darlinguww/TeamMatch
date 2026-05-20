import { driver } from '../../database/neo4j.js';

export interface UserNotification {
  notificationId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  projectId?: string;
}

export class NotificationsService {
  public async getUserNotifications(userId: string): Promise<UserNotification[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (user:Usuario {userId: $userId})-[:RECIBE]->(notification:Notificacion)
         OPTIONAL MATCH (notification)-[:SOBRE_TAREA]->(task:Tarea)
         OPTIONAL MATCH (task)-[:TIENE_TAREA|CONTIENE]-(project:Proyecto)
         RETURN notification.notificationId AS notificationId,
                notification.type AS type,
                notification.message AS message,
                coalesce(notification.read, false) AS read,
                notification.createdAt AS createdAt,
                coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(project.projectId, project.proyectoId) AS projectId
         ORDER BY notification.createdAt DESC
         LIMIT 50`,
        { userId }
      );

      return result.records.map((record) => ({
        notificationId: String(record.get('notificationId')),
        type: String(record.get('type')),
        message: String(record.get('message')),
        read: record.get('read') === true,
        createdAt: String(record.get('createdAt')),
        taskId: record.get('taskId') ? String(record.get('taskId')) : undefined,
        projectId: record.get('projectId') ? String(record.get('projectId')) : undefined,
      }));
    } finally {
      await session.close();
    }
  }

  public async markAsRead(userId: string, notificationId: string): Promise<void> {
    const session = driver.session();

    try {
      await session.run(
        `MATCH (user:Usuario {userId: $userId})-[:RECIBE]->(notification:Notificacion {notificationId: $notificationId})
         SET notification.read = true
         RETURN count(notification)`,
        { userId, notificationId }
      );
    } finally {
      await session.close();
    }
  }
}
