import { driver } from '../../database/neo4j.js';
import {
  ParticipationRequest,
  ParticipationRequestKind,
  ParticipationRequestStatus,
  RoleVacancy,
} from './participation.types.js';

export interface CreateParticipationRequestInput {
  requestId: string;
  notificationId: string;
  kind: ParticipationRequestKind;
  projectId: string;
  applicantUserId: string;
  roleName: string | null;
  message: string | null;
  createdAt: string;
}

export interface ResolveParticipationInput {
  requestId: string;
  resolverUserId: string;
  status: Exclude<ParticipationRequestStatus, 'pending'>;
  resolvedAt: string;
  applicantNotificationId: string;
  applicantNotificationType: string;
  applicantNotificationMessage: string;
}

export interface ResolveLeaderResponseInput extends ResolveParticipationInput {
  notificationId: string;
  leaderUserId: string;
  projectId: string;
  applicantUserId: string;
  kind: ParticipationRequestKind;
  roleName: string | null;
}

export class ParticipationRepository {
  public async findOpenProjectId(projectId: string): Promise<string | null> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND coalesce(p.status, 'open') = 'open'
         RETURN coalesce(p.projectId, p.proyectoId) AS id
         LIMIT 1`,
        { projectId }
      );
      const id = result.records[0]?.get('id');
      return id != null ? String(id) : null;
    } finally {
      await session.close();
    }
  }

  public async isUserMember(projectId: string, userId: string): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (:Usuario {userId: $userId})-[rel:PERTENECE_A]->(p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         RETURN count(rel) AS c`,
        { userId, projectId }
      );
      return Number(result.records[0]?.get('c') ?? 0) > 0;
    } finally {
      await session.close();
    }
  }

  public async findProjectLeaderId(projectId: string): Promise<string | null> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (leader:Usuario)-[rel:PERTENECE_A]->(p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
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

  public async isProjectLeader(projectId: string, userId: string): Promise<boolean> {
    const leaderId = await this.findProjectLeaderId(projectId);
    return leaderId === userId;
  }

  public async hasPendingRequest(
    projectId: string,
    applicantUserId: string,
    kind: ParticipationRequestKind,
    roleName: string | null
  ): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (applicant:Usuario {userId: $applicantUserId})-[:SOLICITO]->(request:SolicitudParticipacion {status: 'pending'})-[:PARA_PROYECTO]->(p:Proyecto)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND request.kind = $kind
           AND ($roleName IS NULL OR request.roleName = $roleName)
         RETURN count(request) AS c`,
        { projectId, applicantUserId, kind, roleName }
      );
      return Number(result.records[0]?.get('c') ?? 0) > 0;
    } finally {
      await session.close();
    }
  }

  public async getRoleVacancy(projectId: string, roleName: string): Promise<RoleVacancy | null> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Proyecto)-[:TIENE_ROL]->(role:Rol)
         WHERE (p.projectId = $projectId OR p.proyectoId = $projectId)
           AND toLower(role.name) = toLower($roleName)
         OPTIONAL MATCH (member:Usuario)-[m:PERTENECE_A]->(p)
         WHERE toLower(coalesce(m.rol, m.role, '')) = toLower(role.name)
         RETURN role.name AS roleName,
                coalesce(role.headcount, 1) AS headcount,
                count(DISTINCT member) AS filled`,
        { projectId, roleName }
      );
      if (!result.records[0]) return null;
      const headcount = Number(result.records[0].get('headcount') ?? 1);
      const filled = Number(result.records[0].get('filled') ?? 0);
      return {
        roleName: String(result.records[0].get('roleName')),
        headcount,
        filled,
        available: Math.max(0, headcount - filled),
      };
    } finally {
      await session.close();
    }
  }

  public async createParticipationRequest(input: CreateParticipationRequestInput): Promise<ParticipationRequest> {
    const session = driver.session();
    const leaderId = await this.findProjectLeaderId(input.projectId);
    if (!leaderId) {
      throw new Error('Project leader not found');
    }

    const notificationType =
      input.kind === 'JOIN_PROJECT' ? 'PROJECT_JOIN_REQUEST' : 'ROLE_APPLICATION_REQUEST';
    const applicantLabel = await this.getUserDisplayName(input.applicantUserId);
    const message =
      input.kind === 'JOIN_PROJECT'
        ? `${applicantLabel} solicita unirse al proyecto`
        : `${applicantLabel} solicita el rol "${input.roleName ?? ''}"`;

    try {
      const result = await session.run(
        `MATCH (applicant:Usuario {userId: $applicantUserId})
         MATCH (leader:Usuario {userId: $leaderId})
         MATCH (p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         CREATE (request:SolicitudParticipacion {
           requestId: $requestId,
           kind: $kind,
           status: 'pending',
           roleName: $roleName,
           message: $applicantMessage,
           createdAt: $createdAt
         })
         CREATE (applicant)-[:SOLICITO]->(request)
         CREATE (request)-[:PARA_PROYECTO]->(p)
         CREATE (notification:Notificacion {
           notificationId: $notificationId,
           type: $notificationType,
           message: $leaderMessage,
           read: false,
           actionable: true,
           requestId: $requestId,
           projectId: $projectId,
           applicantUserId: $applicantUserId,
           applicantDisplayName: $applicantDisplayName,
           roleName: $roleName,
           createdAt: $createdAt
         })
         CREATE (leader)-[:RECIBE]->(notification)
         CREATE (notification)-[:SOBRE_SOLICITUD]->(request)
         RETURN request.requestId AS requestId,
                request.kind AS kind,
                request.status AS status,
                coalesce(p.projectId, p.proyectoId) AS projectId,
                applicant.userId AS applicantUserId,
                coalesce(applicant.user, applicant.email, applicant.userId) AS applicantDisplayName,
                request.roleName AS roleName,
                request.message AS message,
                request.createdAt AS createdAt`,
        {
          requestId: input.requestId,
          notificationId: input.notificationId,
          kind: input.kind,
          projectId: input.projectId,
          applicantUserId: input.applicantUserId,
          applicantDisplayName: applicantLabel,
          leaderId,
          roleName: input.roleName,
          applicantMessage: input.message ?? null,
          createdAt: input.createdAt,
          notificationType,
          leaderMessage: message,
        }
      );

      return this.mapRequest(result.records[0]);
    } finally {
      await session.close();
    }
  }

  public async findRequestForLeaderNotification(
    notificationId: string,
    leaderUserId: string
  ): Promise<(ParticipationRequest & { notificationId: string }) | null> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (leader:Usuario {userId: $leaderUserId})-[:RECIBE]->(notification:Notificacion {notificationId: $notificationId})-[:SOBRE_SOLICITUD]->(request:SolicitudParticipacion)
         MATCH (applicant:Usuario)-[:SOLICITO]->(request)-[:PARA_PROYECTO]->(p:Proyecto)
         WHERE request.status = 'pending'
         RETURN notification.notificationId AS notificationId,
                request.requestId AS requestId,
                request.kind AS kind,
                request.status AS status,
                coalesce(p.projectId, p.proyectoId) AS projectId,
                applicant.userId AS applicantUserId,
                coalesce(applicant.user, applicant.email, applicant.userId) AS applicantDisplayName,
                request.roleName AS roleName,
                request.message AS message,
                request.createdAt AS createdAt`,
        { notificationId, leaderUserId }
      );
      if (!result.records[0]) return null;
      return { ...this.mapRequest(result.records[0]), notificationId };
    } finally {
      await session.close();
    }
  }

  public async resolveParticipationRequest(input: ResolveParticipationInput): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (request:SolicitudParticipacion {requestId: $requestId, status: 'pending'})
         MATCH (applicant:Usuario)-[:SOLICITO]->(request)-[:PARA_PROYECTO]->(p:Proyecto)
         SET request.status = $status,
             request.resolvedAt = $resolvedAt,
             request.resolvedByUserId = $resolverUserId
         WITH request, applicant, p
         CREATE (outcome:Notificacion {
           notificationId: $applicantNotificationId,
           type: $applicantNotificationType,
           message: $applicantNotificationMessage,
           read: false,
           actionable: false,
           requestId: $requestId,
           projectId: coalesce(p.projectId, p.proyectoId),
           createdAt: $resolvedAt
         })
         CREATE (applicant)-[:RECIBE]->(outcome)
         RETURN request.requestId AS requestId`,
        {
          requestId: input.requestId,
          status: input.status,
          resolvedAt: input.resolvedAt,
          resolverUserId: input.resolverUserId,
          applicantNotificationId: input.applicantNotificationId,
          applicantNotificationType: input.applicantNotificationType,
          applicantNotificationMessage: input.applicantNotificationMessage,
        }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async resolveLeaderResponse(input: ResolveLeaderResponseInput): Promise<boolean> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (leader:Usuario {userId: $leaderUserId})-[:RECIBE]->(notification:Notificacion {notificationId: $notificationId})-[:SOBRE_SOLICITUD]->(request:SolicitudParticipacion {requestId: $requestId, status: 'pending'})
         MATCH (applicant:Usuario {userId: $applicantUserId})-[:SOLICITO]->(request)-[:PARA_PROYECTO]->(p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         MATCH (leader)-[leaderMembership:PERTENECE_A]->(p)
         WHERE coalesce(leaderMembership.isLeader, false) = true
            OR toLower(coalesce(leaderMembership.role, leaderMembership.rol, '')) IN ['leader', 'lider', 'líder']
         WITH notification, request, applicant, p
         CALL {
           WITH p
           WITH p WHERE $status = 'approved' AND $kind = 'ROLE_APPLICATION'
           MATCH (p)-[:TIENE_ROL]->(role:Rol)
           WHERE toLower(role.name) = toLower(coalesce($roleName, 'miembro'))
           SET role._participationApprovalLock = coalesce(role._participationApprovalLock, 0) + 1
           WITH p, role
           OPTIONAL MATCH (member:Usuario)-[membership:PERTENECE_A]->(p)
           WHERE toLower(coalesce(membership.rol, membership.role, '')) = toLower(role.name)
           RETURN count(DISTINCT member) < coalesce(role.headcount, 1) AS canResolve,
                  role.name AS membershipRole
           UNION
           WITH p
           WITH p WHERE NOT ($status = 'approved' AND $kind = 'ROLE_APPLICATION')
           RETURN true AS canResolve,
                  coalesce($roleName, 'miembro') AS membershipRole
         }
         WITH notification, request, applicant, p, canResolve, membershipRole
         WHERE canResolve
         FOREACH (_ IN CASE WHEN $status = 'approved' THEN [1] ELSE [] END |
           MERGE (applicant)-[membership:PERTENECE_A]->(p)
           SET membership.rol = membershipRole,
               membership.role = membershipRole,
               membership.isLeader = false,
               membership.createdAt = coalesce(membership.createdAt, $resolvedAt)
         )
         SET request.status = $status,
             request.resolvedAt = $resolvedAt,
             request.resolvedByUserId = $resolverUserId
         CREATE (outcome:Notificacion {
           notificationId: $applicantNotificationId,
           type: $applicantNotificationType,
           message: $applicantNotificationMessage,
           read: false,
           actionable: false,
           requestId: $requestId,
           projectId: coalesce(p.projectId, p.proyectoId),
           createdAt: $resolvedAt
         })
         CREATE (applicant)-[:RECIBE]->(outcome)
         DETACH DELETE notification
         RETURN request.requestId AS requestId`,
        {
          requestId: input.requestId,
          notificationId: input.notificationId,
          leaderUserId: input.leaderUserId,
          projectId: input.projectId,
          applicantUserId: input.applicantUserId,
          kind: input.kind,
          roleName: input.roleName,
          status: input.status,
          resolvedAt: input.resolvedAt,
          resolverUserId: input.resolverUserId,
          applicantNotificationId: input.applicantNotificationId,
          applicantNotificationType: input.applicantNotificationType,
          applicantNotificationMessage: input.applicantNotificationMessage,
        }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  public async addMemberToProject(
    projectId: string,
    userId: string,
    rol: string
  ): Promise<void> {
    const session = driver.session();
    const joinedAt = new Date().toISOString();
    try {
      await session.run(
        `MATCH (project:Proyecto)
         WHERE project.projectId = $projectId OR project.proyectoId = $projectId
         MATCH (user:Usuario {userId: $userId})
         MERGE (user)-[membership:PERTENECE_A]->(project)
         SET membership.rol = $rol,
             membership.role = $rol,
             membership.isLeader = false,
             membership.createdAt = coalesce(membership.createdAt, $joinedAt)`,
        { projectId, userId, rol, joinedAt }
      );
    } finally {
      await session.close();
    }
  }

  public async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (:Usuario {userId: $userId})-[:RECIBE]->(n:Notificacion {notificationId: $notificationId})
         SET n.read = true`,
        { notificationId, userId }
      );
    } finally {
      await session.close();
    }
  }

  /** Removes the leader's actionable alert once the request is approved or rejected. */
  public async dismissLeaderNotification(notificationId: string, leaderUserId: string): Promise<void> {
    const session = driver.session();
    try {
      await session.run(
        `MATCH (:Usuario {userId: $leaderUserId})-[:RECIBE]->(n:Notificacion {notificationId: $notificationId})
         DETACH DELETE n`,
        { notificationId, leaderUserId }
      );
    } finally {
      await session.close();
    }
  }

  public async getUserParticipationStatus(
    projectId: string,
    userId: string
  ): Promise<{
    isMember: boolean;
    pendingJoin: boolean;
    pendingRoles: string[];
  }> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Proyecto)
         WHERE p.projectId = $projectId OR p.proyectoId = $projectId
         MATCH (u:Usuario {userId: $userId})
         OPTIONAL MATCH (u)-[memberRel:PERTENECE_A]->(p)
         OPTIONAL MATCH (u)-[:SOLICITO]->(joinReq:SolicitudParticipacion {kind: 'JOIN_PROJECT', status: 'pending'})-[:PARA_PROYECTO]->(p)
         OPTIONAL MATCH (u)-[:SOLICITO]->(roleReq:SolicitudParticipacion {kind: 'ROLE_APPLICATION', status: 'pending'})-[:PARA_PROYECTO]->(p)
         RETURN memberRel IS NOT NULL AS isMember,
                count(joinReq) > 0 AS pendingJoin,
                [r IN collect(DISTINCT roleReq.roleName) WHERE r IS NOT NULL] AS pendingRoles`,
        { projectId, userId }
      );
      const record = result.records[0];
      return {
        isMember: record?.get('isMember') === true,
        pendingJoin: record?.get('pendingJoin') === true,
        pendingRoles: (record?.get('pendingRoles') as string[] | null) ?? [],
      };
    } finally {
      await session.close();
    }
  }

  private async getUserDisplayName(userId: string): Promise<string> {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (u:Usuario {userId: $userId})
         RETURN coalesce(u.user, u.email, u.userId) AS name`,
        { userId }
      );
      return String(result.records[0]?.get('name') ?? userId);
    } finally {
      await session.close();
    }
  }

  private mapRequest(record: { get(key: string): unknown }): ParticipationRequest {
    return {
      requestId: String(record.get('requestId')),
      kind: String(record.get('kind')) as ParticipationRequestKind,
      status: String(record.get('status')) as ParticipationRequestStatus,
      projectId: String(record.get('projectId')),
      applicantUserId: String(record.get('applicantUserId')),
      applicantDisplayName: String(record.get('applicantDisplayName')),
      roleName: record.get('roleName') != null ? String(record.get('roleName')) : null,
      message: record.get('message') != null ? String(record.get('message')) : null,
      createdAt: String(record.get('createdAt')),
    };
  }
}
