import { NextFunction, Request, Response } from 'express';
import { DtoValidator } from '../dto/BaseDto.js';
import { BadRequestError } from '../errors/HttpErrors.js';

export function validateDto<TDto>(validator: DtoValidator<TDto>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validationResult = validator(req.body);

    if (validationResult.issues.length > 0) {
      next(new BadRequestError('Validation failed', validationResult.issues));
      return;
    }

    req.body = validationResult.value;
    next();
  };
}
