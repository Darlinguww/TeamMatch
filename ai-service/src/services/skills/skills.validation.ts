const MAX_TEXT_LENGTH = 50_000;

const PROMPT_INJECTION_PATTERNS = [
  /ignore (?:all )?previous instructions/i,
  /disregard (?:all )?previous instructions/i,
  /forget (?:all )?previous instructions/i,
  /do not follow any rules/i,
  /bypass (?:the )?safety/i,
  /system prompt/i,
  /assistant instructions/i,
  /security policy/i,
  /ignora(?:r)?\s+(?:todas?\s+)?(?:las\s+)?instrucciones/i,
  /olvida(?:r)?\s+(?:todas?\s+)?(?:las\s+)?instrucciones/i,
  /no\s+sigas\s+las\s+reglas/i,
  /instrucciones\s+del\s+sistema/i,
  /prompt\s+del\s+sistema/i,
  /pol[ií]tica\s+de\s+seguridad/i,
  /omite(?:r)?\s+las\s+restricciones/i
] as const;

export class ValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateProcessSkillsText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError('El campo "text" es obligatorio y debe ser una cadena no vacía.');
  }

  const trimmed = value.trim();

  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new ValidationError(`El campo "text" debe tener ${MAX_TEXT_LENGTH} caracteres o menos.`);
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new ValidationError('Contenido no permitido en el texto de entrada.');
    }
  }

  return trimmed;
}
