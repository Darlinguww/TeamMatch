/**
 * Historias de usuario y requisitos del tablero Kanban / equipos.
 * Requiere Neo4j: docker compose up -d neo4j
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.js';
import { ConflictError, ForbiddenError } from '../../src/shared/errors/HttpErrors.js';
import { signAccessToken } from '../../src/shared/utils/jwt.js';
import { TaskWorkflowRepository } from '../../src/modules/tasks/repositories/task-workflow.repository.js';
import { TasksService } from '../../src/modules/tasks/tasks.service.js';
import { TaskService } from '../../src/modules/tasks/task.service.js';
import { Neo4jTaskRepository } from '../../src/modules/tasks/repositories/task.repository.js';
import { TeamDetailRepository } from '../../src/modules/teams/repositories/team-detail.repository.js';
import { TeamsService } from '../../src/modules/teams/teams.service.js';
import {
  attachActiveTaskToMember,
  cleanupUsersAndProjectsByPrefix,
  seedProjectMembersOnly,
  seedProjectTaskGraph
} from '../helpers/neo4j-fixtures.js';
import {
  createIntegrationDriver,
  hasNeo4jIntegration,
  verifyNeo4jConnection
} from '../helpers/neo4j-integration.js';

const TEST_PREFIX = `hu-${Date.now()}`;

function bearer(userId: string): string {
  return `Bearer ${signAccessToken({ sub: userId, email: `${userId}@test.local` })}`;
}

describe.skipIf(!hasNeo4jIntegration())('Historias de usuario — equipos y Kanban', () => {
  const driver = createIntegrationDriver();
  const teamsService = new TeamsService(new TeamDetailRepository());
  const tasksWorkflow = new TasksService(new TaskWorkflowRepository());
  const taskCrud = new TaskService(new Neo4jTaskRepository());

  let teamGraph: Awaited<ReturnType<typeof seedProjectMembersOnly>>;
  let kanbanGraph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;
  let pendingGraph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;

  beforeAll(async () => {
    const reachable = await verifyNeo4jConnection();
    if (!reachable) {
      throw new Error('Neo4j no disponible. Ejecuta: docker compose up -d neo4j');
    }

    const session = driver.session();
    try {
      teamGraph = await seedProjectMembersOnly(session, `${TEST_PREFIX}-team`);
      kanbanGraph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-kanban`);
      pendingGraph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-pending`);

      await attachActiveTaskToMember(
        session,
        teamGraph.projectId,
        teamGraph.memberId,
        `${TEST_PREFIX}-blocking-task`
      );

      await session.run(
        `MATCH (t:Tarea {taskId: $taskId})
         SET t.status = 'pendiente', t.estado = 'pendiente'`,
        { taskId: pendingGraph.taskId }
      );
    } finally {
      await session.close();
    }
  });

  afterAll(async () => {
    const session = driver.session();
    try {
      await cleanupUsersAndProjectsByPrefix(session, TEST_PREFIX);
    } finally {
      await session.close();
      await driver.close();
    }
  });

  describe('HU-1 — GET /teams/:id y alerta al remover miembro con tareas activas', () => {
    it('GET /teams/:id devuelve la composición actual del equipo', async () => {
      const res = await request(app)
        .get(`/teams/${teamGraph.projectId}`)
        .set('Authorization', bearer(teamGraph.leaderId));

      expect(res.status).toBe(200);
      expect(res.body.team).toMatchObject({
        id: teamGraph.projectId,
        title: expect.any(String)
      });
      expect(res.body.team.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: teamGraph.leaderId }),
          expect.objectContaining({ userId: teamGraph.memberId })
        ])
      );
    });

    it('DELETE /teams/:id/members/:memberId responde 409 con tareas activas', async () => {
      const res = await request(app)
        .delete(`/teams/${teamGraph.projectId}/members/${teamGraph.memberId}`)
        .set('Authorization', bearer(teamGraph.leaderId));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.details.activeTasks.length).toBeGreaterThan(0);
    });

    it('el servicio bloquea la remoción con ConflictError y lista tareas activas', async () => {
      await expect(
        teamsService.removeMember(teamGraph.leaderId, teamGraph.projectId, teamGraph.memberId)
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('HU-2 — notificación al líder en En revisión y revisión con comentario', () => {
    it('al pasar a en revision se crea notificación TASK_IN_REVIEW para el líder', async () => {
      const result = await tasksWorkflow.updateStatus(kanbanGraph.taskId, kanbanGraph.memberId, {
        status: 'en revision'
      });

      expect(result.task.status).toBe('en revision');
      expect(result.notification).toMatchObject({
        type: 'TASK_IN_REVIEW',
        recipientUserId: kanbanGraph.leaderId
      });
    });

    it('POST /tasks/:id/review acepta comentario opcional del líder', async () => {
      const reviewRes = await request(app)
        .post(`/tasks/${kanbanGraph.taskId}/review`)
        .set('Authorization', bearer(kanbanGraph.leaderId))
        .send({ decision: 'approved', comment: 'Cumple criterios de aceptación' });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.review).toMatchObject({
        decision: 'approved',
        reviewedBy: kanbanGraph.leaderId
      });
    });
  });

  describe('HU-3 — líder asigna tareas con estados', () => {
    it('POST /projects/:projectId/tasks crea tarea pendiente asignada al miembro', async () => {
      const res = await request(app)
        .post(`/projects/${kanbanGraph.projectId}/tasks`)
        .set('Authorization', bearer(kanbanGraph.leaderId))
        .send({
          title: 'Configurar CI',
          assignedUserId: kanbanGraph.memberId
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'Configurar CI',
        status: 'pendiente',
        assignedUserId: kanbanGraph.memberId
      });
    });

    it('el líder puede actualizar metadatos; el miembro no', async () => {
      const created = await taskCrud.createProjectTask(kanbanGraph.leaderId, kanbanGraph.projectId, {
        title: 'Tarea de prueba HU-3',
        userAsigned: kanbanGraph.memberId
      });

      await expect(
        taskCrud.updateTask(kanbanGraph.memberId, created.taskId, { title: 'Cambio ilegal' })
      ).rejects.toBeInstanceOf(ForbiddenError);

      await expect(
        taskCrud.updateTask(kanbanGraph.leaderId, created.taskId, { description: 'Actualizado por líder' })
      ).resolves.toMatchObject({ description: 'Actualizado por líder' });
    });
  });

  describe('HU-4 — miembro: En proceso → Para revisión', () => {
    it('flujo pendiente → en progreso → en revision notifica al líder', async () => {
      const step1 = await tasksWorkflow.updateStatus(pendingGraph.taskId, pendingGraph.memberId, {
        status: 'en progreso'
      });
      expect(step1.task.status).toBe('en progreso');

      const step2 = await tasksWorkflow.updateStatus(pendingGraph.taskId, pendingGraph.memberId, {
        status: 'Para Revisión'
      });
      expect(step2.task.status).toBe('en revision');
      expect(step2.notification).toMatchObject({
        type: 'TASK_IN_REVIEW',
        recipientUserId: pendingGraph.leaderId
      });
    });

    it('HTTP: PATCH /tasks/:id/status refleja el mismo flujo', async () => {
      const graph = await (async () => {
        const session = driver.session();
        try {
          return await seedProjectTaskGraph(session, `${TEST_PREFIX}-http-flow`);
        } finally {
          await session.close();
        }
      })();

      await request(app)
        .patch(`/tasks/${graph.taskId}/status`)
        .set('Authorization', bearer(graph.memberId))
        .send({ status: 'en progreso' })
        .expect(200);

      const reviewStep = await request(app)
        .patch(`/tasks/${graph.taskId}/status`)
        .set('Authorization', bearer(graph.memberId))
        .send({ status: 'en revision' });

      expect(reviewStep.status).toBe(200);
      expect(reviewStep.body.task.status).toBe('en revision');
    });
  });

  describe('HU-5 — líder aprueba o rechaza en revisión', () => {
    it('el miembro no puede aprobar', async () => {
      const session = driver.session();
      let graph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;
      try {
        graph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-approve`);
        await session.run(
          `MATCH (t:Tarea {taskId: $taskId}) SET t.status = 'en revision', t.estado = 'en revision'`,
          { taskId: graph.taskId }
        );
      } finally {
        await session.close();
      }

      await expect(
        tasksWorkflow.reviewTask(graph.taskId, graph.memberId, { decision: 'approved', comment: null })
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('el líder rechaza y devuelve la tarea', async () => {
      const session = driver.session();
      let graph: Awaited<ReturnType<typeof seedProjectTaskGraph>>;
      try {
        graph = await seedProjectTaskGraph(session, `${TEST_PREFIX}-reject`);
        await session.run(
          `MATCH (t:Tarea {taskId: $taskId}) SET t.status = 'en revision', t.estado = 'en revision'`,
          { taskId: graph.taskId }
        );
      } finally {
        await session.close();
      }

      const result = await tasksWorkflow.reviewTask(graph.taskId, graph.leaderId, {
        decision: 'rejected',
        comment: 'Añade pruebas de integración'
      });

      expect(result.review).toMatchObject({ decision: 'rejected' });
      expect(result.task.status).toBe('en progreso');
      expect(result.notification?.type).toBe('TASK_RETURNED');
    });
  });
});
