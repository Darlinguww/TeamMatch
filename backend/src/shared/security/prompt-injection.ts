import { UnprocessableEntityError } from '../errors/HttpErrors.js';

export const PROMPT_INJECTION_PATTERNS = [
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

export function assertNoPromptInjection(text: string, message: string): void {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      throw new UnprocessableEntityError(message);
    }
  }
}

export function sanitizeAiPrompt(text: string): string {
  const sanitized = text.trim();

  if (!sanitized) {
    return sanitized;
  }

  assertNoPromptInjection(sanitized, 'Prompt injection detected in text input');
  return sanitized;
}

export function assertNoMaliciousFileContent(buffer: Buffer): void {
  const rawText = buffer.toString('ascii').toLowerCase();
  assertNoPromptInjection(rawText, 'Malicious content detected in uploaded file');
}
