-- ============================================================
-- KAIROS — Limpieza de sesiones fantasma de 8h exactas
-- Ejecutar en Supabase Dashboard > SQL Editor
--
-- Causa: el mecanismo anterior de recuperación de sesiones huérfanas
-- capaba la duración a "inicio + 8h" cuando no había checkpoint.
-- Resultado: múltiples sesiones de exactamente 8h0m que inflan
-- las métricas de Stats y el sistema de rango/XP.
--
-- Fix: las marca como 'cancelada' → desaparecen de Stats
-- (getMySessions filtra WHERE estado = 'completada').
-- Los datos quedan intactos; no se elimina nada.
-- ============================================================

-- ── PASO 1: Vista previa ─────────────────────────────────────
-- Corre esto primero para ver cuántas sesiones se van a corregir
-- y confirmar que son las fantasmas (duraciones exactas de 8h).

SELECT
  id,
  inicio,
  fin,
  segundos_reales,
  ROUND(EXTRACT(EPOCH FROM (fin::timestamptz - inicio::timestamptz)) / 3600, 2) AS horas_duracion
FROM sesiones_enfoque
WHERE estado = 'completada'
  AND fin IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (fin::timestamptz - inicio::timestamptz)) - 28800) < 10
    -- ±10 segundos de 8h exactas (28800s) para cubrir redondeos
ORDER BY inicio DESC;


-- ── PASO 2: Corrección ───────────────────────────────────────
-- Solo ejecutar después de revisar el resultado del PASO 1.

UPDATE sesiones_enfoque
SET estado = 'cancelada'
WHERE estado = 'completada'
  AND fin IS NOT NULL
  AND ABS(EXTRACT(EPOCH FROM (fin::timestamptz - inicio::timestamptz)) - 28800) < 10;

-- Resultado esperado: "UPDATE N" donde N = número de sesiones del PASO 1.
