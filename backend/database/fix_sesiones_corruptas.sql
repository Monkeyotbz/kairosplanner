-- fix_sesiones_corruptas.sql
-- Corrige sesiones_enfoque con segundos_reales absurdamente altos
-- (causados por recovery que asignaba fin = now() a sesiones de días atrás)
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- Ver cuántas sesiones están afectadas antes de corregir:
-- SELECT id, inicio, fin, segundos_reales
-- FROM sesiones_enfoque
-- WHERE segundos_reales > 8 * 3600   -- más de 8 horas
-- ORDER BY segundos_reales DESC;

-- Corregir: capear fin a inicio + 8 horas en sesiones irrazonablemente largas
UPDATE sesiones_enfoque
SET fin = inicio + interval '8 hours'
WHERE estado = 'completada'
  AND fin IS NOT NULL
  AND segundos_reales > 8 * 3600;  -- más de 8 horas = dato corrupto
