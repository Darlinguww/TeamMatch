import { createValidationResult, DtoValidationResult, ValidationIssue } from '../../../shared/dto/BaseDto.js';
import { TaskReviewDecision } from '../types/task.types.js';

export interface ReviewTaskDto {
  decision: TaskReviewDecision;
  comment: string | null;
}

const MAX_REVIEW_COMMENT_LENGTH = 1000;
const REVIEW_DECISIONS = new Set<string>(['approved', 'rejected']);

function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

export function validateReviewTaskDto(payload: unknown): DtoValidationResult<ReviewTaskDto> {
  const issues: ValidationIssue[] = [];
  const body = isRecord(payload) ? payload : {};
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  let comment: string | null = null;

  if (!REVIEW_DECISIONS.has(decision)) {
    issues.push({ field: 'decision', message: 'Decision must be approved or rejected' });
  }

  if (body.comment !== undefined && body.comment !== null) {
    if (typeof body.comment !== 'string') {
      issues.push({ field: 'comment', message: 'Comment must be a string when provided' });
    } else {
      const normalizedComment = body.comment.trim();

      if (normalizedComment.length > MAX_REVIEW_COMMENT_LENGTH) {
        issues.push({ field: 'comment', message: `Comment must be ${MAX_REVIEW_COMMENT_LENGTH} characters or fewer` });
      } else if (normalizedComment) {
        comment = normalizedComment;
      }
    }
  }

  return createValidationResult({
    decision: REVIEW_DECISIONS.has(decision) ? decision as TaskReviewDecision : 'rejected',
    comment
  }, issues);
}
