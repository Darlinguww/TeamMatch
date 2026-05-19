# 🚀 Quick Start: Integración Matchmaking + IA

## Resumen de Cambios

La integración permite que **gpt-4.1-mini (Azure OpenAI)** reciba:
1. ✅ **Datos estructurados del grafo Neo4j** (proyecto + candidatos)
2. ✅ **Instrucciones complementarias del usuario** (texto libre, ej: "priorizar senior")

Ambas fuentes se concatenan limpiamente en el User Prompt respetando tipos TypeScript estrictos.

---

## 📦 Cambios de Archivos

### 1. `matchmaking.types.ts` ✅
**Nuevo**: DTO `MatchmakingRequest` que agrupa:
```typescript
interface MatchmakingRequest {
  project: ProjectRequirements;
  candidates: CandidateProfile[];
  userInstructions?: string;  // ← Nuevo: instrucciones del usuario
}
```

### 2. `matchmaking.controller.ts` ✅
**Actualizado**: Endpoint ahora acepta `userInstructions` en el body
```typescript
POST /api/matchmaking
{
  "project": { /* datos Neo4j */ },
  "candidates": [ /* perfiles Neo4j */ ],
  "userInstructions": "Priorizar perfiles senior"  // ← Nuevo campo
}
```

### 3. `matchmaking.service.ts` ✅
**Actualizado**: Firma de función usa `MatchmakingRequest` DTO
```typescript
// Antes
export async function runMatchmaking(
  project: ProjectRequirements,
  candidates: CandidateProfile[]
): Promise<MatchmakingResult>

// Ahora
export async function runMatchmaking(
  request: MatchmakingRequest
): Promise<MatchmakingResult>
```

### 4. `matchmaking.prompts.ts` ✅
**Mejorado**: Prompts ahora integran instrucciones del usuario
```typescript
export function buildUserPrompt(
  project: ProjectRequirements,
  candidates: CandidateProfile[],
  userInstructions?: string  // ← Nuevo parámetro
): string

// Construye automáticamente:
// 📊 Sección 1: Proyecto (JSON)
// 👥 Sección 2: Candidatos (JSON)
// 📝 Sección 3: Instrucciones del usuario (texto)
// 🎯 Sección 4: Tarea de ejecución
```

### 5. `matchmaking.service.test.ts` ✅
**Actualizado**: Tests usan nuevo DTO `MatchmakingRequest`
- Test 1: Respuesta exitosa con instrucciones
- Test 2: Fallback automático (propuestas vacías si falla)

---

## ✅ Status: Todo Validado

```bash
✅ Tests: 10/10 passing
✅ Tipado TypeScript: Estricto en todo el flujo
✅ Validación de datos: Controlador + servicio
✅ Prompts: Concatenan datos + instrucciones correctamente
✅ Fallback: Automático si Azure OpenAI falla
```

---

## 🔌 Cómo Usar Desde el Backend

### Ejemplo: Consultar Neo4j y llamar al matchmaking

```typescript
import { generateTeamProposals } from 'ai-service/controllers/matchmaking.controller';

// En tu ruta backend (backend/src/routes/...)
app.post('/api/projects/:projectId/matchmaking', async (req, res) => {
  // 1. Consultar Neo4j para obtener proyecto
  const project = await neo4j.query(`
    MATCH (p:Project { id: $projectId })
    RETURN {
      projectId: p.id,
      projectName: p.name,
      description: p.description,
      requiredRoles: p.requiredRoles,
      teamSize: p.teamSize
    }
  `, { projectId });

  // 2. Consultar Neo4j para obtener candidatos
  const candidates = await neo4j.query(`
    MATCH (c:User)-[*]-(p:Project { id: $projectId })
    WHERE c:Candidate
    RETURN collect({
      userId: c.id,
      name: c.name,
      skills: c.skills,
      experience: c.experience,
      availability: c.availability,
      feedbackHistory: c.feedbackHistory
    })
  `, { projectId });

  // 3. Capturar instrucciones del usuario desde UI
  const { userInstructions } = req.body;

  // 4. Llamar al ai-service
  const matchmakingResponse = await fetch('http://ai-service:3001/api/matchmaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      candidates,
      userInstructions,  // ← Instrucciones libres del usuario
    }),
  });

  const result = await matchmakingResponse.json();
  res.json(result);
});
```

---

## 🎯 Ejemplo de Request/Response

### Request
```json
{
  "project": {
    "projectId": "proj-123",
    "projectName": "Platform Refactor 2025",
    "description": "Migración a microservicios",
    "requiredRoles": [
      {
        "role": "Backend Lead",
        "requiredSkills": ["Node.js", "Docker"],
        "priority": "high"
      }
    ],
    "teamSize": 5
  },
  "candidates": [
    {
      "userId": "u001",
      "name": "Carlos García",
      "skills": [{ "name": "Node.js", "level": "avanzado" }],
      "experience": [{ "role": "Backend", "years": 6 }],
      "availability": { "hoursPerWeek": 40 },
      "feedbackHistory": [{ "collaboration": 9, "overallRating": 8.7 }]
    }
  ],
  "userInstructions": "Priorizar perfiles senior con experiencia en arquitectura. Disponibilidad inmediata."
}
```

### Response (Exitosa)
```json
{
  "projectId": "proj-123",
  "proposals": [
    {
      "proposalId": "prop-001",
      "teamScore": 87,
      "members": [
        {
          "userId": "u001",
          "name": "Carlos García",
          "proposedRole": "Backend Lead",
          "affinityScore": 90,
          "scoreBreakdown": {
            "skillMatch": 95,
            "availability": 100,
            "experience": 85,
            "collaborationHistory": 87
          },
          "justification": "Experiencia senior en Node.js, disponibilidad inmediata, excelente historial colaborativo."
        }
      ],
      "complementarityAnalysis": "Equipo balanceado con cobertura completa de roles.",
      "risks": [],
      "strengths": ["Alta experiencia", "Disponibilidad inmediata"]
    }
  ],
  "generatedAt": "2025-05-18T16:11:27.000Z"
}
```

### Response (Fallback - Si Azure falla)
```json
{
  "projectId": "proj-123",
  "proposals": [],
  "generatedAt": "2025-05-18T16:11:27.000Z"
}
```

---

## 🔍 Validaciones Automáticas

| Validación | Ubicación | Acción |
|-----------|-----------|--------|
| `project` no vacío | Controlador | 400 Bad Request |
| `candidates` ≥ 1 | Controlador | 400 Bad Request |
| `candidates` ≤ 100 | Controlador | 400 Bad Request |
| `userInstructions` ≤ 1000 chars | Controlador | 400 Bad Request |
| `proposals` es array | Servicio | Fallback automático |
| Azure timeout (20s) | Executor | Fallback automático |

---

## 🧪 Ejecutar Tests Localmente

```bash
# Navegar a ai-service
cd ai-service

# Instalar dependencias
npm install

# Ejecutar todos los tests
npm run test

# Resultado esperado
# ✓ src/services/llm/document-size.validator.test.ts (3 tests)
# ✓ src/services/llm/azure-openai.executor.test.ts (4 tests)
# ✓ src/services/matchmaking/matchmaking.service.test.ts (2 tests)
# ✓ src/services/skill-extraction/skill-extraction.azure.service.test.ts (1 test)
# 
# Test Files  4 passed (4)
#      Tests  10 passed (10)
```

---

## 📚 Documentación Completa

Ver: `INTEGRATION_GUIDE.md` en esta carpeta.

---

## 🎓 Conceptos Clave Según `.cursorrules`

### Arquitectura Dual (IA Descentralizada)

```
GEMINI (Extracción de documentos)
└─→ JSON estructurado
    └─→ Neo4j
        └─→ gpt-4.1-mini (Matchmaking + IA empresarial)
            └─→ Propuestas de equipos con scores
```

**Regla de Oro**: La salida de Gemini alimenta Neo4j. Neo4j alimenta a gpt-4.1-mini.

### En Esta Integración

- **Neo4j → gpt-4.1-mini**: Datos estructurados (proyecto + candidatos)
- **UI → gpt-4.1-mini**: Instrucciones libres (texto del usuario)
- **gpt-4.1-mini → propuestas**: Equipos tipados con análisis de afinidad

---

## 🚦 Próximos Pasos (Recomendados)

1. **Frontend**: Agregar campo textarea para capturar `userInstructions`
2. **Backend**: Implementar queries Neo4j para `project` y `candidates`
3. **Monitoreo**: Registrar instrucciones del usuario para análisis
4. **Iteración**: Usar feedback para mejorar system prompt

---

**Versión**: 1.0.0 | **Actualizado**: Mayo 18, 2025
