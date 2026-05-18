import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { requireInternalServiceToken } from './internal-auth.middleware.js';

function createMockResponse(): Response & { statusCode: number; body: unknown } {
  const response = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return response as Response & { statusCode: number; body: unknown };
}

describe('requireInternalServiceToken', () => {
  beforeEach(() => {
    process.env.INTERNAL_AI_SERVICE_TOKEN = 'ci-internal-token';
  });

  it('rechaza solicitudes sin token', () => {
    const req = { header: () => undefined } as unknown as Request;
    const res = createMockResponse();
    let nextCalled = false;

    requireInternalServiceToken(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  it('permite solicitudes con token valido', () => {
    const req = {
      header: (name: string) =>
        name.toLowerCase() === 'x-internal-service-token' ? 'ci-internal-token' : undefined
    } as unknown as Request;
    const res = createMockResponse();
    let nextCalled = false;

    requireInternalServiceToken(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, true);
  });
});
