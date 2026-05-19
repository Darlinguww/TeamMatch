import {
  TaskNotificationSummary,
  TaskReviewDecision,
  TaskReviewSummary,
  TaskSummary
} from '../types/task.types.js';

export interface TaskSummaryRecord {
  taskId: unknown;
  title: unknown;
  status: unknown;
  previousStatus: unknown;
  projectId: unknown;
  updatedAt: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function serializeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function serializeTaskSummary(record: TaskSummaryRecord): TaskSummary {
  return {
    taskId: serializeString(record.taskId),
    title: serializeString(record.title),
    status: serializeString(record.status),
    previousStatus: serializeOptionalString(record.previousStatus),
    projectId: serializeString(record.projectId),
    updatedAt: serializeOptionalString(record.updatedAt)
  };
}

export function serializeTaskNotification(value: unknown): TaskNotificationSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const notificationId = serializeString(value.notificationId);
  const recipientUserId = serializeString(value.recipientUserId);

  if (!notificationId || !recipientUserId) {
    return null;
  }

  return {
    notificationId,
    type: serializeString(value.type),
    message: serializeString(value.message),
    createdAt: serializeString(value.createdAt),
    read: value.read === true,
    recipientUserId
  };
}

export function serializeTaskReview(value: unknown): TaskReviewSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const eventId = serializeString(value.eventId);
  const decision = serializeString(value.decision);
  const reviewedAt = serializeString(value.reviewedAt);
  const reviewedBy = serializeString(value.reviewedBy);

  if (!eventId || !['approved', 'rejected'].includes(decision) || !reviewedAt || !reviewedBy) {
    return null;
  }

  return {
    eventId,
    decision: decision as TaskReviewDecision,
    comment: serializeOptionalString(value.comment),
    reviewedAt,
    reviewedBy
  };
}
