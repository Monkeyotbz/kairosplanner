#!/usr/bin/env bash
# init.sh — Verificación del entorno KAIROS antes de arrancar
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC}  $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; ERRORS=$((ERRORS+1)); }
info() { echo -e "${CYAN}  →${NC} $1"; }

ERRORS=0

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        KAIROS — init check           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# ── 1. Node.js ────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Runtime${NC}"
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VER"
  else
    fail "Node.js $NODE_VER — se requiere v18 o superior"
  fi
else
  fail "Node.js no encontrado — instalar desde https://nodejs.org"
fi

if command -v npm &>/dev/null; then
  ok "npm $(npm --version)"
else
  fail "npm no encontrado"
fi

# ── 2. Dependencias instaladas ────────────────────────────────
echo ""
echo -e "${BOLD}[2/5] Dependencias${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/frontend/node_modules" ]; then
  ok "frontend/node_modules presente"
else
  warn "frontend/node_modules ausente — ejecutando npm install..."
  (cd "$SCRIPT_DIR/frontend" && npm install) && ok "frontend instalado" || fail "npm install falló en frontend"
fi

if [ -d "$SCRIPT_DIR/backend/node_modules" ]; then
  ok "backend/node_modules presente"
else
  warn "backend/node_modules ausente — ejecutando npm install..."
  (cd "$SCRIPT_DIR/backend" && npm install) && ok "backend instalado" || fail "npm install falló en backend"
fi

# ── 3. Variables de entorno ───────────────────────────────────
echo ""
echo -e "${BOLD}[3/5] Variables de entorno${NC}"

FRONTEND_ENV="$SCRIPT_DIR/frontend/.env.local"
BACKEND_ENV="$SCRIPT_DIR/backend/.env"

# Frontend
if [ -f "$FRONTEND_ENV" ]; then
  ok "frontend/.env.local existe"
  check_var() {
    local var="$1" file="$2"
    if grep -q "^${var}=" "$file" 2>/dev/null && [ -n "$(grep "^${var}=" "$file" | cut -d= -f2-)" ]; then
      ok "  $var"
    else
      fail "  $var falta o está vacía en $file"
    fi
  }
  check_var "VITE_SUPABASE_URL"       "$FRONTEND_ENV"
  check_var "VITE_SUPABASE_ANON_KEY"  "$FRONTEND_ENV"
  check_var "VITE_SPOTIFY_CLIENT_ID"  "$FRONTEND_ENV"
  check_var "VITE_UNSPLASH_ACCESS_KEY" "$FRONTEND_ENV"
else
  fail "frontend/.env.local no existe"
  info "Crear con: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SPOTIFY_CLIENT_ID, VITE_UNSPLASH_ACCESS_KEY"
fi

# Backend
if [ -f "$BACKEND_ENV" ]; then
  ok "backend/.env existe"
  check_var() {
    local var="$1" file="$2"
    if grep -q "^${var}=" "$file" 2>/dev/null && [ -n "$(grep "^${var}=" "$file" | cut -d= -f2-)" ]; then
      ok "  $var"
    else
      fail "  $var falta o está vacía en $file"
    fi
  }
  check_var "SUPABASE_URL"         "$BACKEND_ENV"
  check_var "SUPABASE_SERVICE_KEY" "$BACKEND_ENV"
else
  fail "backend/.env no existe"
  info "Crear con: PORT, SUPABASE_URL, SUPABASE_SERVICE_KEY"
fi

# MercadoPago (opcional por ahora)
if grep -q "^MP_ACCESS_TOKEN=" "$BACKEND_ENV" 2>/dev/null; then
  ok "  MP_ACCESS_TOKEN (pagos habilitados)"
else
  warn "  MP_ACCESS_TOKEN no configurado — pagos deshabilitados"
fi

# ── 4. Conectividad Supabase ──────────────────────────────────
echo ""
echo -e "${BOLD}[4/5] Conectividad Supabase${NC}"

if command -v curl &>/dev/null; then
  SUPABASE_URL=""
  if [ -f "$FRONTEND_ENV" ]; then
    SUPABASE_URL=$(grep "^VITE_SUPABASE_URL=" "$FRONTEND_ENV" | cut -d= -f2-)
  fi

  if [ -n "$SUPABASE_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${SUPABASE_URL}/rest/v1/" 2>/dev/null) || true
    HTTP_CODE="${HTTP_CODE: -3}"
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
      ok "Supabase alcanzable ($SUPABASE_URL)"
    elif [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
      warn "No se pudo conectar a Supabase — verificar URL o conexión a internet"
    else
      warn "Supabase respondió HTTP $HTTP_CODE"
    fi
  else
    warn "VITE_SUPABASE_URL no disponible — omitiendo ping"
  fi
else
  warn "curl no disponible — omitiendo verificación de conectividad"
fi

# ── 5. Puertos disponibles ────────────────────────────────────
echo ""
echo -e "${BOLD}[5/5] Puertos${NC}"

check_port() {
  local port="$1" name="$2"
  if command -v lsof &>/dev/null; then
    if lsof -ti:"$port" &>/dev/null; then
      warn "Puerto $port ($name) ya en uso — puede haber conflicto"
    else
      ok "Puerto $port ($name) libre"
    fi
  elif command -v netstat &>/dev/null; then
    if netstat -an 2>/dev/null | grep -q ":${port} .*LISTEN"; then
      warn "Puerto $port ($name) ya en uso"
    else
      ok "Puerto $port ($name) libre"
    fi
  else
    info "Puerto $port ($name) — no se pudo verificar (lsof/netstat no disponible)"
  fi
}

check_port 5173 "frontend Vite"
check_port 3001 "backend Express"

# ── Resumen ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  KAIROS listo para arrancar${NC}"
  echo ""
  echo -e "  Frontend : ${CYAN}cd frontend && npm run dev${NC}"
  echo -e "  Backend  : ${CYAN}cd backend  && npm run dev${NC}"
else
  echo -e "${RED}${BOLD}  $ERRORS problema(s) encontrado(s) — revisar arriba${NC}"
fi
echo -e "${BOLD}════════════════════════════════════════${NC}"
echo ""

exit $ERRORS
