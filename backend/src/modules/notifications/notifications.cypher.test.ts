import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./notifications.service.ts', import.meta.url), 'utf8');

describe('notification inbox cypher', () => {
  it('counts each notification once before the page limit', () => {
    const start = source.indexOf('public async getUserNotifications');
    const query = source.slice(start, source.indexOf('public async markAsRead'));

    expect(query).toContain('head(collect(DISTINCT taskProject)) AS taskProject');
    expect(query).toContain('ORDER BY notification.createdAt DESC');
    expect(query).toContain('LIMIT 50');
    expect(query.indexOf('head(collect(DISTINCT taskProject))')).toBeLessThan(query.indexOf('LIMIT 50'));
    expect(query.indexOf('LIMIT 50')).toBeLessThan(query.indexOf('RETURN notification.notificationId'));
  });
});
