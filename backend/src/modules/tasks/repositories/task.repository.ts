import { randomUUID } from 'crypto';
import { driver } from '../../../database/neo4j.js';
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

  public async isUserProjectLeader(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[membership:PERTENECE_A]->(project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         WITH membership
         WHERE coalesce(membership.isLeader, false) = true
            OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder']
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
        `MATCH (:Usuario {userId: $userId})-[membership:PERTENECE_A]->(:Proyecto)-[:CONTIENE|TIENE_TAREA]->(task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         WITH membership
         WHERE coalesce(membership.isLeader, false) = true
            OR toLower(coalesce(membership.role, membership.rol, '')) IN ['leader', 'lider', 'líder']
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
         CREATE (task:Tarea {
           taskId: $taskId,
           tareaId: $taskId,
           title: $title,
           titulo: $title,
           description: $description,
           descripcion: $description,
           createdAt: $createdAt,
           status: 'pendiente',
           sprint: coalesce($sprint, 1)
         })
         MERGE (project)-[:CONTIENE]->(task)
         WITH task
         OPTIONAL MATCH (assigned:Usuario {userId: $assignedUserId})
         FOREACH (_ IN CASE WHEN assigned IS NULL THEN [] ELSE [1] END |
           MERGE (assigned)-[:ASIGNADO_A]->(task)
         )
         RETURN task.taskId AS taskId,
                task.title AS title,
                task.description AS description,
                task.createdAt AS createdAt,
                task.status AS status,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail`,
        {
          projectId: input.projectId,
          taskId,
          title: input.title,
          description: input.description,
          createdAt,
          assignedUserId: input.assignedUserId,
          sprint: input.sprint ?? 1,
        }
      );

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
        { projectId, status: status ?? null }
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

    try {
      const result = await session.run(
        `MATCH (task:Tarea)
         WHERE task.taskId = $taskId OR task.tareaId = $taskId OR task.id = $taskId
         SET task.title = coalesce($title, task.title),
             task.titulo = coalesce($title, task.titulo),
             task.description = coalesce($description, task.description),
             task.descripcion = coalesce($description, task.descripcion),
             task.status = coalesce($status, task.status),
             task.estado = coalesce($status, task.estado),
             task.updatedAt = $updatedAt
         WITH task
         OPTIONAL MATCH (task)<-[oldAssignmentIn:ASIGNADO_A]-(:Usuario)
         OPTIONAL MATCH (task)-[oldAssignmentOut:ASIGNADO_A]->(:Usuario)
         WITH task, [rel IN collect(oldAssignmentIn) + collect(oldAssignmentOut) WHERE rel IS NOT NULL] AS oldAssignments
         FOREACH (oldAssignment IN CASE WHEN $assignmentTouched THEN oldAssignments ELSE [] END |
           DELETE oldAssignment)
         WITH task
         OPTIONAL MATCH (newAssigned:Usuario {userId: $assignedUserId})
         FOREACH (_ IN CASE WHEN $assignmentTouched AND newAssigned IS NOT NULL THEN [1] ELSE [] END |
           MERGE (newAssigned)-[:ASIGNADO_A]->(task)
         )
         WITH task
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assignedOut:Usuario)
         OPTIONAL MATCH (task)-[:ASIGNADO_A]->(assignedIn:Usuario)
         WITH task, coalesce(assignedOut, assignedIn) AS assigned
         RETURN coalesce(task.taskId, task.tareaId, task.id) AS taskId,
                coalesce(task.title, task.titulo, task.name, '') AS title,
                coalesce(task.description, task.descripcion, '') AS description,
                task.createdAt AS createdAt,
                coalesce(task.status, task.estado, 'pendiente') AS status,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail
         LIMIT 1`,
        {
          taskId: input.taskId,
          title: input.title ?? null,
          description: input.description ?? null,
          status: input.status ?? null,
          assignmentTouched: Object.prototype.hasOwnProperty.call(input, 'assignedUserId'),
          assignedUserId: input.assignedUserId ?? null,
          updatedAt: new Date().toISOString()
        }
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

  private mapTask(record: { get(key: string): unknown }): Task {
    return {
      taskId: String(record.get('taskId')),
      title: String(record.get('title')),
      description: String(record.get('description') ?? ''),
      createdAt: String(record.get('createdAt') ?? new Date().toISOString()),
      status: record.get('status') as TaskStatus,
      assignedUserId: record.get('assignedUserId') ? String(record.get('assignedUserId')) : null,
      assignedUserEmail: record.get('assignedUserEmail') ? String(record.get('assignedUserEmail')) : null,
      sprint: record.get('sprint') != null ? Number(record.get('sprint')) : 1,
    };
  }
}
