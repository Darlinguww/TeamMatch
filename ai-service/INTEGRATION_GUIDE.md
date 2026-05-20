# 🔗 Guía de Integración: Matchmaking Dual (Grafo Neo4j + IA)

## Descripción General

La integración une **datos estructurados del grafo Neo4j** con **instrucciones complementarias del usuario** para alimentar al modelo `gpt-4.1-mini` (Azure OpenAI) de manera limpia y tipada.

---

## 📊 Arquitectura de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                  - Proyecto, Candidatos                    │
│              - Instrucciones del Usuario (opcional)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               BACKEND (Node.js + Express)                   │
│         Consulta Neo4j para obtener datos estructurados     │
│              POST /api/matchmaking (DTO unificado)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AI-SERVICE (TypeScript + IA)                   │
│         • matchmaking.controller.ts (entrada HTTP)          │
│         • matchmaking.service.ts (orquestación)             │
│         • matchmaking.prompts.ts (construcción de prompt)   │
│         • azure-openai.executor.ts (fallback automático)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            AZURE OPENAI (gpt-4.1-mini)                      │
│  ✓ System Prompt: Reglas de matchmaking                     │
│  ✓ User Prompt: Datos del grafo + instrucciones del usuario │
│  → Respuesta: JSON con propuestas de equipos + scores       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 DTO: `MatchmakingRequest`

```typescript
interface MatchmakingRequest {
  /** Datos estructurados del proyecto desde Neo4j */
  project: ProjectRequirements;
  
  /** Perfiles de candidatos desde Neo4j */
  candidates: CandidateProfile[];
  
  /** Instrucciones complementarias del usuario (opcional, ≤ 1000 caracteres) */
  userInstructions?: string;
}
```

### Ejemplo de payload HTTP:

```json
{
  "project": {
    "projectId": "proj-123",
    "projectName": "Platform Refactor 2025",
    "description": "Migración de monolito a microservicios",
    "requiredRoles": [
      {
        "role": "Backend Lead",
        "requiredSkills": ["Node.js", "PostgreSQL", "Docker"],
        "priority": "high"
      },
      {
        "role": "DevOps Engineer",
        "requiredSkills": ["Kubernetes", "AWS", "CI/CD"],
        "priority": "high"
      }
    ],
    "teamSize": 5
  },
  "candidates": [
    {
      "userId": "u001",
      "name": "Carlos García",
      "skills": [
        { "name": "Node.js", "level": "avanzado", "category": "backend" },
        { "name": "Docker", "level": "intermedio", "category": "devops" }
      ],
      "experience": [
        { "role": "Backend Engineer", "years": 6, "skills": ["Node.js", "Express"] }
      ],
      "availability": { "hoursPerWeek": 40, "schedule": "L-V 09:00-18:00" },
      "feedbackHistory": [
        {
          "collaboration": 9,
          "communication": 8,
          "technicalSkills": 9,
          "overallRating": 8.7
        }
      ]
    }
  ],
  "userInstructions": "Priorizar perfiles senior con experiencia en arquitectura de microservicios. Preferir disponibilidad inmediata (este mes)."
}
```

---

## 🛠️ Implementación Técnica

### 1. **Controlador** (`matchmaking.controller.ts`)

```typescript
/**
 * Endpoint: POST /api/matchmaking
 *
 * Integra datos del grafo Neo4j (proyecto + candidatos) con instrucciones
 * complementarias del usuario para generar propuestas de equipos óptimas.
 * La IA recibe ambas fuentes de información de forma estructurada.
 */
export async function generateTeamProposals(req: Request, res: Response): Promise<void> {
  try {
    const { project, candidates, userInstructions } = req.body as MatchmakingRequest;

    // Validaciones...
    // - Datos obligatorios del grafo
    // - Límite de 100 candidatos
    // - Instrucciones del usuario ≤ 1000 caracteres

    // Ejecutar matchmaking con DTO completo
    const result = await runMatchmaking({
      project,
      candidates,
      userInstructions: userInstructions?.trim() || undefined,
    });
    
    res.status(200).json(result);
  } catch (error) {
    // Manejo de errores...
  }
}
```

### 2. **Servicio** (`matchmaking.service.ts`)

```typescript
/**
 * Ejecuta matchmaking con Azure OpenAI.
 * Integra datos del grafo Neo4j (proyecto + candidatos) + instrucciones del usuario.
 *
 * @param request - DTO que contiene proyecto, candidatos e instrucciones del usuario
 */
export async function runMatchmaking(request: MatchmakingRequest): Promise<MatchmakingResult> {
  const client = getAzureOpenAIClient();
  const userPrompt = buildUserPrompt(
    request.project,
    request.candidates,
    request.userInstructions,  // ← Incluir instrucciones
  );

  return executeWithAzureOpenAIFallback({
    operation: 'matchmaking',
    fallback: () => createEmptyMatchmakingResult(request.project.projectId),
    isValid: (result) => Array.isArray(result.proposals),
    execute: async (signal) => {
      const response = await client.chat.completions.create(
        {
          model: deploymentName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },  // ← Incluye datos + instrucciones
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        },
        { signal },
      );
      // Parsear respuesta...
    },
  });
}
```

### 3. **Prompts** (`matchmaking.prompts.ts`)

```typescript
/**
 * Construye el User Prompt integrando datos del grafo Neo4j + instrucciones del usuario.
 *
 * Concatena limpiamente:
 * 1. Datos estructurados del proyecto (desde Neo4j)
 * 2. Perfiles estructurados de candidatos (desde Neo4j)
 * 3. Instrucciones complementarias del usuario (texto libre desde UI)
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

Genera las propuestas de equipo óptimas para este proyecto, considerando tanto los datos 
estructurados del grafo como las instrucciones complementarias del usuario.
Responde ÚNICAMENTE con JSON válido.
`;

  return prompt;
}
```

---

## 🎯 Flujo de Ejecución

### Paso 1: Frontend envía solicitud

```javascript
const response = await fetch('/api/matchmaking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project: { /* datos del grafo */ },
    candidates: [ /* perfiles del grafo */ ],
    userInstructions: 'Priorizar perfiles senior con experiencia en cloud',
  }),
});
```

### Paso 2: Controlador valida entrada

- ✓ `project` no vacío
- ✓ `candidates` no vacío (máx 100)
- ✓ `userInstructions` ≤ 1000 caracteres

### Paso 3: Servicio construye prompt

```
SYSTEM_PROMPT (reglas de negocio)
+
USER_PROMPT
  - Sección 1: Proyecto (JSON)
  - Sección 2: Candidatos (JSON)
  - Sección 3: Instrucciones del usuario (texto libre)
  - Sección 4: Tarea de ejecución
```

### Paso 4: Azure OpenAI genera respuesta

```json
{
  "proposals": [
    {
      "proposalId": "prop-001",
      "teamScore": 87,
      "members": [ /* 5 miembros con scores */ ],
      "complementarityAnalysis": "...",
      "risks": [ "..." ],
      "strengths": [ "..." ]
    }
  ]
}
```

### Paso 5: Fallback automático (si falla)

Si Azure OpenAI falla, timeout o respuesta inválida:

```json
{
  "projectId": "proj-123",
  "proposals": [],
  "generatedAt": "2025-05-18T16:11:27.000Z"
}
```

→ El usuario ve equipos vacíos y puede hacer entrada manual.

---

## 🧪 Testing

### Ejemplo de test con instrucciones del usuario:

```typescript
it('integra instrucciones del usuario en el prompt', async () => {
  const request: MatchmakingRequest = {
    project,
    candidates,
    userInstructions: 'Priorizar perfiles senior con experiencia en cloud',
  };

  const result = await runMatchmaking(request);

  expect(result.projectId).toBe('proj-1');
  expect(result.proposals).toHaveLength(1);
  
  // Verificar que el prompt fue construido correctamente
  const callArgs = mockCreate.mock.calls[0][0];
  expect(callArgs.messages[1].content).toContain('Priorizar perfiles senior');
});
```

### Ejecutar tests:

```bash
cd ai-service
npm run test
```

---

## ✅ Validación de Tipado Estricto

```typescript
// ✓ TypeScript válido: tipos completos en cada paso
const request: MatchmakingRequest = {
  project,         // ProjectRequirements (tipado)
  candidates,      // CandidateProfile[] (tipado)
  userInstructions: 'texto opcional',  // string | undefined
};

const result: MatchmakingResult = await runMatchmaking(request);
// result.proposals: TeamProposal[] (tipado)
```

---

## 🚀 Próximos Pasos

1. **Integración Frontend**: Agregar campo de texto libre en UI para capturar `userInstructions`
2. **Backend**: Consultar Neo4j para obtener `project` y `candidates` tipados
3. **Monitoreo**: Registrar `userInstructions` en logs para análisis de patrones de usuario
4. **Iteración**: Usar feedback de propuestas para mejorar el system prompt

---

## 📚 Referencias

- **Archivo de reglas**: `.cursorrules`
- **Ejecutor con fallback**: `src/services/llm/azure-openai.executor.ts`
- **Validador de documentos**: `src/services/llm/document-size.validator.ts`
- **Config**: `src/config/processing.config.ts` (timeouts y límites)

---

## ⚙️ Variables de Entorno

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=sk-...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-1-mini

# Límites de procesamiento
MAX_FILE_SIZE_MB=5
PROCESSING_TIMEOUT_MS=20000
```

---

**Última actualización**: Mayo 18, 2025 | **Versión**: 1.0.0
