import { describe, expect, it } from 'vitest';
import {
  availabilityParseRateLimiter,
  loginRateLimiter,
  skillsCatalogWriteRateLimiter,
  suggestSkillsRateLimiter
} from './rateLimit.js';

describe('rateLimit middleware', () => {
  it('exporta limitadores para rutas sensibles', () => {
    expect(typeof loginRateLimiter).toBe('function');
    expect(typeof suggestSkillsRateLimiter).toBe('function');
    expect(typeof availabilityParseRateLimiter).toBe('function');
    expect(typeof skillsCatalogWriteRateLimiter).toBe('function');
  });
});
