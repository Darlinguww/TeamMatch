import { driver } from '../../../database/neo4j.js';
import {
  serializeTaskLeaderReview,
  serializeTaskNotification,
  serializeTaskWorkflowSummary
} from '../serializers/task-workflow.serializer.js';
import {
  ReviewTaskWorkflowResult,
  TaskLeaderReviewSummary,
  TaskReviewDecision,
  TaskWorkflowSummary,
  UpdateTaskWorkflowStatusResult
} from '../types/task.types.js';

export interface UpdateTaskWorkflowStatusInput {
  taskId: string;
  actorUserId: string;
  status: string;
  normalizedStatus: string;
  eventId: string;
  notificationId: string;
  occurredAt: string;
}

export interface ReviewTaskWorkflowInput {
  taskId: string;
  actorUserId: string;
  decision: TaskReviewDecision;
  comment: string | null;
  eventId: string;
  reviewedAt: string;
}

export interface UpdateTaskWorkflowStatusRepositoryResult extends UpdateTaskWorkflowStatusResult {
  actorCanUpdate: boolean;
}

export interface ReviewTaskWorkflowRepositoryResult extends ReviewTaskWorkflowResult {
  actorIsLeader: boolean;
}

const IN_REVIEW_STATUS_KEYS = ['in_review', 'en_revision', 'en revision'];

const TASK_PROJECT_RELATIONSHIP = `[:CONTIENE|TIENE_TAREA]`;

export class Neo4jTaskWorkflowRepository {
  public async updateStatus(input: UpdateTaskWorkflowStatusInput): Promise<UpdateTaskWorkflowStatusRepositoryResult | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-${TASK_PROJECT_RELATIONSHIP}->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId OR elementId(task) = $taskId
         MATCH (actor:Usuario {userId: $actorUserId})
         OPTIONAL MATCH (actor)-[assignment:ASIGNADO_A]->(task)
         OPTIONAL MATCH (actor)-[actorMembership:PERTENECE_A]->(project)
         WITH project,
              task,
              actor,
              assignment IS NOT NULL OR actorMembership IS NOT NULL AS actorCanUpdate,
              coalesce(task.status, task.estado) AS previousStatus,
              replace(toLower(trim(coalesce(task.status, task.estado, ''))), ' ', '_') AS previousStatusKey
         CALL {
           WITH project
           OPTIONAL MATCH (leader:Usuario)-[leaderMembership:PERTENECE_A]->(project)
           WITH leader, leaderMembership
           ORDER BY CASE
                      WHEN coalesce(leaderMembership.isLeader, false) = true THEN 0
                      WHEN toLower(coalesce(leaderMembership.role, leaderMembership.rol, '')) IN ['leader', 'lider', 'líder'] THEN 0
                      ELSE 1
                    END,
                    coalesce(leaderMembership.createdAt, ''),
                    leader.userId
           RETURN leader
           LIMIT 1
         }
         WITH project,
              task,
              actor,
              leader,
              actorCanUpdate,
              previousStatus,
              previousStatusKey,
              previousStatusKey <> $normalizedStatus AS statusChanged,
              previousStatusKey <> $normalizedStatus AND $normalizedStatus IN $inReviewStatusKeys AS shouldNotifyLeader
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
             projectId: project.projectId,
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
                project.projectId AS projectId,
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

  public async reviewTask(input: ReviewTaskWorkflowInput): Promise<ReviewTaskWorkflowRepositoryResult | null> {
    const session = driver.session();
    const nextStatus = input.decision === 'approved' ? 'completada' : 'en progreso';

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-${TASK_PROJECT_RELATIONSHIP}->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId OR elementId(task) = $taskId
         MATCH (actor:Usuario {userId: $actorUserId})
         WITH project, task, actor, coalesce(task.status, task.estado) AS previousStatus
         CALL {
           WITH project
           OPTIONAL MATCH (leader:Usuario)-[leaderMembership:PERTENECE_A]->(project)
           WITH leader, leaderMembership
           ORDER BY CASE
                      WHEN coalesce(leaderMembership.isLeader, false) = true THEN 0
                      WHEN toLower(coalesce(leaderMembership.role, leaderMembership.rol, '')) IN ['leader', 'lider', 'líder'] THEN 0
                      ELSE 1
                    END,
                    coalesce(leaderMembership.createdAt, ''),
                    leader.userId
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
                project.projectId AS projectId,
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
      const review = serializeTaskLeaderReview(record.get('review'));

      return {
        task,
        review: review as TaskLeaderReviewSummary,
        actorIsLeader: record.get('actorIsLeader') === true
      };
    } finally {
      await session.close();
    }
  }

  private serializeTaskFromRecord(record: { get(key: string): unknown }): TaskWorkflowSummary {
    return serializeTaskWorkflowSummary({
      taskId: record.get('taskId'),
      title: record.get('title'),
      status: record.get('status'),
      previousStatus: record.get('previousStatus'),
      projectId: record.get('projectId'),
      updatedAt: record.get('updatedAt')
    });
  }
}
