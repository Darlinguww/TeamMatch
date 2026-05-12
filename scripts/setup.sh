#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# TeamMatch — Script de Setup Inicial
# Ejecutar UNA SOLA VEZ al clonar el repositorio por primera vez
# Uso: bash scripts/setup.sh
# ══════════════════════════════════════════════════════════════════
 
set -e  # Detener si cualquier comando falla
 
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     TeamMatch — Setup Inicial        ║"
echo "╚══════════════════════════════════════╝"
echo ""
 
# ─────────────────────────────────────────────
# 1. Verificar prerequisitos
# ─────────────────────────────────────────────
echo "▶ Verificando prerequisitos..."
 
if ! command -v docker &> /dev/null; then
  echo "❌ Docker no está instalado. Instálalo desde https://docs.docker.com/get-docker/"
  exit 1
fi
 
if ! command -v docker compose &> /dev/null; then
  echo "❌ Docker Compose no está instalado."
  exit 1
fi
 
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no está instalado. Instala la versión 20 LTS."
  exit 1
fi
 
echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker compose version)"
echo "✅ Node.js: $(node --version)"
echo ""
 
# ─────────────────────────────────────────────
# 2. Crear archivo .env desde .env.example
# ─────────────────────────────────────────────
if [ -f ".env" ]; then
  echo "⚠️  Ya existe un archivo .env — no se sobreescribe."
else
  cp .env.example .env
  echo "✅ Archivo .env creado desde .env.example"
  echo ""
  echo "  ⚠️  IMPORTANTE: Abre el archivo .env y completa:"
  echo "     - JWT_SECRET        (genera con: openssl rand -hex 64)"
  echo "     - NEO4J_PASSWORD    (elige una contraseña segura)"
  echo "     - GEMINI_API_KEY    (obtén en: https://aistudio.google.com)"
  echo ""
  read -p "  Presiona Enter cuando hayas configurado el .env..."
fi
 
# ─────────────────────────────────────────────
# 3. Levantar los contenedores
# ─────────────────────────────────────────────
echo ""
echo "▶ Levantando contenedores Docker..."
docker compose up -d --build
 
# ─────────────────────────────────────────────
# 4. Esperar a que Neo4j esté listo
# ─────────────────────────────────────────────
echo ""
echo "▶ Esperando a que Neo4j esté disponible..."
MAX_RETRIES=20
COUNT=0
until docker compose exec neo4j cypher-shell -u neo4j -p "$(grep NEO4J_PASSWORD .env | cut -d= -f2)" "RETURN 1" &> /dev/null; do
  COUNT=$((COUNT+1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Neo4j no respondió a tiempo. Revisa los logs: docker compose logs neo4j"
    exit 1
  fi
  echo "   ... intento $COUNT/$MAX_RETRIES"
  sleep 5
done
echo "✅ Neo4j está listo."
 
# ─────────────────────────────────────────────
# 5. Resumen final
# ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅ TeamMatch levantado correctamente                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Frontend:    http://localhost:5173                   ║"
echo "║  Backend API: http://localhost:3000/api               ║"
echo "║  Neo4j UI:    http://localhost:7474                   ║"
echo "║  AI Service:  http://localhost:8000                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Comandos útiles:"
echo "  docker compose logs -f backend     → ver logs del backend"
echo "  docker compose logs -f neo4j       → ver logs de Neo4j"
echo "  docker compose down                → detener todo"
echo "  docker compose down -v             → detener y borrar volúmenes"
echo ""
