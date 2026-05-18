export const TASK_STATUSES = ['pendiente', 'en progreso', 'en revision', 'completada'] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  assignedUserId: string | null;
}

export interface UpdateTaskInput {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedUserId?: string | null;
}

export interface Task {
  taskId: string;
  title: string;
  description: string;
  createdAt: string;
  status: TaskStatus;
  assignedUserId: string | null;
  assignedUserEmail: string | null;
}

export interface TaskReview {
  userId: string;
  taskId: string;
  score: number;
  feedback: string;
  createdAt: string;
}

export type TaskReviewDecision = 'approved' | 'rejected';

export interface TaskWorkflowSummary {
  taskId: string;
  title: string;
  status: string;
  previousStatus: string | null;
  projectId: string;
  updatedAt: string | null;
}

export interface TaskNotificationSummary {
  notificationId: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  recipientUserId: string;
}

export interface TaskLeaderReviewSummary {
  eventId: string;
  decision: TaskReviewDecision;
  comment: string | null;
  reviewedAt: string;
  reviewedBy: string;
}

export interface UpdateTaskWorkflowStatusResult {
  task: TaskWorkflowSummary;
  notification: TaskNotificationSummary | null;
}

export interface ReviewTaskWorkflowResult {
  task: TaskWorkflowSummary;
  review: TaskLeaderReviewSummary;
}
