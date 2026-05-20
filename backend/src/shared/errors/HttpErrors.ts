import { AppError, ErrorDetails } from './AppError.js';

export class BadRequestError extends AppError {
  public constructor(message = 'Bad request', details?: ErrorDetails) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message = 'Unauthorized', details?: ErrorDetails) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = 'Forbidden', details?: ErrorDetails) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  public constructor(message = 'Not found', details?: ErrorDetails) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  public constructor(message = 'Conflict', details?: ErrorDetails) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class BadGatewayError extends AppError {
  public constructor(message = 'Bad gateway', details?: ErrorDetails) {
    super(message, 502, 'BAD_GATEWAY', details);
  }
}

export class UnprocessableEntityError extends AppError {
  public constructor(message = 'Unprocessable entity', details?: ErrorDetails) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

export class PayloadTooLargeError extends AppError {
  public constructor(message = 'Payload too large', details?: ErrorDetails) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', details);
  }
}
