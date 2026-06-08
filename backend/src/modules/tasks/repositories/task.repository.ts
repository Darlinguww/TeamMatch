import { randomUUID } from 'crypto';
import neo4j from 'neo4j-driver';
import { driver } from '../../../database/neo4j.js';
import { NotFoundError } from '../../../shared/errors/HttpErrors.js';
import { CreateTaskInput, Task, TaskReview, TaskStatus, UpdateTaskInput } from '../types/task.types.js';
import { TaskRepository as TaskRepositoryContract } from '../task.service.js';

export class Neo4jTaskRepository implements TaskRepositoryContract {
  public async isUserInProject(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         RETURN 1 AS found
         LIMIT 1`,
        { userId, projectId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async isUserInProjectByTask(userId: string, taskId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         RETURN 1 AS found
         LIMIT 1`,
        { userId, taskId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async isUserAssignedToTask(userId: string, taskId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         OPTIONAL MATCH (:Usuario {userId: $userId})-[assignmentOut:ASIGNADO_A]->(task)
         OPTIONAL MATCH (task)-[assignmentIn:ASIGNADO_A]->(:Usuario {userId: $userId})
         WITH task, assignmentOut, assignmentIn
         WHERE assignmentOut IS NOT NULL
            OR assignmentIn IS NOT NULL
            OR toString(coalesce(task.assignedUserId, task.asignadoA, task.userAsigned, '')) = $userId
         RETURN 1 AS found
         LIMIT 1`,
        { userId, taskId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async getProjectIdForTask(taskId: string): Promise<string | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         RETURN coalesce(project.projectId, project.proyectoId) AS projectId
         LIMIT 1`,
        { taskId }
      );
      const projectId = result.records[0]?.get('projectId');
      return projectId != null ? String(projectId) : null;
    } finally {
      await session.close();
    }
  }

  public async isTaskInProject(taskId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         RETURN 1 AS found
         LIMIT 1`,
        { taskId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async findProjectLeaderId(projectId: string): Promise<string | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (leader:Usuario)-[rel:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND (
             coalesce(rel.rol, rel.role) = 'lider'
             OR coalesce(rel.isLeader, false) = true
             OR toLower(coalesce(rel.role, rel.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN leader.userId AS leaderId
         ORDER BY coalesce(rel.createdAt, ''), leader.userId
         LIMIT 1`,
        { projectId }
      );
      const leaderId = result.records[0]?.get('leaderId');
      return leaderId != null ? String(leaderId) : null;
    } finally {
      await session.close();
    }
  }

  public async isUserProjectLeader(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[membership:PERTENECE_A]->(project:Proyecto)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND (
             coalesce(membership.isLeader, false) = true
             OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN 1 AS found
         LIMIT 1`,
        { userId, projectId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async isUserProjectLeaderByTask(userId: string, taskId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[membership:PERTENECE_A]->(project:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE (task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId)
           AND (
             coalesce(membership.isLeader, false) = true
             OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder']
           )
         RETURN 1 AS found
         LIMIT 1`,
        { userId, taskId }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async createTask(input: CreateTaskInput): Promise<Task> {
    const session = driver.session();
    const taskId = randomUUID();
    const createdAt = new Date().toISOString();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         WITH project
         LIMIT 1
         CREATE (task:Tarea {
           taskId: $taskId,
           tareaId: $taskId,
           title: $title,
           titulo: $title,
           description: $description,
           descripcion: $description,
           createdAt: $createdAt,
           status: 'pendiente',
           estado: 'pendiente',
           sprint: coalesce($sprint, 1)
         })
         MERGE (project)-[:CONTIENE]->(task)
         MERGE (project)-[:TIENE_TAREA]->(task)
         WITH task, project
         OPTIONAL MATCH (assigned:Usuario {userId: $assignedUserId})
         FOREACH (_ IN CASE WHEN assigned IS NULL THEN [] ELSE [1] END |
           MERGE (assigned)-[:ASIGNADO_A]->(task)
         )
         RETURN task.taskId AS taskId,
                task.title AS title,
                task.description AS description,
                task.createdAt AS createdAt,
                task.status AS status,
                coalesce(task.sprint, 1) AS sprint,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail`,
        {
          projectId: input.projectId.trim(),
          taskId,
          title: input.title,
          description: input.description,
          createdAt,
          assignedUserId: input.assignedUserId,
          sprint: input.sprint ?? 1,
        }
      );

      if (!result.records[0]) {
        throw new NotFoundError('No se pudo crear la tarea: proyecto no encontrado');
      }

      return this.mapTask(result.records[0]);
    } finally {
      await session.close();
    }
  }

  public async listProjectTasks(projectId: string, status?: TaskStatus): Promise<Task[]> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (project:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE (project.projectId = $projectId OR project.proyectoId = $projectId)
           AND ($status IS NULL OR task.status = $status OR task.estado = $status)
         WITH DISTINCT task
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assignedOut:Usuario)
         OPTIONAL MATCH (task)-[:ASIGNADO_A]->(assignedIn:Usuario)
         WITH task, coalesce(assignedOut, assignedIn) AS assigned
         RETURN coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(task.title, task.titulo, task.name, '') AS title,
                coalesce(task.description, task.descripcion, '') AS description,
                task.createdAt AS createdAt,
                coalesce(task.status, task.estado, 'pendiente') AS status,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail,
                coalesce(task.sprint, 1) AS sprint
         ORDER BY task.createdAt DESC, task.sprint ASC`,
         { projectId: projectId.trim(), status: status ?? null }
      );

      return result.records.map((record) => this.mapTask(record));
    } finally {
      await session.close();
    }
  }

  public async getTask(taskId: string): Promise<Task | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assignedOut:Usuario)
         OPTIONAL MATCH (task)-[:ASIGNADO_A]->(assignedIn:Usuario)
         WITH task, coalesce(assignedOut, assignedIn) AS assigned
         RETURN coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(task.title, task.titulo, task.name, '') AS title,
                coalesce(task.description, task.descripcion, '') AS description,
                task.createdAt AS createdAt,
                coalesce(task.status, task.estado, 'pendiente') AS status,
                coalesce(task.sprint, 1) AS sprint,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail
         LIMIT 1`,
        { taskId }
      );

      return result.records[0] ? this.mapTask(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const session = driver.session();
    const updatedAt = new Date().toISOString();
    const assignmentTouched = Object.prototype.hasOwnProperty.call(input, 'assignedUserId');
    const taskMatch = `task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId`;

    const setClauses = ['task.updatedAt = $updatedAt'];
    const params: Record<string, unknown> = { taskId: input.taskId, updatedAt };

    if (input.title !== undefined) {
      params.title = input.title;
      setClauses.push('task.title = $title', 'task.titulo = $title');
    }
    if (input.description !== undefined) {
      params.description = input.description;
      setClauses.push('task.description = $description', 'task.descripcion = $description');
    }
    if (input.status !== undefined) {
      params.status = input.status;
      setClauses.push('task.status = $status', 'task.estado = $status');
    }
    if (input.sprint !== undefined && input.sprint !== null) {
      params.sprint = neo4j.int(input.sprint);
      setClauses.push('task.sprint = $sprint');
    }

    try {
      const updateResult = await session.run(
        `MATCH (task:Tarea)
         WHERE ${taskMatch}
         SET ${setClauses.join(', ')}
         RETURN coalesce(task.taskId, task.tareaId, task.id) AS taskId
         LIMIT 1`,
        params
      );

      if (updateResult.records.length === 0) {
        return null;
      }

      if (assignmentTouched) {
        await session.run(
          `MATCH (task:Tarea)
           WHERE ${taskMatch}
           WITH task
           MATCH (:Usuario)-[assignment:ASIGNADO_A]-(task)
           DELETE assignment`,
          { taskId: input.taskId }
        );

        if (input.assignedUserId) {
          await session.run(
            `MATCH (task:Tarea)
             WHERE ${taskMatch}
             MATCH (assigned:Usuario {userId: $assignedUserId})
             MERGE (assigned)-[:ASIGNADO_A]->(task)`,
            { taskId: input.taskId, assignedUserId: input.assignedUserId }
          );
        }
      }

      const result = await session.run(
        `MATCH (task:Tarea)
         WHERE ${taskMatch}
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assignedOut:Usuario)
         OPTIONAL MATCH (task)-[:ASIGNADO_A]->(assignedIn:Usuario)
         WITH task, coalesce(assignedOut, assignedIn) AS assigned
         RETURN coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(task.title, task.titulo, task.name, '') AS title,
                coalesce(task.description, task.descripcion, '') AS description,
                task.createdAt AS createdAt,
                coalesce(task.status, task.estado, 'pendiente') AS status,
                coalesce(task.sprint, 1) AS sprint,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail
         LIMIT 1`,
        { taskId: input.taskId }
      );

      return result.records[0] ? this.mapTask(result.records[0]) : null;
    } finally {
      await session.close();
    }
  }

  public async deleteTask(taskId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         DETACH DELETE task
         RETURN count(task) AS deleted`,
        { taskId }
      );
      return Number(result.records[0]?.get('deleted') ?? 0) > 0;
    } finally {
      await session.close();
    }
  }

  public async createReview(taskId: string, reviewerId: string, rating: number, comment: string): Promise<TaskReview | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (reviewer:Usuario {userId: $reviewerId})
         MATCH (task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         MERGE (reviewer)-[review:EVALUO]->(task)
         SET review.puntaje = $rating,
             review.feedback = $comment,
             review.createdAt = $createdAt
         RETURN reviewer.userId AS userId,
                task.taskId AS taskId,
                review.puntaje AS score,
                review.feedback AS feedback,
                review.createdAt AS createdAt
         LIMIT 1`,
        {
          taskId,
          reviewerId,
          rating,
          comment,
          createdAt: new Date().toISOString()
        }
      );

      if (!result.records[0]) {
        return null;
      }

      return {
        userId: result.records[0].get('userId'),
        taskId: result.records[0].get('taskId'),
        score: Number(result.records[0].get('score')),
        feedback: result.records[0].get('feedback'),
        createdAt: result.records[0].get('createdAt')
      };
    } finally {
      await session.close();
    }
  }

  private mapTask(record: { get(key: string): unknown; has?: (key: string) => boolean }): Task {
    const sprintRaw =
      typeof record.has === 'function' && record.has('sprint') ? record.get('sprint') : null;

    return {
      taskId: String(record.get('taskId')),
      title: String(record.get('title')),
      description: String(record.get('description') ?? ''),
      createdAt: String(record.get('createdAt') ?? new Date().toISOString()),
      status: record.get('status') as TaskStatus,
      assignedUserId: record.get('assignedUserId') ? String(record.get('assignedUserId')) : null,
      assignedUserEmail: record.get('assignedUserEmail') ? String(record.get('assignedUserEmail')) : null,
      sprint: sprintRaw != null ? Number(sprintRaw) : 1,
    };
  }
}
