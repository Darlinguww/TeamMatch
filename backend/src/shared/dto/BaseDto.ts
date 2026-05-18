export interface ValidationIssue {
  field: string;
  message: string;
}

export interface DtoValidationResult<TDto> {
  value: TDto;
  issues: ValidationIssue[];
}

export type DtoValidator<TDto> = (payload: unknown) => DtoValidationResult<TDto>;

export function createValidationResult<TDto>(value: TDto, issues: ValidationIssue[] = []): DtoValidationResult<TDto> {
  return { value, issues };
}
