# Datos de prueba funcionales

La base de datos incluye usuarios, proyectos, miembros, tareas y notificaciones para probar TeamMatch sin depender de mocks visuales.

## Cuentas

Todas las cuentas semilla usan la misma contrasena:

```text
TeamMatch123!
```

Ejemplos utiles:

```text
maria.garcia@example.com
alejandra.s@example.com
martin.c@example.com
sofia.m@example.com
jorge.g@example.com
mariana.d@example.com
```

## Flujos para probar

- Inicia sesion con un lider de proyecto, por ejemplo `alejandra.s@example.com`, `martin.c@example.com`, `sofia.m@example.com` o `ricardo.l@example.com`.
- Entra a Proyectos, abre un proyecto propio y revisa la pestana de sugerencias. El motor usa Neo4j para puntuar candidatos por habilidades, disponibilidad, experiencia y reputacion.
- Acepta una propuesta de equipo. El equipo se guarda en Neo4j mediante `PUT /teams/:id/members`.
- Como lider, crea, edita, asigna o elimina tareas desde el tablero Kanban.
- Como miembro asignado, mueve una tarea de Pendiente a En progreso y luego a En revision.
- Cuando una tarea entra en revision, el lider recibe una alerta en Alertas.
- Cuando el lider aprueba o devuelve una tarea, el usuario asignado recibe una alerta indicando si paso a Completada o volvio a En progreso.
