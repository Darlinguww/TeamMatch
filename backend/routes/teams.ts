import { Router, Request, Response } from 'express';
import { driver } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.put('/:id/members', requireAuth, async (req: Request, res: Response) => {
  const { id: projectId } = req.params;
  const { add, remove } = req.body ?? {};
  const userId = req.user?.userId;

  // Validaciones de entrada
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  // Miembros a agregar
  const addMembers = Array.isArray(add)
    ? add
        .filter((item) => item && typeof item === 'object')
        .map((item: any) => ({ userId: String(item.userId).trim(), rol: typeof item.rol === 'string' ? item.rol.trim() : 'miembro' }))
        .filter((item) => item.userId)
    : [];

  // Miembros a remover
  const removeMembers = Array.isArray(remove)
    ? remove
        .map((item: any) => String(item).trim())
        .filter((item) => item)
    : [];

  if (addMembers.length === 0 && removeMembers.length === 0) {
    return res.status(400).json({ error: 'Debe enviar al menos un miembro para agregar o remover' });
  }

  const memberIdsToValidate = Array.from(
    new Set([
      ...addMembers.map((member) => member.userId),
      ...removeMembers
    ])
  );

  const session = driver.session();

  try {
    const leaderResult = await session.run(
      `MATCH (leader:Usuario {userId: $userId})-[rel:PERTENECE_A {rol: 'lider'}]->(p:Proyecto {projectId: $projectId})
       RETURN p.projectId AS projectId`,
      { userId, projectId }
    );

    if (leaderResult.records.length === 0) {
      return res.status(403).json({ error: 'Forbidden' }); // El usuario no es líder del proyecto
    }

    // Validar que los usuarios a agregar o remover existan
    if (memberIdsToValidate.length > 0) {
      const validateResult = await session.run(
        `UNWIND $memberIds AS memberId
         MATCH (u:Usuario {userId: memberId})
         RETURN collect(u.userId) AS existingIds`,
        { memberIds: memberIdsToValidate }
      );

      const existingIds = new Set(validateResult.records[0].get('existingIds') as string[]);
      const missing = memberIdsToValidate.filter((id) => !existingIds.has(id));
      if (missing.length > 0) {
        return res.status(400).json({ error: `Usuarios no encontrados: ${missing.join(', ')}` });
      }
    }

    const addedIds: string[] = [];
    const removedIds: string[] = [];

    // Agregar miembros
    if (addMembers.length > 0) {
      const addResult = await session.run(
        `UNWIND $members AS member
         MATCH (u:Usuario {userId: member.userId}), (p:Proyecto {projectId: $projectId})
         MERGE (u)-[rel:PERTENECE_A]->(p)
         SET rel.rol = coalesce(member.rol, 'miembro')
         RETURN collect(DISTINCT u.userId) AS addedIds`,
        { projectId, members: addMembers }
      );
      const resultAdded = addResult.records[0].get('addedIds');
      if (Array.isArray(resultAdded)) {
        addedIds.push(...resultAdded.map(String));
      }
    }

    // Remover miembros
    if (removeMembers.length > 0) {
      const roleCheck = await session.run(
        `UNWIND $userIds AS userId
         MATCH (u:Usuario {userId: userId})-[rel:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
         RETURN collect({ userId: u.userId, rol: rel.rol }) AS relations`,
        { projectId, userIds: removeMembers }
      );

      const relations = roleCheck.records[0].get('relations') as Array<{ userId: string; rol: string }>;
      const relationIds = relations.map((relation) => relation.userId);
      const notMembers = removeMembers.filter((id) => !relationIds.includes(id));

      if (notMembers.length > 0) {
        return res.status(400).json({ error: `Usuarios no pertenecen al proyecto: ${notMembers.join(', ')}` });
      }

      const leaderRemovals = relations.filter((relation) => relation.rol === 'lider').map((relation) => relation.userId);
      if (leaderRemovals.length > 0) {
        return res.status(400).json({ error: `No se puede remover al líder del proyecto: ${leaderRemovals.join(', ')}` });
      }

      const removeResult = await session.run(
        `UNWIND $userIds AS userId
         MATCH (u:Usuario {userId: userId})-[rel:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
         DELETE rel
         RETURN collect(DISTINCT u.userId) AS removedIds`,
        { projectId, userIds: removeMembers }
      );

      const resultRemoved = removeResult.records[0].get('removedIds');
      if (Array.isArray(resultRemoved)) {
        removedIds.push(...resultRemoved.map(String));
      }
    }

    return res.status(200).json({ projectId, added: addedIds, removed: removedIds });
  } catch (error: any) {
    console.error('PUT /teams/:id/members', error);
    return res.status(500).json({ error: 'Error al actualizar los integrantes del equipo' });
  } finally {
    await session.close();
  }
});

export default router;
