import { describe, expect, it } from 'vitest';
import { assertAllowedAiServiceUrl } from './ai-service-url.js';

describe('assertAllowedAiServiceUrl', () => {
  it('acepta hosts permitidos', () => {
    expect(() => assertAllowedAiServiceUrl('http://ai-service:3001')).not.toThrow();
    expect(() => assertAllowedAiServiceUrl('http://localhost:3001')).not.toThrow();
    expect(() => assertAllowedAiServiceUrl('http://127.0.0.1:3001')).not.toThrow();
  });

  it('permite URL vacia', () => {
    expect(() => assertAllowedAiServiceUrl('')).not.toThrow();
  });

  it('rechaza hosts no permitidos (SSRF)', () => {
    expect(() => assertAllowedAiServiceUrl('http://evil.example.com')).toThrow(/not allowed/);
  });

  it('rechaza URLs mal formadas', () => {
    expect(() => assertAllowedAiServiceUrl('not-a-url')).toThrow(/valid absolute URL/);
  });
});
