import { randomUUID } from 'crypto';
import { driver } from '../../../database/neo4j.js';
import {
  GET_TASK_PROJECT_ID,
  UPDATE_TASK_STATUS_OPTIMISTIC,
} from '../../../database/cypher/task-optimistic.js';
import {
  CreateTaskInput,
  Task,
  TaskReview,
  TaskStatus,
  UpdateTaskInput,
  UpdateTaskStatusOptimisticInput,
  UpdateTaskStatusOptimisticResult,
} from '../types/task.types.js';
import { TaskRepository as TaskRepositoryContract } from '../task.service.js';

export class Neo4jTaskRepository implements TaskRepositoryContract {
  public async isUserInProject(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(:Proyecto {projectId: $projectId})
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
        `MATCH (:Usuario {userId: $userId})-[:PERTENECE_A]->(:Proyecto)-[:CONTIENE]->(:Tarea {taskId: $taskId})
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
        `MATCH (:Proyecto)-[:CONTIENE]->(:Tarea {taskId: $taskId})
         RETURN 1 AS found
         LIMIT 1`,
        { taskId }
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
        `MATCH (project:Proyecto {projectId: $projectId})
         CREATE (task:Tarea {
           taskId: $taskId,
           title: $title,
           description: $description,
           createdAt: $createdAt,
           status: 'pendiente',
           version: 1
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
                coalesce(task.version, 1) AS version,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail`,
        {
          projectId: input.projectId,
          taskId,
          title: input.title,
          description: input.description,
          createdAt,
          assignedUserId: input.assignedUserId
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
        `MATCH (:Proyecto {projectId: $projectId})-[:CONTIENE]->(task:Tarea)
         WHERE $status IS NULL OR task.status = $status
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assigned:Usuario)
         RETURN task.taskId AS taskId,
                task.title AS title,
                task.description AS description,
                task.createdAt AS createdAt,
                task.status AS status,
                coalesce(task.version, 1) AS version,
                assigned.userId AS assignedUserId,
                assigned.email AS assignedUserEmail
         ORDER BY task.createdAt DESC`,
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
        `MATCH (task:Tarea {taskId: $taskId})
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assigned:Usuario)
         RETURN task.taskId AS taskId,
                task.title AS title,
                task.description AS description,
                task.createdAt AS createdAt,
                task.status AS status,
                coalesce(task.version, 1) AS version,
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

  public async getTaskProjectId(taskId: string): Promise<string | null> {
    const session = driver.session();

    try {
      const result = await session.run(GET_TASK_PROJECT_ID, { taskId });
      const projectId = result.records[0]?.get('projectId');
      return projectId ? String(projectId) : null;
    } finally {
      await session.close();
    }
  }

  public async updateTaskStatusOptimistic(
    input: UpdateTaskStatusOptimisticInput,
  ): Promise<UpdateTaskStatusOptimisticResult> {
    const session = driver.session();

    try {
      const result = await session.run(UPDATE_TASK_STATUS_OPTIMISTIC, {
        projectId: input.projectId,
        taskId: input.taskId,
        expectedStatus: input.expectedStatus,
        expectedVersion: input.expectedVersion,
        newStatus: input.newStatus,
      });

      if (result.records.length === 0) {
        return { conflict: true };
      }

      const record = result.records[0];
      return {
        conflict: false,
        projectId: String(record.get('projectId')),
        task: this.mapTask(record),
      };
    } finally {
      await session.close();
    }
  }

  public async updateTask(input: UpdateTaskInput): Promise<Task | null> {
    const session = driver.session();

    try {
      const result = await session.run(
        `MATCH (task:Tarea {taskId: $taskId})
         SET task.title = coalesce($title, task.title),
             task.description = coalesce($description, task.description),
             task.status = coalesce($status, task.status),
             task.version = CASE
               WHEN $status IS NOT NULL THEN coalesce(task.version, 0) + 1
               ELSE coalesce(task.version, 1)
             END,
             task.updatedAt = $updatedAt
         WITH task
         OPTIONAL MATCH (task)<-[oldAssignment:ASIGNADO_A]-(:Usuario)
         WITH task, collect(oldAssignment) AS oldAssignments
         FOREACH (oldAssignment IN CASE WHEN $assignmentTouched THEN oldAssignments ELSE [] END |
           DELETE oldAssignment)
         WITH task
         OPTIONAL MATCH (newAssigned:Usuario {userId: $assignedUserId})
         FOREACH (_ IN CASE WHEN $assignmentTouched AND newAssigned IS NOT NULL THEN [1] ELSE [] END |
           MERGE (newAssigned)-[:ASIGNADO_A]->(task)
         )
         WITH task
         OPTIONAL MATCH (task)<-[:ASIGNADO_A]-(assigned:Usuario)
         RETURN task.taskId AS taskId,
                task.title AS title,
                task.description AS description,
                task.createdAt AS createdAt,
                task.status AS status,
                coalesce(task.version, 1) AS version,
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
        `MATCH (task:Tarea {taskId: $taskId})
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
         MATCH (task:Tarea {taskId: $taskId})
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
      createdAt: String(record.get('createdAt')),
      status: record.get('status') as TaskStatus,
      version: Number(record.get('version') ?? 1),
      assignedUserId: record.get('assignedUserId') ? String(record.get('assignedUserId')) : null,
      assignedUserEmail: record.get('assignedUserEmail') ? String(record.get('assignedUserEmail')) : null
    };
  }
}
