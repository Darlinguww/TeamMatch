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
  notificationId: string;
  reviewedAt: string;
}

export interface UpdateTaskStatusRepositoryResult extends UpdateTaskStatusResult {
  actorCanUpdate: boolean;
}

export interface ReviewTaskWorkflowRepositoryResult extends ReviewTaskResult {
  actorIsLeader: boolean;
}

/** Normalized status keys (must match TasksService.normalizeStatusKey). */
const PENDING_STATUS_KEYS = ['pendiente', 'pending', ''];
const IN_PROGRESS_STATUS_KEYS = ['en_progreso', 'in_progress'];
const IN_REVIEW_STATUS_KEYS = ['en_revision', 'in_review'];

export class TaskWorkflowRepository {
  public async updateStatus(input: UpdateTaskStatusInput): Promise<UpdateTaskStatusRepositoryResult | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-[:TIENE_TAREA|CONTIENE]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId OR elementId(task) = $taskId
         MATCH (actor:Usuario {userId: $actorUserId})
         OPTIONAL MATCH (assigneeById:Usuario {userId: $actorUserId})-[assignRel:ASIGNADO_A]->(task)
         OPTIONAL MATCH (actor)-[assignmentOut:ASIGNADO_A]->(task)
         OPTIONAL MATCH (task)-[assignmentIn:ASIGNADO_A]->(actor)
         OPTIONAL MATCH (actor)-[actorMembership:PERTENECE_A]->(project)
         WITH project,
              task,
              actor,
              actorMembership,
              assignRel IS NOT NULL
                OR assignmentOut IS NOT NULL
                OR assignmentIn IS NOT NULL
                OR toString(coalesce(task.assignedUserId, task.asignadoA, task.userAsigned, '')) = $actorUserId AS actorIsAssigned,
              coalesce(task.status, task.estado) AS previousStatus,
              replace(
                replace(
                  replace(toLower(trim(coalesce(task.status, task.estado, ''))), ' ', '_'),
                  'ó', 'o'
                ),
                'í', 'i'
              ) AS previousStatusKey
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
              coalesce(actorMembership.isLeader, false) = true
                OR toLower(coalesce(actorMembership.role, actorMembership.rol, '')) IN ['leader', 'lider', 'líder']
                OR (leader IS NOT NULL AND leader.userId = $actorUserId) AS actorIsLeader
         WITH project,
              task,
              actor,
              leader,
              previousStatus,
              previousStatusKey,
              actorIsLeader OR (
                actorIsMember
                AND
                actorIsAssigned
                AND (
                  (
                    previousStatusKey IN $pendingStatusKeys
                    AND $normalizedStatus IN $inProgressStatusKeys
                  )
                  OR (
                    previousStatusKey IN $inProgressStatusKeys
                    AND $normalizedStatus IN $inReviewStatusKeys
                  )
                )
              ) AS actorCanUpdate,
              previousStatusKey <> $normalizedStatus AS statusChanged,
              previousStatusKey <> $normalizedStatus
                AND $normalizedStatus IN $inReviewStatusKeys AS shouldNotifyLeader
         CALL {
           WITH task, actorCanUpdate
           FOREACH (_ IN CASE WHEN actorCanUpdate THEN [1] ELSE [] END |
             SET task.status = $status,
                 task.estado = $status,
                 task.updatedAt = $occurredAt
           )
           RETURN CASE WHEN actorCanUpdate THEN 1 ELSE 0 END AS tasksUpdated
         }
         CALL {
           WITH task, actor, actorCanUpdate, statusChanged, previousStatus
           FOREACH (_ IN CASE WHEN actorCanUpdate AND statusChanged THEN [1] ELSE [] END |
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
           )
           RETURN CASE WHEN actorCanUpdate AND statusChanged THEN 1 ELSE 0 END AS statusEventsCreated
         }
         CALL {
           WITH project, task, leader, actorCanUpdate, shouldNotifyLeader
           WITH project,
                task,
                leader,
                actorCanUpdate,
                shouldNotifyLeader,
                actorCanUpdate AND shouldNotifyLeader AND leader IS NOT NULL AS notifyLeader
           FOREACH (_ IN CASE WHEN notifyLeader THEN [1] ELSE [] END |
             CREATE (notification:Notificacion {
               notificationId: $notificationId,
               type: 'TASK_IN_REVIEW',
               message: 'Una tarea fue enviada a revision',
               read: false,
               actionable: false,
               taskId: coalesce(task.taskId, task.tareaId, task.id, elementId(task)),
               projectId: coalesce(project.projectId, project.proyectoId),
               createdAt: $occurredAt
             })
             CREATE (leader)-[:RECIBE]->(notification)
             CREATE (notification)-[:SOBRE_TAREA]->(task)
           )
           RETURN CASE WHEN notifyLeader THEN 1 ELSE 0 END AS notificationsCreated
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
                    message: 'Una tarea fue enviada a revision',
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
          pendingStatusKeys: PENDING_STATUS_KEYS,
          inProgressStatusKeys: IN_PROGRESS_STATUS_KEYS,
          inReviewStatusKeys: IN_REVIEW_STATUS_KEYS,
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
         OPTIONAL MATCH (actor)-[actorMembership:PERTENECE_A]->(project)
         WITH project, task, actor, actorMembership, coalesce(task.status, task.estado) AS previousStatus
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
              coalesce(actorMembership.isLeader, false) = true
                OR toLower(coalesce(actorMembership.role, actorMembership.rol, '')) IN ['leader', 'lider', 'líder']
                OR (leader IS NOT NULL AND leader.userId = $actorUserId) AS actorIsLeader
         CALL {
           WITH task
           OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assignedOut:Usuario)
           OPTIONAL MATCH (task)-[:ASIGNADO_A]->(assignedIn:Usuario)
           RETURN coalesce(assignedOut, assignedIn) AS assigned
         }
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
         CALL {
           WITH project, task, assigned, actorIsLeader
           WITH project, task, assigned, actorIsLeader
           WHERE actorIsLeader AND assigned IS NOT NULL AND assigned.userId <> $actorUserId
           CREATE (notification:Notificacion {
             notificationId: $notificationId,
             type: CASE WHEN $decision = 'approved' THEN 'TASK_APPROVED' ELSE 'TASK_RETURNED' END,
             message: CASE
               WHEN $decision = 'approved' THEN 'Tu tarea fue revisada y movida a Completada'
               ELSE 'Tu tarea fue revisada y devuelta a En progreso'
             END,
             read: false,
             taskId: coalesce(task.taskId, task.tareaId, task.id, elementId(task)),
             projectId: coalesce(project.projectId, project.proyectoId),
             createdAt: $reviewedAt
           })
           CREATE (assigned)-[:RECIBE]->(notification)
           CREATE (notification)-[:SOBRE_TAREA]->(task)
           RETURN count(notification) AS reviewNotificationsCreated
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
                END AS review,
                CASE
                  WHEN reviewNotificationsCreated > 0 THEN {
                    notificationId: $notificationId,
                    type: CASE WHEN $decision = 'approved' THEN 'TASK_APPROVED' ELSE 'TASK_RETURNED' END,
                    message: CASE
                      WHEN $decision = 'approved' THEN 'Tu tarea fue revisada y movida a Completada'
                      ELSE 'Tu tarea fue revisada y devuelta a En progreso'
                    END,
                    createdAt: $reviewedAt,
                    read: false,
                    recipientUserId: assigned.userId
                  }
                  ELSE null
                END AS notification
         LIMIT 1`,
        {
          taskId: input.taskId,
          actorUserId: input.actorUserId,
          decision: input.decision,
          comment: input.comment,
          nextStatus,
          eventId: input.eventId,
          notificationId: input.notificationId,
          reviewedAt: input.reviewedAt
        }
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const task = this.serializeTaskFromRecord(record);
      const review = serializeTaskReview(record.get('review'));
      const notification = serializeTaskNotification(record.get('notification'));

      return {
        task,
        review: review as TaskReviewSummary,
        notification,
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
