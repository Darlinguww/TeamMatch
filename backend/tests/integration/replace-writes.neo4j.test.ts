/**
 * Reescrituras destructivas en Neo4j: disponibilidad, roles y evaluaciones.
 * Requiere: docker compose up -d neo4j && RUN_E2E_NEO4J=true
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProfileRepository } from '../../src/modules/profile/repositories/profile.repository.js';
import { Neo4jProjectRepository } from '../../src/modules/projects/repositories/project.repository.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const PREFIX = `replace-writes-${Date.now()}`;

describe.skipIf(!hasNeo4jIntegration())('replace writes — Neo4j real', () => {
  const driver = createIntegrationDriver();
  const profiles = new ProfileRepository();
  const projects = new Neo4jProjectRepository();
  const userId = `${PREFIX}-user`;
  const projectId = `${PREFIX}-project`;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      await session.run(
        `CREATE (u:Usuario {userId: $userId, user: 'Replace Writer', email: $email, createdAt: $now})
         CREATE (p:Proyecto {projectId: $projectId, title: 'Replace', description: 'Seed', summary: 'Seed', status: 'open', createdAt: $now})
         CREATE (u)-[:PERTENECE_A {rol: 'lider', role: 'lider', isLeader: true}]->(p)
         CREATE (u)-[:DISPONIBLE_EN]->(:Disponibilidad {day: 'monday', start: '09:00', end: '12:00'})
         CREATE (u)-[:DISPONIBLE_EN]->(:Disponibilidad {day: 'tuesday', start: '09:00', end: '12:00'})
         CREATE (p)-[:TIENE_ROL]->(:Rol {roleId: $roleA, name: 'Frontend', headcount: 1})
         CREATE (p)-[:TIENE_ROL]->(:Rol {roleId: $roleB, name: 'Backend', headcount: 1})`,
        {
          userId,
          email: `${userId}@test.local`,
          projectId,
          roleA: `${PREFIX}-role-a`,
          roleB: `${PREFIX}-role-b`,
          now: new Date().toISOString()
        }
      );
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (user:Usuario)
         WHERE user.userId STARTS WITH $prefix
         OPTIONAL MATCH (user)-[:DISPONIBLE_EN]->(availability:Disponibilidad)
         DETACH DELETE availability, user`,
        { prefix: PREFIX }
      );
      await session.run(
        `MATCH (project:Proyecto)
         WHERE project.projectId STARTS WITH $prefix
         OPTIONAL MATCH (project)-[:TIENE_ROL]->(role:Rol)
         DETACH DELETE role, project`,
        { prefix: PREFIX }
      );
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it('does not duplicate availability slots on a second save', async () => {
    const saved = await profiles.replaceUserAvailability(userId, [
      { day: 'monday', timeSlots: [{ start: '10:00', end: '13:00' }] },
      { day: 'wednesday', timeSlots: [{ start: '15:00', end: '18:00' }] }
    ]);

    expect(saved?.availability).toEqual([
      { day: 'monday', timeSlots: [{ start: '10:00', end: '13:00' }] },
      { day: 'wednesday', timeSlots: [{ start: '15:00', end: '18:00' }] }
    ]);

    const again = await profiles.replaceUserAvailability(userId, [
      { day: 'monday', timeSlots: [{ start: '10:00', end: '13:00' }] },
      { day: 'wednesday', timeSlots: [{ start: '15:00', end: '18:00' }] }
    ]);

    expect(again?.availability).toEqual(saved?.availability);

    const cleared = await profiles.replaceUserAvailability(userId, []);
    expect(cleared?.userId).toBe(userId);
    expect(cleared?.availability).toEqual([]);
  });

  it('does not duplicate roles when a multi-role project is updated', async () => {
    await projects.updateProject(userId, projectId, {
      title: 'Replace',
      description: 'Updated description',
      roles: [
        { role: 'Frontend', skills: ['React'], headcount: 1 },
        { role: 'Backend', skills: ['Node.js'], headcount: 2 }
      ]
    });

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Proyecto {projectId: $projectId})-[:TIENE_ROL]->(role:Rol)
         RETURN count(role) AS roles`,
        { projectId }
      );
      expect(Number(result.records[0]?.get('roles'))).toBe(2);
    } finally {
      await session.close();
    }
  });

  it('keeps an earlier peer score when the same pair is evaluated on another project', async () => {
    const otherProjectId = `${PREFIX}-project-b`;
    const peerId = `${PREFIX}-peer`;
    const session = driver.session();
    try {
      await session.run(
        `MATCH (from:Usuario {userId: $userId})
         CREATE (peer:Usuario {userId: $peerId, user: 'Peer', email: $peerEmail, createdAt: $now})
         CREATE (project:Proyecto {projectId: $otherProjectId, title: 'Other', createdAt: $now})
         CREATE (from)-[:PERTENECE_A {rol: 'lider', isLeader: true}]->(project)
         CREATE (peer)-[:PERTENECE_A {rol: 'miembro'}]->(project)`,
        {
          userId,
          peerId,
          peerEmail: `${peerId}@test.local`,
          otherProjectId,
          now: new Date().toISOString()
        }
      );
    } finally {
      await session.close();
    }

    await projects.createFeedbackRelationship(projectId, userId, peerId, 5, 'primero', '2026-10-01T00:00:00.000Z');
    await projects.createFeedbackRelationship(otherProjectId, userId, peerId, 2, 'segundo', '2026-10-02T00:00:00.000Z');

    const check = driver.session();
    try {
      const result = await check.run(
        `MATCH (:Usuario {userId: $userId})-[feedback:EVALUO]->(:Usuario {userId: $peerId})
         RETURN feedback.proyectoId AS projectId, feedback.puntaje AS score`,
        { userId, peerId }
      );
      const scores = new Map(result.records.map((record) => [
        String(record.get('projectId')),
        Number(record.get('score'))
      ]));
      expect(scores.get(projectId)).toBe(5);
      expect(scores.get(otherProjectId)).toBe(2);
      expect(result.records).toHaveLength(2);
    } finally {
      await check.close();
    }
  });
});
