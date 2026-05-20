import { driver } from '../../database/neo4j.js';

export interface UserNotification {
  notificationId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  taskId?: string;
  projectId?: string;
  requestId?: string;
  applicantUserId?: string;
  applicantDisplayName?: string;
  roleName?: string | null;
  actionable?: boolean;
}

export class NotificationsService {
  public async getUserNotifications(userId: string): Promise<UserNotification[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (user:Usuario {userId: $userId})-[:RECIBE]->(notification:Notificacion)
         OPTIONAL MATCH (notification)-[:SOBRE_TAREA]->(task:Tarea)
         OPTIONAL MATCH (notification)-[:SOBRE_SOLICITUD]->(request:SolicitudParticipacion)
         OPTIONAL MATCH (task)-[:TIENE_TAREA|CONTIENE]-(taskProject:Proyecto)
         OPTIONAL MATCH (request)-[:PARA_PROYECTO]->(requestProject:Proyecto)
         WHERE coalesce(notification.actionable, false) = false
            OR request IS NULL
            OR request.status = 'pending'
         RETURN notification.notificationId AS notificationId,
                notification.type AS type,
                notification.message AS message,
                coalesce(notification.read, false) AS read,
                notification.createdAt AS createdAt,
                coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(
                  notification.projectId,
                  taskProject.projectId,
                  taskProject.proyectoId,
                  requestProject.projectId,
                  requestProject.proyectoId
                ) AS projectId,
                coalesce(notification.requestId, request.requestId) AS requestId,
                coalesce(notification.applicantUserId, request.applicantUserId) AS applicantUserId,
                coalesce(notification.applicantDisplayName) AS applicantDisplayName,
                coalesce(notification.roleName, request.roleName) AS roleName,
                coalesce(notification.actionable, false) AS actionable
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
        requestId: record.get('requestId') ? String(record.get('requestId')) : undefined,
        applicantUserId: record.get('applicantUserId') ? String(record.get('applicantUserId')) : undefined,
        applicantDisplayName: record.get('applicantDisplayName')
          ? String(record.get('applicantDisplayName'))
          : undefined,
        roleName: record.get('roleName') != null ? String(record.get('roleName')) : undefined,
        actionable: record.get('actionable') === true,
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
         SET notification.read = true`,
        { userId, notificationId }
      );
    } finally {
      await session.close();
    }
  }
}
