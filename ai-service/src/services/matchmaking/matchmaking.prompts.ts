import type { CandidateProfile, ProjectRequirements } from './matchmaking.types.js';

export const SYSTEM_PROMPT = `
Eres un motor experto en formación de equipos de trabajo de alto rendimiento.
Tu función es analizar perfiles de candidatos y requerimientos de proyectos
para proponer los mejores equipos posibles.

Debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional,
sin markdown, sin explicaciones fuera del JSON.

El JSON debe tener exactamente esta estructura:
{
  "proposals": [
    {
      "proposalId": "string único",
      "teamScore": número entre 0 y 100,
      "members": [
        {
          "userId": "string",
          "name": "string",
          "proposedRole": "string",
          "affinityScore": número entre 0 y 100,
          "scoreBreakdown": {
            "skillMatch": número 0-100,
            "availability": número 0-100,
            "experience": número 0-100,
            "collaborationHistory": número 0-100
          },
          "justification": "explicación breve en español"
        }
      ],
      "complementarityAnalysis": "análisis de complementariedad del equipo",
      "risks": ["riesgo1", "riesgo2"],
      "strengths": ["fortaleza1", "fortaleza2"]
    }
  ]
}

Reglas de negocio:
1. Prioriza candidatos con habilidades complementarias, no duplicadas.
2. Considera la disponibilidad horaria: equipos con franjas incompatibles tienen penalización.
3. Pondera el historial de feedback: colaboración y comunicación pesan más que habilidades técnicas.
4. Genera entre 2 y 3 propuestas de equipos alternativos.
5. Cada propuesta debe cubrir todos los roles requeridos del proyecto.
6. El teamScore es el promedio ponderado de los affinityScore de sus miembros.
`;

/**
 * Construye el User Prompt integrando datos del grafo Neo4j + instrucciones del usuario.
 *
 * Concatena limpiamente:
 * 1. Datos estructurados del proyecto (desde Neo4j)
 * 2. Perfiles estructurados de candidatos (desde Neo4j)
 * 3. Instrucciones complementarias del usuario (texto libre desde UI)
 *
 * @param project - Requerimientos del proyecto desde grafo Neo4j
 * @param candidates - Perfiles de candidatos desde grafo Neo4j
 * @param userInstructions - Instrucciones complementarias del usuario (ej: "priorizar senior")
 */
export function buildUserPrompt(
  project: ProjectRequirements,
  candidates: CandidateProfile[],
  userInstructions?: string,
): string {
  // Sección 1: Datos estructurados del proyecto (grafo Neo4j)
  let prompt = `
## 📊 Proyecto a cubrir (datos estructurados del grafo Neo4j)

${JSON.stringify(project, null, 2)}

## 👥 Candidatos disponibles (${candidates.length} perfiles del grafo Neo4j)

${JSON.stringify(candidates, null, 2)}`;

  // Sección 2: Instrucciones complementarias del usuario (si existen)
  if (userInstructions?.trim()) {
    prompt += `

## 📝 Instrucciones complementarias del usuario

${userInstructions}`;
  }

  // Sección 3: Instrucción de ejecución
  prompt += `

## 🎯 Tarea

Genera las propuestas de equipo óptimas para este proyecto, considerando tanto los datos estructurados
del grafo como las instrucciones complementarias del usuario.
Responde ÚNICAMENTE con JSON válido.
`;

  return prompt;
}

