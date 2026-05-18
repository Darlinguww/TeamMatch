export type TaskReviewDecision = 'approved' | 'rejected';

export interface TaskSummary {
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

export interface TaskReviewSummary {
  eventId: string;
  decision: TaskReviewDecision;
  comment: string | null;
  reviewedAt: string;
  reviewedBy: string;
}

export interface UpdateTaskStatusResult {
  task: TaskSummary;
  notification: TaskNotificationSummary | null;
}

export interface ReviewTaskResult {
  task: TaskSummary;
  review: TaskReviewSummary;
}
