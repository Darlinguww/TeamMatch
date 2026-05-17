import { ErrorRequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { isProduction } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

const { JsonWebTokenError, TokenExpiredError } = jwt;

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next): void => {
  let normalizedError: AppError;

  if (error instanceof AppError) {
    normalizedError = error;
  } else if (error instanceof TokenExpiredError) {
    normalizedError = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  } else if (error instanceof JsonWebTokenError) {
    normalizedError = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  } else if (isJsonSyntaxError(error)) {
    normalizedError = new AppError('Malformed JSON body', 400, 'MALFORMED_JSON');
  } else {
    normalizedError = new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }

  if (normalizedError.statusCode >= 500) {
    console.error(error);
  }

  const responseBody: ErrorResponseBody = {
    error: {
      code: normalizedError.code,
      message: normalizedError.message
    }
  };

  if (normalizedError.details) {
    responseBody.error.details = normalizedError.details;
  }

  if (!isProduction && normalizedError.stack) {
    responseBody.error.stack = normalizedError.stack;
  }

  res.status(normalizedError.statusCode).json(responseBody);
};
