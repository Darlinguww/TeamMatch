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

  it('keeps a review row when the leader is the assignee', () => {
    const query = methodSource('reviewTask');

    expect(query).toContain(
      'WITH DISTINCT project, task, actor, coalesce(task.status, task.estado) AS previousStatus'
    );
    expect(query).not.toContain('WHERE actorIsLeader AND assigned IS NOT NULL');
    expect(query).toContain(
      'actorIsLeader AND assigned IS NOT NULL AND assigned.userId <> $actorUserId AS notifyAssignee'
    );
    expect(query).toContain('FOREACH (_ IN CASE WHEN notifyAssignee THEN [1] ELSE [] END |');
    expect(query).toContain('FOREACH (_ IN CASE WHEN actorIsLeader THEN [1] ELSE [] END |');
    expect(query.indexOf('WITH DISTINCT project, task, actor')).toBeLessThan(query.indexOf('SET task.status'));
  });
});
