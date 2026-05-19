# Pruebas visuales con Docker

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Backend health | http://localhost:3000/ |
| AI service health | http://localhost:3001/health |
| Neo4j Browser | http://localhost:7474 |

## Credenciales

### Neo4j Browser / Bolt

- Usuario: `neo4j`
- Contraseña: valor de `NEO4J_PASSWORD` en `.env` (por defecto en plantilla local: `teammatch_dev_2026`)
- Bolt (host): `bolt://localhost:7687`

### Aplicación (login UI)

Los scripts `neo4j/init/*.cypher` crean nodos `Usuario` de demo **sin contraseña** (el hash vive solo tras registro en la API). Para probar la UI:

1. Asegura `VITE_USE_API_AUTH=true` y `VITE_API_URL=http://localhost:3000/api` en `.env`.
2. En http://localhost:5173 registra un usuario, por ejemplo:
   - Email: `qa@teammatch.local`
   - Contraseña: `Password1!`
3. Inicia sesión con esas mismas credenciales.

Datos de grafo de referencia (sin login):

- `daniel.dev@example.com` — `03_test_data.cypher`
- `daniel.cera@teammatch.com`, `andrea.ossa@teammatch.com` — referenciados en `06_user_project_relations.cypher` / `07_tasks.cypher` (requieren nodos creados por registro o seeds adicionales)

## Comandos

```bash
# Desde la raíz del repo
docker compose up -d --build
docker compose ps

# Tests Neo4j (host)
cd backend
set NEO4J_PASSWORD=teammatch_dev_2026
npm run test:neo4j

# Detener
docker compose down
```
