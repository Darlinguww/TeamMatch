import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./task-workflow.repository.ts', import.meta.url), 'utf8');

function methodSource(name: string): string {
  const start = source.indexOf(`public async ${name}`);
  const next = source.indexOf('\n  public async ', start + 1);
  const end = next === -1 ? source.indexOf('\n  private ', start + 1) : next;
  return source.slice(start, end === -1 ? undefined : end);
}

describe('task workflow cypher cardinality', () => {
  it('collapses both project-task edges before a status write', () => {
    const query = methodSource('updateStatus');

    expect(query).toContain('WITH DISTINCT project,');
    expect(query.indexOf('WITH DISTINCT project,')).toBeLessThan(query.indexOf('SET task.status'));
  });

  it('collapses both project-task edges before a review write', () => {
    const query = methodSource('reviewTask');

    expect(query).toContain(
      'WITH DISTINCT project, task, actor, coalesce(task.status, task.estado) AS previousStatus'
    );
    expect(query).toContain('RETURN coalesce(assignedOut, assignedIn) AS assigned\n           LIMIT 1');
    expect(query.indexOf('WITH DISTINCT project, task, actor')).toBeLessThan(query.indexOf('SET task.status'));
    expect(query.indexOf('WITH DISTINCT project, task, actor')).toBeLessThan(query.indexOf('CREATE (event:EventoTarea'));
    expect(query.indexOf('WITH DISTINCT project, task, actor')).toBeLessThan(
      query.indexOf('CREATE (notification:Notificacion')
    );
  });
});
