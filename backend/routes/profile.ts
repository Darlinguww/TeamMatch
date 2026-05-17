import { Router, Request, Response } from 'express';
import { driver } from '../utils/db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Guardar habilidades del usuario ya validadas
router.put('/skills', requireAuth, async (req: Request, res: Response) => {
		const skillsRaw = req.body;

		if (!Array.isArray(skillsRaw) || skillsRaw.length === 0) {
			return res.status(400).json({ error: 'Se requiere un arreglo no vacío de strings' });
		}

        // Limpiar y validar cada skill, eliminando duplicados
		const skills = Array.from(new Set(
			skillsRaw
				.filter((s: any) => typeof s === 'string')
				.map((s: string) => s.trim())
				.filter((s: string) => s.length > 0)
		));

		if (skills.length === 0) {
			return res.status(400).json({ error: 'Se requiere un arreglo no vacío de strings' });
		}


		const user = (req as any).user;
		if (!user || !user.userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const session = driver.session();
		try {
			// Crear habilidades y relaciones (evita duplicados gracias a MERGE)
			await session.run(
				`UNWIND $skills AS skillName
				 MERGE (s:Habilidad {name: skillName})
				 WITH s
				 MATCH (u:Usuario {userId: $userId})
				 MERGE (u)-[:TIENE_HABILIDAD]->(s)`,
				{ skills, userId: user.userId }
			);

			// Eliminar relaciones antiguas no incluidas en el nuevo set (guardar definitivamente)
			await session.run(
				`MATCH (u:Usuario {userId: $userId})-[r:TIENE_HABILIDAD]->(s:Habilidad)
				 WHERE NOT s.name IN $skills
				 DELETE r`,
				{ skills, userId: user.userId }
			);

			return res.status(200).json({ message: 'Habilidades guardadas', skills });
		} catch (error) {
			console.error('Error escribiendo habilidades en Neo4j:', error);
			return res.status(500).json({ error: 'Error al guardar habilidades' });
		} finally {
			await session.close();
		}
});


export default router;
