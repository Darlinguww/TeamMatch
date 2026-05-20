import { driver } from '../../../database/neo4j.js';
import {
  serializeTaskNotification,
  serializeTaskReview,
  serializeTaskSummary
} from '../serializers/task-workflow.serializer.js';
import {
  ReviewTaskResult,
  TaskReviewDecision,
  TaskReviewSummary,
  TaskSummary,
  UpdateTaskStatusResult
} from '../types/task.types.js';

export interface UpdateTaskStatusInput {
  taskId: string;
  actorUserId: string;
  status: string;
  normalizedStatus: string;
  eventId: string;
  notificationId: string;
  occurredAt: string;
}

export interface ReviewTaskInput {
  taskId: string;
  actorUserId: string;
  decision: TaskReviewDecision;
  comment: string | null;
  eventId: string;
  reviewedAt: string;
}

export interface UpdateTaskStatusRepositoryResult extends UpdateTaskStatusResult {
  actorCanUpdate: boolean;
}

export interface ReviewTaskWorkflowRepositoryResult extends ReviewTaskResult {
  actorIsLeader: boolean;
}

const IN_REVIEW_STATUS_KEY = 'in_review';

export class TaskWorkflowRepository {
  public async updateStatus(input: UpdateTaskStatusInput): Promise<UpdateTaskStatusRepositoryResult | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-[:TIENE_TAREA|CONTIENE]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId OR elementId(task) = $taskId
         MATCH (actor:Usuario {userId: $actorUserId})
         OPTIONAL MATCH (actor)-[assignmentOut:ASIGNADO_A]->(task)
         OPTIONAL MATCH (task)-[assignmentIn:ASIGNADO_A]->(actor)
         OPTIONAL MATCH (actor)-[actorMembership:PERTENECE_A]->(project)
         WITH project,
              task,
              actor,
              actorMembership,
              assignmentOut IS NOT NULL OR assignmentIn IS NOT NULL AS actorIsAssigned,
              coalesce(task.status, task.estado) AS previousStatus,
              replace(toLower(trim(coalesce(task.status, task.estado, ''))), ' ', '_') AS previousStatusKey
         CALL {
           WITH project
           OPTIONAL MATCH (leader:Usuario)-[leaderMembership:PERTENECE_A]->(project)
           WHERE coalesce(leaderMembership.isLeader, false) = true
              OR toLower(coalesce(leaderMembership.role, leaderMembership.rol, '')) IN ['leader', 'lider', 'líder']
           RETURN leader
           ORDER BY coalesce(leaderMembership.createdAt, ''), leader.userId
           LIMIT 1
         }
         WITH project,
              task,
              actor,
              leader,
              previousStatus,
              previousStatusKey,
              actorMembership IS NOT NULL AS actorIsMember,
              actorIsAssigned,
              leader IS NOT NULL AND leader.userId = $actorUserId AS actorIsLeader
         WITH project,
              task,
              actor,
              leader,
              previousStatus,
              previousStatusKey,
              actorIsLeader OR (
                actorIsMember
                AND actorIsAssigned
                AND (
                  (
                    previousStatusKey IN ['pendiente', 'pending', '']
                    AND $normalizedStatus IN ['en_progreso', 'in_progress']
                  )
                  OR (
                    previousStatusKey IN ['en_progreso', 'in_progress']
                    AND $normalizedStatus = $inReviewStatusKey
                  )
                )
              ) AS actorCanUpdate,
              previousStatusKey <> $normalizedStatus AS statusChanged,
              previousStatusKey <> $normalizedStatus AND $normalizedStatus = $inReviewStatusKey AS shouldNotifyLeader
         CALL {
           WITH task, actorCanUpdate
           WITH task, actorCanUpdate
           WHERE actorCanUpdate
           SET task.status = $status,
               task.estado = $status,
               task.updatedAt = $occurredAt
           RETURN count(task) AS tasksUpdated
         }
         CALL {
           WITH task, actor, actorCanUpdate, statusChanged, previousStatus
           WITH task, actor, actorCanUpdate, statusChanged, previousStatus
           WHERE actorCanUpdate AND statusChanged
           CREATE (event:EventoTarea {
             eventId: $eventId,
             type: 'STATUS_CHANGED',
             previousStatus: previousStatus,
             newStatus: $status,
             createdAt: $occurredAt,
             actorUserId: $actorUserId
           })
           CREATE (task)-[:TIENE_EVENTO]->(event)
           CREATE (actor)-[:REALIZO]->(event)
           RETURN count(event) AS statusEventsCreated
         }
         CALL {
           WITH project, task, leader, actorCanUpdate, shouldNotifyLeader
           WITH project, task, leader, actorCanUpdate, shouldNotifyLeader
           WHERE actorCanUpdate AND shouldNotifyLeader AND leader IS NOT NULL
           CREATE (notification:Notificacion {
             notificationId: $notificationId,
             type: 'TASK_IN_REVIEW',
             message: 'Task is ready for review',
             read: false,
             taskId: coalesce(task.taskId, task.tareaId, task.id, elementId(task)),
             projectId: coalesce(project.projectId, project.proyectoId),
             createdAt: $occurredAt
           })
           CREATE (leader)-[:RECIBE]->(notification)
           CREATE (notification)-[:SOBRE_TAREA]->(task)
           RETURN count(notification) AS notificationsCreated
         }
         RETURN coalesce(task.taskId, task.tareaId, task.id, elementId(task)) AS taskId,
                coalesce(task.title, task.titulo, task.name, task.nombre, '') AS title,
                CASE WHEN actorCanUpdate THEN $status ELSE coalesce(task.status, task.estado, '') END AS status,
                previousStatus,
                coalesce(project.projectId, project.proyectoId) AS projectId,
                CASE WHEN actorCanUpdate THEN $occurredAt ELSE task.updatedAt END AS updatedAt,
                actorCanUpdate,
                CASE
                  WHEN notificationsCreated > 0 THEN {
                    notificationId: $notificationId,
                    type: 'TASK_IN_REVIEW',
                    message: 'Task is ready for review',
                    createdAt: $occurredAt,
                    read: false,
                    recipientUserId: leader.userId
                  }
                  ELSE null
                END AS notification
         LIMIT 1`,
        {
          taskId: input.taskId,
          actorUserId: input.actorUserId,
          status: input.status,
          normalizedStatus: input.normalizedStatus,
          inReviewStatusKey: IN_REVIEW_STATUS_KEY,
          eventId: input.eventId,
          notificationId: input.notificationId,
          occurredAt: input.occurredAt
        }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const task = this.serializeTaskFromRecord(record);
      const notification = serializeTaskNotification(record.get('notification'));

      return {
        task,
        notification,
        actorCanUpdate: record.get('actorCanUpdate') === true
      };
    } finally {
      await session.close();
    }
  }

  public async reviewTask(input: ReviewTaskInput): Promise<ReviewTaskWorkflowRepositoryResult | null> {
    const session = driver.session();
    const nextStatus = input.decision === 'approved' ? 'completada' : 'en progreso';

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-[:TIENE_TAREA|CONTIENE]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId OR elementId(task) = $taskId
         MATCH (actor:Usuario {userId: $actorUserId})
         WITH project, task, actor, coalesce(task.status, task.estado) AS previousStatus
         CALL {
           WITH project
           OPTIONAL MATCH (leader:Usuario)-[leaderMembership:PERTENECE_A]->(project)
           WHERE coalesce(leaderMembership.isLeader, false) = true
              OR toLower(coalesce(leaderMembership.role, leaderMembership.rol, '')) IN ['leader', 'lider', 'líder']
           WITH leader, leaderMembership
           ORDER BY coalesce(leaderMembership.createdAt, ''), leader.userId
           RETURN leader
           LIMIT 1
         }
         WITH project,
              task,
              actor,
              leader,
              previousStatus,
              leader IS NOT NULL AND leader.userId = $actorUserId AS actorIsLeader
         CALL {
           WITH task, actorIsLeader
           WITH task, actorIsLeader
           WHERE actorIsLeader
           SET task.status = $nextStatus,
               task.estado = $nextStatus,
               task.updatedAt = $reviewedAt,
               task.reviewDecision = $decision,
               task.reviewComment = $comment,
               task.reviewedAt = $reviewedAt,
               task.reviewedBy = $actorUserId
           RETURN count(task) AS tasksReviewed
         }
         CALL {
           WITH task, actor, actorIsLeader, previousStatus
           WITH task, actor, actorIsLeader, previousStatus
           WHERE actorIsLeader
           CREATE (event:EventoTarea {
             eventId: $eventId,
             type: 'TASK_REVIEWED',
             decision: $decision,
             previousStatus: previousStatus,
             newStatus: $nextStatus,
             createdAt: $reviewedAt,
             actorUserId: $actorUserId
           })
           FOREACH (_ IN CASE WHEN $comment IS NULL THEN [] ELSE [1] END | SET event.comment = $comment)
           CREATE (task)-[:TIENE_EVENTO]->(event)
           CREATE (actor)-[:REALIZO]->(event)
           RETURN count(event) AS reviewEventsCreated
         }
         RETURN coalesce(task.taskId, task.tareaId, task.id, elementId(task)) AS taskId,
                coalesce(task.title, task.titulo, task.name, task.nombre, '') AS title,
                CASE WHEN actorIsLeader THEN $nextStatus ELSE coalesce(task.status, task.estado, '') END AS status,
                previousStatus,
                coalesce(project.projectId, project.proyectoId) AS projectId,
                CASE WHEN actorIsLeader THEN $reviewedAt ELSE task.updatedAt END AS updatedAt,
                actorIsLeader,
                CASE
                  WHEN actorIsLeader THEN {
                    eventId: $eventId,
                    decision: $decision,
                    comment: $comment,
                    reviewedAt: $reviewedAt,
                    reviewedBy: $actorUserId
                  }
                  ELSE null
                END AS review
         LIMIT 1`,
        {
          taskId: input.taskId,
          actorUserId: input.actorUserId,
          decision: input.decision,
          comment: input.comment,
          nextStatus,
          eventId: input.eventId,
          reviewedAt: input.reviewedAt
        }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const task = this.serializeTaskFromRecord(record);
      const review = serializeTaskReview(record.get('review'));

      return {
        task,
        review: review as TaskReviewSummary,
        actorIsLeader: record.get('actorIsLeader') === true
      };
    } finally {
      await session.close();
    }
  }

  private serializeTaskFromRecord(record: { get(key: string): unknown }): TaskSummary {
    return serializeTaskSummary({
      taskId: record.get('taskId'),
      title: record.get('title'),
      status: record.get('status'),
      previousStatus: record.get('previousStatus'),
      projectId: record.get('projectId'),
      updatedAt: record.get('updatedAt')
    });
  }
}
