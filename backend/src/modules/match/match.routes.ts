import { Router, Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '../../shared/errors/HttpErrors.js';
import { asyncHandler } from '../../shared/middlewares/asyncHandler.js';
import { requireAuth } from '../auth/auth.routes.js';
import { ProfileRepository } from '../profile/repositories/profile.repository.js';

const router = Router();
const profileRepository = new ProfileRepository();
const MAX_COMPARISON_LIMIT = 100;

/**
 * GET /match/:id/score
 * Devuelve el score de compatibilidad para el `userId` indicado, incluyendo
 * el desglose por criterios (matchingSkills, totalMatchingYears, availabilityMatched,
 * redundancyPenalty, score).
 *
 * Query params opcionales para filtrar cómo se calcula el score:
 * - skills: lista separada por comas de skills esperadas (ej: ?skills=react,node)
 * - minYears: número mínimo de años para considerar la experiencia
 * - availabilityDay, availabilityStart, availabilityEnd: si se usan deben venir los tres
 */
router.get('/:id/score', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || !id.trim()) {
      throw new BadRequestError('Missing match id');
    }

    // Obtenemos el perfil objetivo completo
    const target = await profileRepository.findPublicProfileByUserId(id);
    if (!target) {
      throw new NotFoundError('Target profile not found');
    }

    // Traemos todos los perfiles para comparar
    const allProfiles = await profileRepository.searchPublicProfiles({
      skills: [],
      minYears: null,
      availability: null,
      limit: MAX_COMPARISON_LIMIT,
      offset: 0
    } as Parameters<typeof profileRepository.searchPublicProfiles>[0]);

    // Mapas auxiliares para búsqueda rápida de experiencia por skill
    const buildExperienceMap = (p: { experience: { skillName: string; yearsOfExperience: number }[] }) => {
      const map = new Map<string, number>();
      for (const e of p.experience || []) {
        map.set((e.skillName || '').trim().toLowerCase(), Number(e.yearsOfExperience || 0));
      }
      return map;
    };

    const targetSkills = new Set((target.skills || []).map((s) => s.trim().toLowerCase()));

    // Helper: comprueba si hay solapamiento de disponibilidad entre dos perfiles
    function availabilityOverlap(a: any[], b: any[]): boolean {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      for (const dayA of a) {
        for (const dayB of b) {
          if (dayA.day !== dayB.day) continue;
          for (const slotA of dayA.timeSlots || []) {
            for (const slotB of dayB.timeSlots || []) {
              if (slotA.start <= slotB.end && slotB.start <= slotA.end) return true;
            }
          }
        }
      }
      return false;
    }

    // Calculamos para cada perfil candidato un desglose de criterios
    const comparisons = allProfiles
      .filter((p) => p.userId !== target.userId)
      .map((candidate) => {
        const candSkills = new Set((candidate.skills || []).map((s) => s.trim().toLowerCase()));

        // Intersección y unión de skills normalizadas
        const intersection = [...candSkills].filter((s) => targetSkills.has(s));
        const union = new Set([...candSkills, ...targetSkills]);

        const exactMatches = intersection.length;
        const complementarySkills = [...candSkills].filter((s) => !targetSkills.has(s)).length;

        // Complementarity: proporción de habilidades del candidato que complementan al target
        const complementarityScore = union.size === 0 ? 0 : (complementarySkills / union.size) * 100;

        // Disponibilidad: si hay algún solapamiento entre sus slots
        const availabilityMatched = availabilityOverlap(target.availability || [], candidate.availability || []);
        const availabilityScore = availabilityMatched ? 100 : 0;

        // Experiencia: sumar años en habilidades coincidentes (intersection)
        const candExpMap = buildExperienceMap(candidate as any);
        let totalMatchingYears = 0;
        for (const s of intersection) {
          totalMatchingYears += Math.max(0, candExpMap.get(s) ?? 0);
        }
        // Escalamos experiencia a 0-100 (cada año = 10 puntos, tope 100)
        const experienceScore = Math.min((totalMatchingYears * 10), 100);

        // Afinidad: Jaccard sobre habilidades (similitud entre sets)
        const affinityScore = union.size === 0 ? 0 : (exactMatches / union.size) * 100;

        // Pesos para el score final (ajustables)
        const weights = {
          complementarity: 0.25,
          availability: 0.25,
          experience: 0.25,
          affinity: 0.25
        };

        const overallScore =
          complementarityScore * weights.complementarity +
          availabilityScore * weights.availability +
          experienceScore * weights.experience +
          affinityScore * weights.affinity;

        return {
          userId: candidate.userId,
          user: candidate.user,
          breakdown: {
            exactMatches,
            complementarySkills,
            complementarityScore: Math.round(complementarityScore * 100) / 100,
            availabilityMatched,
            availabilityScore,
            totalMatchingYears,
            experienceScore,
            affinityScore: Math.round(affinityScore * 100) / 100
          },
          score: Math.round(overallScore * 100) / 100
        };
      })
      // Orden descendente por score
      .sort((a, b) => b.score - a.score);

    res.json({ target: { userId: target.userId, user: target.user }, comparisons });
  })
);

export default router;
