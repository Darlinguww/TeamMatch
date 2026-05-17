import { Router, Request, Response } from 'express';
import { driver } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Obtener tarea específica por ID
router.get('/:taskId', requireAuth, async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const session = driver.session();

    // Verificar si el usuario actual hace parte del proyecto al que pertenece la tarea
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }else {
        const hasAccess = await isUserInProjectByTask(userId, taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    try {
        const result = await session.run(
            `MATCH (t:Tarea {taskId: $taskId}) RETURN t`,
            { taskId }
        );
        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        return res.json(result.records[0].get('t'));
    } catch (error: any) {
        console.error('GET /:taskId', error);
        return res.status(500).json({ error: 'Error al obtener la tarea' });
    } finally {
        await session.close();
    }
});

// Actualizar una tarea existente
router.put('/:taskId', requireAuth, async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { title, description, status, userAsigned } = req.body ?? {};
    const session = driver.session();

    // Verificar si el usuario actual hace parte del proyecto al que pertenece la tarea
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }else {
        const hasAccess = await isUserInProjectByTask(userId, taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    try {
        const possibleStatus = ['pendiente', 'en progreso', 'en revision','completada'];

        if (status && !possibleStatus.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }

        const result = await session.run(
            `MATCH (t:Tarea {taskId: $taskId})
             SET t.title = $title, t.description = $description, t.status = $status, t.userAsigned = $userAsigned
             RETURN t`,
            { taskId, title, description, status, userAsigned }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }

        return res.json(result.records[0].get('t'));
    } catch (error: any) {
        console.error('PUT /:taskId', error);
        return res.status(500).json({ error: 'Error al actualizar la tarea' });
    } finally {
        await session.close();
    }
});


// Eliminar una tarea
router.delete('/:taskId', requireAuth, async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const session = driver.session();

    // Verificar si el usuario actual hace parte del proyecto al que pertenece la tarea
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }else {
        const hasAccess = await isUserInProjectByTask(userId, taskId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    try {
        const result = await session.run(
            `MATCH (t:Tarea {taskId: $taskId}) DELETE t RETURN t`,
            { taskId }
        );
        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        return res.json({ message: 'Tarea eliminada correctamente' });
    } catch (error: any) {
        console.error('DELETE /:taskId', error);
        return res.status(500).json({ error: 'Error al eliminar la tarea' });
    } finally {
        await session.close();
    }
});



// Funcion para verificar si el usuario actual hace parte del proyecto al que pertenece la tarea
export async function isUserInProjectByTask(userId: string, taskId: string): Promise<boolean> {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (u:Usuario {userId: $userId})
                  -[:PERTENECE_A]->
                  (p:Proyecto)
                  -[:CONTIENE]->
                  (t:Tarea {taskId: $taskId})
            RETURN t
            `,{userId,taskId}
        );
        return result.records.length > 0;
    } catch (error) {
        console.error('Error verificando acceso del usuario a la tarea',error);
        return false;
    } finally {
        await session.close();
    }
}


// Funcion para verificar si el usuario actual hace parte del proyecto
export async function isUserInProject(userId: string, projectId: string): Promise<boolean> {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (u:Usuario {userId: $userId})
             -[:PERTENECE_A]->(p:Proyecto {projectId: $projectId})
             RETURN p
            `,{ userId, projectId }
        );
        return result.records.length > 0;
    } catch (error) {
        console.error('Error verificando acceso del usuario al proyecto', error);
        return false;
    } finally {
        await session.close();
    }
}


export default router;
